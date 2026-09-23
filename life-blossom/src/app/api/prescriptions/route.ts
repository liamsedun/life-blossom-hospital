import { NextRequest } from "next/server";
import { withAuth, ok, paginated, err, parseBody, getPagination, ValidationError, resolveOrgId } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";
import { notifyUsers, sendInternalMessage, resolveNotifyUserId } from "@/lib/notify";

export const GET = withAuth(async (req, supabase, authUserId) => {
  const sp = new URL(req.url).searchParams;
  const patientId = sp.get("patient_id");
  const status = sp.get("status");
  const role = (await supabase.from("users").select("role").eq("id", authUserId).single()).data?.role;
  const { page, pageSize, from, to } = getPagination(sp);

  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("Org not found", 404);

  const svc = createServiceClient();

  // Patient with family scope: fetch prescriptions for main patient + dependants
  if (role === "patient" && patientId === "family") {
    const { data: me } = await svc.from("patients").select("id").eq("user_id", authUserId).maybeSingle();
    if (!me) return err("Patient profile not found", 404);

    const { data: deps } = await svc.from("patients").select("id").eq("primary_account_id", me.id);
    const ids = [me.id, ...(deps?.map((d) => d.id) || [])];

    let query = svc
      .from("prescriptions")
      .select("*, patient:patients(id, first_name, last_name, patient_number), doctor:staff!doctor_id(*, user:users(id, first_name, last_name)), items:prescription_items(*)",
        { count: "exact" })
      .in("patient_id", ids);

    if (status) query = query.eq("status", status);

    const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to);
    if (error) return err(error.message, 500);
    return paginated(data, count || 0, page, pageSize);
  }

  // Staff/admin or patient with specific ID
  let query = supabase
    .from("prescriptions")
    .select("*, patient:patients(*, user:users(id, first_name, last_name)), doctor:staff!doctor_id(*, user:users(id, first_name, last_name)), items:prescription_items(*)",
      { count: "exact" })
    .eq("org_id", orgId);

  if (patientId) query = query.eq("patient_id", patientId);
  if (status) query = query.eq("status", status);

  const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to);
  if (error) return err(error.message, 500);
  return paginated(data, count || 0, page, pageSize);
});

export const POST = withAuth(async (req, supabase, authUserId) => {
  const body = await parseBody<{
    patient_id: string; doctor_id: string; appointment_id?: string;
    diagnosis?: string; notes?: string;
    items: Array<{
      medication_name: string; dosage: string; frequency: string;
      route?: string; duration?: string; quantity?: number; instructions?: string;
    }>;
  }>(req);

  if (!body.patient_id || !body.doctor_id) {
    throw new ValidationError("Missing required fields: patient_id, doctor_id");
  }
  if (!body.items?.length) {
    throw new ValidationError("At least one prescription item is required");
  }

  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("Org not found", 404);

  const svc = createServiceClient();

  // Resolve doctor_id: accept either a staff ID or a user ID
  let doctorId = body.doctor_id;
  const { data: staffRow } = await svc.from("staff").select("id").eq("user_id", doctorId).maybeSingle();
  if (staffRow) {
    doctorId = staffRow.id;
  }

  const { data: rx, error: rxError } = await svc
    .from("prescriptions")
    .insert({
      org_id: orgId,
      patient_id: body.patient_id,
      doctor_id: doctorId,
      appointment_id: body.appointment_id || null,
      diagnosis: body.diagnosis || null,
      notes: body.notes || null,
      status: "active",
    })
    .select("id").single();

  if (rxError) return err(rxError.message, 500);

  const items = body.items.map((it) => ({
    org_id: orgId,
    prescription_id: rx.id,
    medication_name: it.medication_name,
    medicine_name: it.medication_name,
    dosage: it.dosage,
    frequency: it.frequency,
    route: it.route || "oral",
    duration: it.duration || null,
    quantity: it.quantity || null,
    instructions: it.instructions || null,
  }));

  const { data: createdItems, error: itemsError } = await svc.from("prescription_items").insert(items).select();
  if (itemsError) return err(itemsError.message, 500);

  const { data: full } = await svc
    .from("prescriptions")
    .select("*, patient:patients(*, user:users(id, first_name, last_name)), doctor:staff!doctor_id(*, user:users(id, first_name, last_name)), items:prescription_items(*)")
    .eq("id", rx.id).single();

  // Notify patient + send internal mail
  try {
    console.log("[Prescriptions] full patient data:", JSON.stringify(full?.patient));
    const patientUserId = await resolveNotifyUserId(svc, body.patient_id);
    console.log("[Prescriptions] resolved notify user_id:", patientUserId);
    if (patientUserId) {
      const patientName = full?.patient
        ? `${full.patient.first_name || ""} ${full.patient.last_name || ""}`.trim() || "Patient"
        : "Patient";
      const doctorName = full?.doctor?.user
        ? `Dr. ${full.doctor.user.first_name} ${full.doctor.user.last_name}`
        : "A staff member";
      const medList = body.items.map((it) => it.medication_name).join(", ");

      await notifyUsers(svc, {
        orgId,
        userIds: [patientUserId],
        type: "general",
        title: "New Prescription",
        message: `${doctorName} has prescribed medications for you: ${medList}.`,
        url: "/patient/prescriptions",
        tag: `prescription-${rx.id}`,
      });
      console.log("[Prescriptions] notification sent to patient:", patientUserId);

      await sendInternalMessage(svc, {
        orgId,
        senderId: authUserId,
        recipientUserIds: [patientUserId],
        subject: `New Prescription — ${body.diagnosis || "General"}`,
        body: `Dear ${patientName},\n\n${doctorName} has issued a new prescription for you.\n\nDiagnosis: ${body.diagnosis || "N/A"}\nMedications:\n${body.items.map((it, i) => `  ${i + 1}. ${it.medication_name} — ${it.dosage}, ${it.frequency}, ${it.route || "oral"}${it.duration ? `, Duration: ${it.duration}` : ""}${it.instructions ? ` (${it.instructions})` : ""}`).join("\n")}${body.notes ? `\n\nNotes: ${body.notes}` : ""}\n\nPlease follow the prescribed dosage. You can view this prescription in your Prescriptions tab.`,
      });
      console.log("[Prescriptions] internal mail sent to patient:", patientUserId);
    } else {
      console.warn("[Prescriptions] No user_id found for patient:", body.patient_id);
    }
  } catch (e) {
    console.error("[Prescriptions] patient notify error:", e);
  }

  // Notify pharmacists in the org about the new prescription
  try {
    const { data: pharmacists } = await svc
      .from("users")
      .select("id, first_name, last_name")
      .eq("org_id", orgId)
      .eq("role", "pharmacist")
      .eq("is_active", true);
    const pharmacistIds = (pharmacists || []).map((p: any) => p.id).filter((id: string) => id !== authUserId);

    if (pharmacistIds.length > 0) {
      const patientLabel = full?.patient
        ? `${full.patient.first_name || ""} ${full.patient.last_name || ""}`.trim()
        : "a patient";
      const doctorLabel = full?.doctor?.user
        ? `Dr. ${full.doctor.user.first_name} ${full.doctor.user.last_name}`
        : "a clinician";
      const medList = body.items.map((it) => it.medication_name).join(", ");

      await notifyUsers(svc, {
        orgId,
        userIds: pharmacistIds,
        type: "general",
        title: "New Prescription to Dispense",
        message: `${doctorLabel} prescribed ${medList} for ${patientLabel}. Please prepare for dispensing.`,
        url: "/admin/patients",
        tag: `prescription-pharmacy-${rx.id}`,
      });

      await sendInternalMessage(svc, {
        orgId,
        senderId: authUserId,
        recipientUserIds: pharmacistIds,
        subject: `New Prescription — ${patientLabel}`,
        body: `A new prescription has been issued and requires dispensing.\n\nPatient: ${patientLabel}\nPrescribed by: ${doctorLabel}\nDiagnosis: ${body.diagnosis || "N/A"}\n\nMedications:\n${body.items.map((it, i) => `  ${i + 1}. ${it.medication_name} — ${it.dosage}, ${it.frequency}, ${it.route || "oral"}${it.duration ? `, Duration: ${it.duration}` : ""}${it.instructions ? ` (${it.instructions})` : ""}`).join("\n")}${body.notes ? `\n\nNotes: ${body.notes}` : ""}\n\nPlease review and dispense when ready.`,
      });
    }
  } catch (e) {
    console.error("[Prescriptions] pharmacist notify error:", e);
  }

  return ok({ ...full, items: createdItems }, 201);
});
