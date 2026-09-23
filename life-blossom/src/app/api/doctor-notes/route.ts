import { NextRequest } from "next/server";
import { withAuth, ok, paginated, err, parseBody, getPagination, ValidationError, resolveOrgId, resolvePatientId } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";
import { notifyUsers, sendInternalMessage, resolveNotifyUserId } from "@/lib/notify";

// Clinicians (doctor/nurse) can read AND write. Admin can READ.
// Patients can read their own notes (and their dependants').
const WRITE_ROLES = ["doctor", "nurse", "admin"];
const READ_ROLES = ["doctor", "nurse", "admin"];

async function callerRole(supabase: any, authUserId: string): Promise<string | null> {
  const { data: user } = await supabase.from("users").select("role").eq("id", authUserId).single();
  return user?.role || null;
}

/** Does this patient record belong to the caller (their own or a dependant)? */
async function ownsPatient(supabase: any, authUserId: string, patientId: string): Promise<boolean> {
  const { data: me } = await supabase.from("patients").select("id").eq("user_id", authUserId).maybeSingle();
  if (!me) return false;
  if (me.id === patientId) return true;
  const { data: dep } = await supabase
    .from("patients")
    .select("id")
    .eq("id", patientId)
    .eq("primary_account_id", me.id)
    .maybeSingle();
  return !!dep;
}

export const GET = withAuth(async (req, supabase, authUserId) => {
  const role = await callerRole(supabase, authUserId);
  if (!role || (!READ_ROLES.includes(role) && role !== "patient")) {
    return err("Forbidden: you do not have access to clinical notes", 403);
  }

  const sp = new URL(req.url).searchParams;
  let patientId = sp.get("patient_id");

  if (role === "patient") {
    if (!patientId) {
      patientId = await resolvePatientId(supabase, authUserId);
      if (!patientId) return err("Patient profile not found", 404);
      if (!(await ownsPatient(supabase, authUserId, patientId))) {
        return err("Forbidden: you can only view your own clinical notes", 403);
      }
    } else if (patientId === "family") {
      // Return notes for the main patient AND all their dependants
      const svc = createServiceClient();
      const { data: me } = await svc.from("patients").select("id").eq("user_id", authUserId).maybeSingle();
      if (!me) return err("Patient profile not found", 404);

      const { data: deps } = await svc
        .from("patients")
        .select("id")
        .eq("primary_account_id", me.id);

      const ids = [me.id, ...(deps?.map((d) => d.id) || [])];

      const { page, pageSize, from, to } = getPagination(sp);
      const orgId = await resolveOrgId(supabase, authUserId);
      if (!orgId) return err("Org not found", 404);

      const { data, error, count } = await svc
        .from("doctor_notes")
        .select("*, doctor:staff!doctor_id(*, user:users(id, first_name, last_name)), patient:patients(id, first_name, last_name, patient_number)", { count: "exact" })
        .eq("org_id", orgId)
        .in("patient_id", ids)
        .order("visit_date", { ascending: false })
        .range(from, to);

      if (error) return err(error.message, 500);
      return paginated(data, count || 0, page, pageSize);
    } else {
      if (!(await ownsPatient(supabase, authUserId, patientId))) {
        return err("Forbidden: you can only view your own clinical notes", 403);
      }
    }
  } else if (!patientId) {
    return err("patient_id is required", 400);
  }

  const { page, pageSize, from, to } = getPagination(sp);
  const svc = createServiceClient();

  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("Org not found", 404);

  const { data, error, count } = await svc
    .from("doctor_notes")
    .select("*, doctor:staff!doctor_id(*, user:users(id, first_name, last_name))", { count: "exact" })
    .eq("org_id", orgId)
    .eq("patient_id", patientId)
    .order("visit_date", { ascending: false })
    .range(from, to);

  if (error) return err(error.message, 500);
  return paginated(data, count || 0, page, pageSize);
});

export const POST = withAuth(async (req, supabase, authUserId) => {
  const role = await callerRole(supabase, authUserId);
  if (!role || !WRITE_ROLES.includes(role)) {
    return err("Forbidden: only doctors and nurses can create clinical notes", 403);
  }

  const body = await parseBody<{
    patient_id: string; doctor_id?: string; appointment_id?: string; visit_date?: string;
    vitals?: Record<string, string>; tests_procedures?: Record<string, string>;
    clinical_findings?: string; diagnosis?: Record<string, any>;
    medications?: Array<Record<string, string>>; treatment_recommendations?: string;
    next_visit_date?: string; next_visit_reason?: string;
  }>(req);

  if (!body.patient_id) throw new ValidationError("patient_id is required");

  const svc = createServiceClient();

  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("Org not found", 404);

  const { data, error } = await svc
    .from("doctor_notes")
    .insert({
      org_id: orgId,
      patient_id: body.patient_id,
      doctor_id: body.doctor_id || null,
      appointment_id: body.appointment_id || null,
      visit_date: body.visit_date || new Date().toISOString().split("T")[0],
      vitals: body.vitals || {},
      tests_procedures: body.tests_procedures || {},
      clinical_findings: body.clinical_findings || null,
      diagnosis: body.diagnosis || {},
      medications: body.medications || [],
      treatment_recommendations: body.treatment_recommendations || null,
      next_visit_date: body.next_visit_date || null,
      next_visit_reason: body.next_visit_reason || null,
      created_by: authUserId,
    })
    .select("*, doctor:staff!doctor_id(*, user:users(id, first_name, last_name))")
    .single();

  if (error) return err(error.message, 500);

  // Notify patient + send internal mail
  try {
    const patientUserId = await resolveNotifyUserId(svc, body.patient_id);
    console.log("[DoctorNotes] resolved notify user_id:", patientUserId);
    if (patientUserId) {
      const { data: patientRow } = await svc.from("patients").select("first_name, last_name").eq("id", body.patient_id).maybeSingle();
      const patientName = patientRow ? `${patientRow.first_name || ""} ${patientRow.last_name || ""}`.trim() || "Patient" : "Patient";
      const staffName = data.doctor?.user
        ? `${data.doctor.user.first_name} ${data.doctor.user.last_name}`
        : "A staff member";
      const diagSummary = body.diagnosis && typeof body.diagnosis === "object"
        ? Object.values(body.diagnosis).filter(Boolean).join(", ")
        : "";
      const visitDate = body.visit_date || new Date().toISOString().split("T")[0];

      await notifyUsers(svc, {
        orgId,
        userIds: [patientUserId],
        type: "general",
        title: "New Clinical Note",
        message: `${staffName} has added a clinical note for your visit on ${visitDate}.`,
        url: "/patient/records",
        tag: `note-${data.id}`,
      });
      console.log("[DoctorNotes] notification sent to patient:", patientUserId);

      await sendInternalMessage(svc, {
        orgId,
        senderId: authUserId,
        recipientUserIds: [patientUserId],
        subject: `Clinical Note Added — Visit ${visitDate}`,
        body: `Dear ${patientName},\n\nA new clinical note has been added to your medical records.\n\nDate: ${visitDate}\nRecorded by: ${staffName}${diagSummary ? `\nDiagnosis: ${diagSummary}` : ""}${body.clinical_findings ? `\n\nClinical Findings:\n${body.clinical_findings}` : ""}${body.treatment_recommendations ? `\n\nTreatment Recommendations:\n${body.treatment_recommendations}` : ""}${body.next_visit_date ? `\n\nNext Visit: ${body.next_visit_date}${body.next_visit_reason ? ` — ${body.next_visit_reason}` : ""}` : ""}\n\nYou can view this note in your Records tab.`,
      });
      console.log("[DoctorNotes] internal mail sent to patient:", patientUserId);
    } else {
      console.warn("[DoctorNotes] No user_id found for patient:", body.patient_id);
    }
  } catch (e) {
    console.error("[DoctorNotes] notification/mail error:", e);
  }

  return ok(data, 201);
});
