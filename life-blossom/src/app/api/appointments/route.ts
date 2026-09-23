import { NextRequest } from "next/server";
import { withAuth, ok, paginated, err, parseBody, getPagination, ValidationError, resolvePatientId, resolveOrgId } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";
import { notifyUsers, sendInternalMessage } from "@/lib/notify";
import { logAudit } from "@/lib/audit";

// Auto-mark past appointments as no_show (both scheduled and confirmed) if past the grace period
async function markPastNoShows(svc: any) {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24h grace period

  // Find appointments that need to be marked as no_show
  const { data: pastAppts } = await svc
    .from("appointments")
    .select("id, org_id, patient_id, doctor_id, scheduled_at, status")
    .in("status", ["scheduled", "confirmed"])
    .lt("scheduled_at", cutoff);

  if (!pastAppts || pastAppts.length === 0) return;

  // Bulk update
  const ids = pastAppts.map((a: any) => a.id);
  await svc
    .from("appointments")
    .update({ status: "no_show" })
    .in("id", ids);

  // Send notifications for each affected appointment
  for (const apt of pastAppts) {
    try {
      const dateStr = new Date(apt.scheduled_at).toLocaleDateString("en-GB", {
        day: "numeric", month: "short", year: "numeric",
      });
      const timeStr = apt.scheduled_at.slice(11, 16);

      const recipientUserIds = new Set<string>();

      // Patient
      const { data: pat } = await svc
        .from("patients").select("user_id, primary_account_id").eq("id", apt.patient_id).maybeSingle();
      if (pat?.user_id) recipientUserIds.add(pat.user_id);
      if (pat?.primary_account_id) {
        const { data: mainP } = await svc
          .from("patients").select("user_id").eq("id", pat.primary_account_id).maybeSingle();
        if (mainP?.user_id) recipientUserIds.add(mainP.user_id);
      }

      // Doctor/staff
      if (apt.doctor_id) {
        const { data: doc } = await svc
          .from("staff").select("user_id").eq("id", apt.doctor_id).maybeSingle();
        if (doc?.user_id) recipientUserIds.add(doc.user_id);
      }

      const uniqueIds = [...recipientUserIds];
      if (!uniqueIds.length) continue;

      await notifyUsers(svc, {
        orgId: apt.org_id,
        userIds: uniqueIds,
        type: "general",
        title: "Appointment Unattended",
        message: `Your appointment on ${dateStr} at ${timeStr} was not attended and has been marked as unattended.`,
        url: "/patient/appointments",
      });

      await sendInternalMessage(svc, {
        orgId: apt.org_id,
        senderId: uniqueIds[0],
        recipientUserIds: uniqueIds,
        subject: `Appointment Unattended — ${dateStr}`,
        body: `Your appointment scheduled for ${dateStr} at ${timeStr} was not attended within the grace period and has been marked as unattended.\n\nStatus: Unattended`,
      });
    } catch (e) {
      console.error(`[markPastNoShows] notification error for apt ${apt.id}:`, e);
    }
  }
}

// GET /api/appointments — list (auto-scopes to patient for patient-role users)
export const GET = withAuth(async (req, supabase, authUserId) => {
  const sp = new URL(req.url).searchParams;
  const patientId = sp.get("patient_id") || await resolvePatientId(supabase, authUserId);
  const doctorId = sp.get("doctor_id");
  const status = sp.get("status");
  const date = sp.get("date");
  const { page, pageSize, from, to } = getPagination(sp);

  const svc = createServiceClient();
  await markPastNoShows(svc);

  // When caller is a patient, also include dependants' appointments
  let patientIds: string[] | null = null;
  const callerPatientId = sp.get("patient_id") || await resolvePatientId(supabase, authUserId);
  if (callerPatientId && !sp.get("patient_id")) {
    const { data: dependants } = await svc
      .from("patients").select("id").eq("primary_account_id", callerPatientId);
    patientIds = [callerPatientId, ...(dependants || []).map((d: any) => d.id)];
  }

  let query = svc
    .from("appointments")
    .select("*, patient:patients(*, user:users(id, first_name, last_name, phone)), doctor:staff!doctor_id(*, user:users(id, first_name, last_name))",
      { count: "exact" });

  if (patientIds) query = query.in("patient_id", patientIds);
  else if (callerPatientId) query = query.eq("patient_id", callerPatientId);
  if (doctorId) query = query.eq("doctor_id", doctorId);
  if (status) query = query.eq("status", status);
  if (date) query = query.gte("scheduled_at", date).lt("scheduled_at", `${date}T23:59:59`);

  const { data, error, count } = await query.order("scheduled_at", { ascending: false }).range(from, to);
  if (error) return err(error.message, 500);

  // Derive appointment_date and start_time from scheduled_at for frontend compat
  const enriched = (data || []).map((apt: any) => ({
    ...apt,
    appointment_date: apt.scheduled_at ? apt.scheduled_at.slice(0, 10) : null,
    start_time: apt.scheduled_at ? apt.scheduled_at.slice(11, 16) : null,
  }));

  return paginated(enriched, count || 0, page, pageSize);
});

// POST /api/appointments — create
export const POST = withAuth(async (req, supabase, authUserId) => {
  const body = await parseBody<{
    patient_id: string; doctor_id?: string; appointment_date: string;
    start_time: string; end_time?: string; reason?: string;
  }>(req);

  if (!body.patient_id || !body.appointment_date || !body.start_time) {
    throw new ValidationError("Missing required fields: patient_id, appointment_date, start_time");
  }

  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("User profile not found", 404);

  const svc = createServiceClient();

  // Combine date + time into a single scheduled_at timestamp
  const scheduledAt = `${body.appointment_date}T${body.start_time}:00`;

  const { data, error } = await svc
    .from("appointments")
    .insert({
      org_id: orgId,
      patient_id: body.patient_id,
      doctor_id: body.doctor_id || null,
      scheduled_at: scheduledAt,
      reason: body.reason || null,
      status: "scheduled",
      created_by: authUserId,
    })
    .select("*, patient:patients(*, user:users(id, first_name, last_name)), doctor:staff!doctor_id(*, user:users(id, first_name, last_name))")
    .single();

  if (error) return err(error.message, 500);

  logAudit(req, authUserId, {
    action: "create",
    entityType: "appointments",
    entityId: data.id,
    description: `Appointment booked for patient ${body.patient_id}`,
  }).catch(() => {});

  // Notify patient + doctor/staff + admins of new booking
  try {
    const { data: pat } = await svc
      .from("patients").select("user_id, primary_account_id").eq("id", body.patient_id).maybeSingle();
    const recipientIds: string[] = [];
    if (pat?.user_id) recipientIds.push(pat.user_id);
    if (pat?.primary_account_id) {
      const { data: mainP } = await svc
        .from("patients").select("user_id").eq("id", pat.primary_account_id).maybeSingle();
      if (mainP?.user_id) recipientIds.push(mainP.user_id);
    }

    // Notify assigned doctor/staff
    if (body.doctor_id) {
      const { data: doc } = await svc
        .from("staff").select("user_id").eq("id", body.doctor_id).maybeSingle();
      if (doc?.user_id) recipientIds.push(doc.user_id);
    }

    // Notify all admin/staff users
    const { data: adminStaff } = await svc
      .from("users").select("id").in("role", ["admin", "doctor", "nurse", "receptionist", "cashier", "accountant"]);
    if (adminStaff) {
      for (const u of adminStaff) recipientIds.push(u.id);
    }

    const uniqueIds = [...new Set(recipientIds)];
    if (uniqueIds.length) {
      const dateStr = new Date(body.appointment_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      await notifyUsers(svc, {
        orgId, userIds: uniqueIds, type: "appointment_reminder",
        title: "New Appointment Booked",
        message: `A new appointment has been booked for ${dateStr} at ${body.start_time}. Awaiting confirmation.`,
        url: "/admin/appointments",
      });
      await sendInternalMessage(svc, {
        orgId, senderId: authUserId, recipientUserIds: uniqueIds,
        subject: "New Appointment Booked",
        body: `A new appointment has been booked for ${dateStr} at ${body.start_time}.\n\nPlease review and confirm the appointment.`,
      });
    }
  } catch (e) {
    console.error("[Appointments POST] notification error:", e);
  }

  return ok(data, 201);
});
