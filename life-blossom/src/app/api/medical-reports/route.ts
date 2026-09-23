import { NextRequest } from "next/server";
import { withAuth, ok, paginated, err, parseBody, getPagination, ValidationError, resolveOrgId, resolvePatientId } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";
import { notifyUsers, sendInternalMessage, resolveNotifyUserId } from "@/lib/notify";

// Only doctors and the admin can write medical reports.
// Admin/doctors/nurses read; patients read their own (and dependants').
const WRITE_ROLES = ["doctor", "admin"];
const READ_ROLES = ["doctor", "nurse", "admin"];

async function callerRole(supabase: any, authUserId: string): Promise<string | null> {
  const { data: user } = await supabase.from("users").select("role").eq("id", authUserId).single();
  return user?.role || null;
}

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
    return err("Forbidden", 403);
  }

  const sp = new URL(req.url).searchParams;
  let patientId = sp.get("patient_id");

  if (role === "patient") {
    if (!patientId) {
      patientId = await resolvePatientId(supabase, authUserId);
      if (!patientId) return err("Patient profile not found", 404);
      if (!(await ownsPatient(supabase, authUserId, patientId))) {
        return err("Forbidden: you can only view your own medical reports", 403);
      }
    } else if (patientId === "family") {
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
        .from("medical_reports")
        .select("*, patient:patients(id, first_name, last_name, patient_number)")
        .eq("org_id", orgId)
        .in("patient_id", ids)
        .order("report_date", { ascending: false })
        .range(from, to);

      if (error) return err(error.message, 500);
      return paginated(data, count || 0, page, pageSize);
    } else {
      if (!(await ownsPatient(supabase, authUserId, patientId))) {
        return err("Forbidden: you can only view your own medical reports", 403);
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
    .from("medical_reports")
    .select("*")
    .eq("org_id", orgId)
    .eq("patient_id", patientId)
    .order("report_date", { ascending: false })
    .range(from, to);

  if (error) return err(error.message, 500);
  return paginated(data, count || 0, page, pageSize);
});

export const POST = withAuth(async (req, supabase, authUserId) => {
  const role = await callerRole(supabase, authUserId);
  if (!role || !WRITE_ROLES.includes(role)) {
    return err("Forbidden: only doctors and the super admin can write medical reports", 403);
  }

  const body = await parseBody<{
    patient_id: string;
    content: string;
    report_date?: string;
    author_title?: string;
  }>(req);

  if (!body.patient_id) throw new ValidationError("patient_id is required");
  if (!body.content || !body.content.trim()) throw new ValidationError("Report content is required");

  const svc = createServiceClient();
  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("Org not found", 404);

  // Author identity is snapshotted at write time so reports stay valid
  const { data: author } = await svc.from("users").select("first_name, last_name").eq("id", authUserId).single();
  const authorName = author ? `${author.first_name || ""} ${author.last_name || ""}`.trim() : "Medical Officer";

  // Sequential reference number per org: MR-0001, MR-0002 ...
  const { count } = await svc
    .from("medical_reports")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);
  const referenceNumber = `MR-${String((count || 0) + 1).padStart(4, "0")}`;

  const { data, error } = await svc
    .from("medical_reports")
    .insert({
      org_id: orgId,
      patient_id: body.patient_id,
      reference_number: referenceNumber,
      report_date: body.report_date || new Date().toISOString().split("T")[0],
      content: body.content.trim(),
      author_name: authorName,
      author_title: body.author_title?.trim() || null,
      created_by: authUserId,
    })
    .select()
    .single();

  if (error) return err(error.message, 500);

  // Notify patient + send internal mail
  try {
    const patientUserId = await resolveNotifyUserId(svc, body.patient_id);
    console.log("[MedicalReports] resolved notify user_id:", patientUserId);
    if (patientUserId) {
      const { data: patientRow } = await svc.from("patients").select("first_name, last_name").eq("id", body.patient_id).maybeSingle();
      const patientName = patientRow ? `${patientRow.first_name || ""} ${patientRow.last_name || ""}`.trim() || "Patient" : "Patient";
      const snippet = body.content.length > 120 ? body.content.slice(0, 120) + "..." : body.content;

      await notifyUsers(svc, {
        orgId,
        userIds: [patientUserId],
        type: "lab_result",
        title: "New Medical Report",
        message: `A new medical report (${referenceNumber}) has been issued by ${authorName}.`,
        url: "/patient/records",
        tag: `report-${data.id}`,
      });
      console.log("[MedicalReports] notification sent to patient:", patientUserId);

      await sendInternalMessage(svc, {
        orgId,
        senderId: authUserId,
        recipientUserIds: [patientUserId],
        subject: `Medical Report Available — ${referenceNumber}`,
        body: `Dear ${patientName},\n\nA new medical report has been issued and is now available in your Records.\n\nReference: ${referenceNumber}\nDate: ${data.report_date}\nAuthor: ${authorName}${body.author_title ? ` (${body.author_title})` : ""}\n\nReport Summary:\n${snippet}\n\nYou can view the full report in your Records tab.`,
      });
      console.log("[MedicalReports] internal mail sent to patient:", patientUserId);
    } else {
      console.warn("[MedicalReports] No user_id found for patient:", body.patient_id);
    }
  } catch (e) {
    console.error("[MedicalReports] notification/mail error:", e);
  }

  return ok(data, 201);
});
