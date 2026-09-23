import { NextRequest } from "next/server";
import { withAuth, ok, paginated, err, parseBody, getPagination, ValidationError, resolvePatientId, resolveOrgId } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { sendInternalMessage } from "@/lib/notify";

export const GET = withAuth(async (req, supabase, authUserId) => {
  const svc = createServiceClient();
  const sp = new URL(req.url).searchParams;
  const patientId = sp.get("patient_id") || await resolvePatientId(supabase, authUserId);
  const status = sp.get("status");
  const { page, pageSize, from, to } = getPagination(sp);

  // When the caller is a patient, also include dependants' invoices
  let patientIds: string[] | null = null;
  if (patientId && !sp.get("patient_id")) {
    const { data: dependants } = await svc
      .from("patients")
      .select("id")
      .eq("primary_account_id", patientId);
    patientIds = [patientId, ...(dependants || []).map((d: any) => d.id)];
  }

  let query = svc
    .from("invoices")
    .select("*, patient:patients(*, user:users(id, first_name, last_name)), items:invoice_items(*), payments:payments(*), attending_staff:attending_staff_id(id, first_name, last_name, role, avatar_url)",
      { count: "exact" });

  if (patientIds) query = query.in("patient_id", patientIds);
  else if (patientId) query = query.eq("patient_id", patientId);
  if (status) query = query.eq("status", status);

  const { data, error, count } = await query.order("issue_date", { ascending: false }).range(from, to);
  if (error) return err(error.message, 500);
  return paginated(data, count || 0, page, pageSize);
});

export const POST = withAuth(async (req, supabase, authUserId) => {
  const body = await parseBody<{
    patient_id: string; appointment_id?: string; issue_date?: string; due_date?: string;
    subtotal: number; tax?: number; discount?: number; total: number;
    attending_staff_id?: string; notes?: string; status?: string;
    items: Array<{ description: string; quantity: number; unit_price: number; total_price: number; vat_percent?: number; vat_amount?: number }>;
  }>(req);

  if (!body.patient_id || body.subtotal === undefined || !body.total) {
    throw new ValidationError("Missing required fields: patient_id, subtotal, total");
  }
  if (!body.items || !body.items.length) {
    throw new ValidationError("At least one invoice item is required");
  }

  const svc = createServiceClient();

  // Resolve org for the invoice (org_id is NOT NULL in the invoices table)
  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("User profile not found — org could not be resolved", 404);

  // Generate invoice number
  const { count } = await supabase.from("invoices").select("id", { count: "exact", head: true });
  const invoiceNumber = `INV-${String((count || 0) + 1).padStart(4, "0")}`;

  // Validate attending staff belongs to this org (if provided)
  if (body.attending_staff_id) {
    const { data: staffUser } = await svc
      .from("users")
      .select("id, role")
      .eq("id", body.attending_staff_id)
      .maybeSingle();
    if (!staffUser) return err("Attending staff not found", 400);
    if (!["doctor", "nurse", "admin", "accountant"].includes(staffUser.role)) {
      return err("Attending staff must be a doctor, nurse, admin, or accountant", 400);
    }
  }

  const { data: invoice, error: invError } = await svc
    .from("invoices")
    .insert({
      org_id: orgId,
      patient_id: body.patient_id,
      invoice_number: invoiceNumber,
      issue_date: body.issue_date || new Date().toISOString().split("T")[0],
      due_date: body.due_date || null,
      status: body.status || "pending",
      subtotal: body.subtotal,
      tax: body.tax || 0,
      discount: body.discount || 0,
      total: body.total,
      attending_staff_id: body.attending_staff_id || null,
      created_by: authUserId,
      notes: body.notes || null,
    })
    .select("id")
    .single();

  if (invError) return err(invError.message, 500);

  // Insert items
  const lineItems = body.items.map((it) => ({
    org_id: orgId,
    description: it.description,
    quantity: it.quantity,
    unit_price: it.unit_price,
    vat_percent: it.vat_percent || 0,
    vat_amount: it.vat_amount || 0,
    line_total: it.total_price,
    invoice_id: invoice.id,
  }));
  const { data: items, error: itemsError } = await svc.from("invoice_items").insert(lineItems).select();
  if (itemsError) return err(itemsError.message, 500);

  // Fetch full invoice
  const { data: full } = await svc
    .from("invoices")
    .select("*, patient:patients(*, user:users(id, first_name, last_name)), items:invoice_items(*), payments:payments(*), attending_staff:attending_staff_id(id, first_name, last_name, role, avatar_url)")
    .eq("id", invoice.id).single();

  await logAudit(req, authUserId, { action: "create", entityType: "invoices", entityId: invoice.id, description: `Invoice ${invoiceNumber} created for ₦${body.total.toLocaleString()}` });

  // Send internal mail to the patient (and main account holder if dependant)
  try {
    const { data: patientRow } = await svc
      .from("patients")
      .select("user_id, primary_account_id, user:users!patients_user_id_fkey(first_name, last_name)")
      .eq("id", body.patient_id)
      .maybeSingle();
    if (patientRow) {
      const recipientIds: string[] = [];
      // If dependant, also message the main account holder
      if (patientRow.primary_account_id) {
        const { data: mainPatient } = await svc
          .from("patients")
          .select("user_id")
          .eq("id", patientRow.primary_account_id)
          .maybeSingle();
        if (mainPatient?.user_id) recipientIds.push(mainPatient.user_id);
      }
      if (patientRow.user_id) recipientIds.push(patientRow.user_id);

      const pUser = patientRow.user as any;
      const patientName = pUser ? `${pUser.first_name} ${pUser.last_name}` : "Patient";
      const itemSummary = body.items.map((it) => it.description).join(", ");
      await sendInternalMessage(svc, {
        orgId,
        senderId: authUserId,
        recipientUserIds: [...new Set(recipientIds)],
        subject: `New Invoice ${invoiceNumber}`,
        body: `A new invoice of ₦${body.total.toLocaleString()} has been raised for ${patientName}.\n\nItems: ${itemSummary}\n\nInvoice Number: ${invoiceNumber}\nIssue Date: ${body.issue_date || new Date().toISOString().split("T")[0]}\nDue Date: ${body.due_date || "N/A"}\n\nPlease make payment to settle this invoice.`,
      });
    }
  } catch (e) {
    console.error("[Invoice] failed to send internal message:", e);
  }

  return ok({ ...full, items }, 201);
});
