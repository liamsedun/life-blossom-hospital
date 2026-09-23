import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";
import { notifyUsers, sendInternalMessage } from "@/lib/notify";

export const GET = withAuth(async (req, supabase, _uid, context) => {
  const { id } = await context.params;
  const { data, error } = await supabase
    .from("prescriptions")
    .select("*, patient:patients(*, user:users(id, first_name, last_name)), doctor:staff!doctor_id(*, user:users(id, first_name, last_name)), items:prescription_items(*)")
    .eq("id", id).single();
  if (error || !data) return err("Not found", 404);
  return ok(data);
});

export const PUT = withAuth(async (req, supabase, uid, context) => {
  const { id } = await context.params;
  const svc = createServiceClient();
  const body = await parseBody<any>(req);

  const { data: existing } = await supabase.from("prescriptions").select("id").eq("id", id).single();
  if (!existing) return err("Not found", 404);

  const allowed = ["patient_id", "doctor_id", "appointment_id", "diagnosis", "notes", "status", "dispensed_by", "dispensed_at"];
  const updates: Record<string, any> = {};
  for (const k of allowed) if (body[k] !== undefined) updates[k] = body[k];

  if (body.items && Array.isArray(body.items)) {
    await svc.from("prescription_items").delete().eq("prescription_id", id);
    const newItems = body.items.map((it: any) => ({ ...it, prescription_id: id }));
    await svc.from("prescription_items").insert(newItems);
  }

  const { data, error } = await svc.from("prescriptions").update(updates).eq("id", id)
    .select("*, patient:patients(*, user:users(id, first_name, last_name)), doctor:staff!doctor_id(*, user:users(id, first_name, last_name)), items:prescription_items(*)")
    .single();
  if (error) return err(error.message, 500);

  // If status changed to "dispensed", notify the prescriber (doctor/nurse)
  if (body.status === "dispensed" && data?.doctor?.user?.id) {
    const prescriberUserId = data.doctor.user.id;
    const patientLabel = data.patient
      ? `${data.patient.first_name || ""} ${data.patient.last_name || ""}`.trim()
      : "a patient";
    const medList = (data.items || []).map((it: any) => it.medication_name || it.medicine_name).join(", ");
    const dispensedByName = body.dispensed_by
      ? (await svc.from("users").select("first_name, last_name").eq("id", body.dispensed_by).maybeSingle()).data
      : null;
    const dispenserLabel = dispensedByName
      ? `${dispensedByName.first_name || ""} ${dispensedByName.last_name || ""}`.trim()
      : "A pharmacist";

    try {
      await notifyUsers(svc, {
        orgId: data.org_id,
        userIds: [prescriberUserId],
        type: "general",
        title: "Prescription Dispensed",
        message: `${dispenserLabel} has dispensed ${medList} for ${patientLabel}.`,
        url: "/admin/patients",
        tag: `prescription-dispensed-${id}`,
      });
    } catch (e) {
      console.error("[Prescriptions] dispensed notify error:", e);
    }

    try {
      await sendInternalMessage(svc, {
        orgId: data.org_id,
        senderId: body.dispensed_by || uid,
        recipientUserIds: [prescriberUserId],
        subject: `Prescription Dispensed — ${patientLabel}`,
        body: `The following prescription has been dispensed.\n\nPatient: ${patientLabel}\nMedications: ${medList}\nDiagnosis: ${data.diagnosis || "N/A"}\nDispensed by: ${dispenserLabel}\nDate: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`,
      });
    } catch (e) {
      console.error("[Prescriptions] dispensed internal mail error:", e);
    }

    // Also notify other doctors/nurses in the org
    try {
      const { data: clinicalStaff } = await svc
        .from("users")
        .select("id")
        .eq("org_id", data.org_id)
        .in("role", ["doctor", "nurse"])
        .eq("is_active", true);
      const otherStaffIds = (clinicalStaff || [])
        .map((s: any) => s.id)
        .filter((sid: string) => sid !== prescriberUserId && sid !== uid);

      if (otherStaffIds.length > 0) {
        await notifyUsers(svc, {
          orgId: data.org_id,
          userIds: otherStaffIds,
          type: "general",
          title: "Prescription Dispensed",
          message: `${dispenserLabel} has dispensed ${medList} for ${patientLabel}.`,
          url: "/admin/patients",
          tag: `prescription-dispensed-${id}`,
        });
      }
    } catch (e) {
      console.error("[Prescriptions] clinical staff notify error:", e);
    }
  }

  return ok(data);
});

export const DELETE = withAuth(async (req, supabase, _uid, context) => {
  const { id } = await context.params;
  const svc = createServiceClient();
  const { data: existing } = await supabase.from("prescriptions").select("id").eq("id", id).single();
  if (!existing) return err("Not found", 404);
  const { error } = await svc.from("prescriptions").delete().eq("id", id);
  if (error) return err(error.message, 500);
  return ok(null);
});
