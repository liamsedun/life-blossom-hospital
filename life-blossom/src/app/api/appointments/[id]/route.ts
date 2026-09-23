import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";
import { notifyUsers, sendInternalMessage } from "@/lib/notify";
import { sendPushNotificationByUserId } from "@/lib/push-notifications";
import { logAudit, logView } from "@/lib/audit";

export const GET = withAuth(async (req, supabase, authUserId, context) => {
  const { id } = await context.params;
  const svc = createServiceClient();
  const { data, error } = await svc
    .from("appointments")
    .select("*, patient:patients(*, user:users(id, first_name, last_name)), doctor:staff!doctor_id(*, user:users(id, first_name, last_name))")
    .eq("id", id).single();
  if (error || !data) return err("Not found", 404);
  const enriched = {
    ...data,
    appointment_date: data.scheduled_at ? data.scheduled_at.slice(0, 10) : null,
    start_time: data.scheduled_at ? data.scheduled_at.slice(11, 16) : null,
  };
  logView(req, authUserId, "appointments", id, "Viewed appointment detail").catch(() => {});
  return ok(enriched);
});

export const PUT = withAuth(async (req, supabase, authUserId, context) => {
  const { id } = await context.params;
  const body = await parseBody<any>(req);
  const svc = createServiceClient();

  const { data: existing } = await svc.from("appointments")
    .select("id, status, patient_id, doctor_id, org_id, scheduled_at").eq("id", id).single();
  if (!existing) return err("Not found", 404);

  const allowed = ["patient_id", "doctor_id", "scheduled_at", "status", "reason", "notes"];
  const updates: Record<string, any> = {};
  for (const k of allowed) if (body[k] !== undefined && body[k] !== "") updates[k] = body[k];

  // Support reschedule via appointment_date + start_time (combine into scheduled_at)
  if (body.appointment_date && body.start_time && !updates.scheduled_at) {
    updates.scheduled_at = `${body.appointment_date}T${body.start_time}:00`;
  }

  const { data, error } = await svc.from("appointments").update(updates).eq("id", id)
    .select("*, patient:patients(*, user:users(id, first_name, last_name)), doctor:staff!doctor_id(*, user:users(id, first_name, last_name))")
    .single();
  if (error) return err(error.message, 500);

  logAudit(req, authUserId, {
    action: "update",
    entityType: "appointments",
    entityId: id,
    description: body.status && body.status !== existing.status
      ? `Appointment status changed to ${body.status}`
      : "Appointment updated",
  }).catch(() => {});

  // ── Notifications + internal mail on status change ──
  if (body.status && body.status !== existing.status) {
    const dateStr = existing.scheduled_at
      ? new Date(existing.scheduled_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
      : "N/A";
    const timeStr = existing.scheduled_at ? existing.scheduled_at.slice(11, 16) : "N/A";

    const notifMap: Record<string, { title: string; message: string; type: string }> = {
      confirmed: {
        title: "Appointment Confirmed",
        message: `Your appointment on ${dateStr} at ${timeStr} has been confirmed.`,
        type: "appointment_reminder",
      },
      completed: {
        title: "Appointment Completed",
        message: `Your appointment on ${dateStr} at ${timeStr} has been completed.`,
        type: "general",
      },
      cancelled: {
        title: "Appointment Cancelled",
        message: `Your appointment on ${dateStr} at ${timeStr} has been cancelled.`,
        type: "general",
      },
      no_show: {
        title: "Appointment Unattended",
        message: `Your appointment on ${dateStr} at ${timeStr} was not attended and has been marked as unattended.`,
        type: "general",
      },
    };

    const n = notifMap[body.status];
    if (n) {
      // Collect recipient IDs: patient user + dependants' main account + doctor
      const recipientUserIds = new Set<string>();
      const recipientInternalMail = new Set<string>();

      // Patient
      const { data: pat } = await svc
        .from("patients").select("user_id, primary_account_id").eq("id", existing.patient_id).maybeSingle();
      if (pat?.user_id) { recipientUserIds.add(pat.user_id); recipientInternalMail.add(pat.user_id); }
      if (pat?.primary_account_id) {
        const { data: mainP } = await svc
          .from("patients").select("user_id").eq("id", pat.primary_account_id).maybeSingle();
        if (mainP?.user_id) { recipientUserIds.add(mainP.user_id); recipientInternalMail.add(mainP.user_id); }
      }

      // Doctor
      if (existing.doctor_id) {
        const { data: doc } = await svc
          .from("staff").select("user_id").eq("id", existing.doctor_id).maybeSingle();
        if (doc?.user_id) { recipientUserIds.add(doc.user_id); recipientInternalMail.add(doc.user_id); }
      }

      // All admin/staff users
      const { data: adminStaff } = await svc
        .from("users").select("id").in("role", ["admin", "doctor", "nurse", "receptionist", "cashier", "accountant"]);
      if (adminStaff) {
        for (const u of adminStaff) { recipientUserIds.add(u.id); recipientInternalMail.add(u.id); }
      }

      // Send push notifications
      if (recipientUserIds.size) {
        await notifyUsers(svc, {
          orgId: existing.org_id,
          userIds: [...recipientUserIds],
          type: n.type as any,
          title: n.title,
          message: n.message,
          url: "/patient/appointments",
        }).catch(() => {});
      }

      // Direct push to patient when confirmed
      if (body.status === "confirmed" && pat?.user_id) {
        await sendPushNotificationByUserId(svc, pat.user_id, {
          title: "Appointment Confirmed",
          body: `Your appointment on ${dateStr} at ${timeStr} has been confirmed.`,
          url: "/patient/appointments",
        }).catch(() => {});
      }

      // Send internal mail
      if (recipientInternalMail.size) {
        const statusLabel = body.status === "no_show" ? "Unattended" : body.status.charAt(0).toUpperCase() + body.status.slice(1);
        await sendInternalMessage(svc, {
          orgId: existing.org_id,
          senderId: authUserId,
          recipientUserIds: [...recipientInternalMail],
          subject: `Appointment ${statusLabel} — ${dateStr}`,
          body: `Appointment scheduled for ${dateStr} at ${timeStr} has been ${body.status}.\n\n${n.message}\n\nStatus: ${statusLabel}`,
        }).catch(() => {});
      }
    }
  }

  return ok(data);
});

export const DELETE = withAuth(async (req, supabase, authUserId, context) => {
  const { id } = await context.params;
  const svc = createServiceClient();
  const { data: existing } = await svc.from("appointments").select("id").eq("id", id).single();
  if (!existing) return err("Not found", 404);
  const { error } = await svc.from("appointments").delete().eq("id", id);
  if (error) return err(error.message, 500);
  logAudit(req, authUserId, { action: "delete", entityType: "appointments", entityId: id, description: "Appointment deleted" }).catch(() => {});
  return ok(null);
});
