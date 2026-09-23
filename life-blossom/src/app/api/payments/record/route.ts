import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody, ValidationError, resolveOrgId } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";
import { notifyUsers, sendInternalMessage } from "@/lib/notify";
import { logAudit } from "@/lib/audit";

const BILLING_ROLES = ["admin", "accountant", "cashier"];
const ALLOWED_METHODS = ["cash", "card", "transfer", "bank_transfer", "pos", "insurance", "mobile_money"];

/**
 * POST /api/payments/record
 *
 * Staff records a payment received from a patient (bank transfer, POS, cash…).
 * The amount is allocated across one or more of the patient's invoices
 * (accountant picks the invoices). Each invoice gets a completed payment row
 * and its paid_amount / status is updated. The patient + billing staff are
 * notified automatically.
 *
 * Body: {
 *   patient_id, amount,
 *   payment_method: "bank_transfer" | "pos" | "cash" | ...,
 *   allocation: [{ invoice_id, amount }],   // sum must equal amount
 *   pending_payment_id?,                    // confirms a patient declaration
 *   transaction_ref?, notes?
 * }
 */
export const POST = withAuth(async (req, supabase, authUserId) => {
  const { data: caller } = await supabase.from("users").select("role, first_name, last_name").eq("id", authUserId).single();
  if (!caller || !BILLING_ROLES.includes(caller.role)) {
    return err("Only admins and accountants can record payments", 403);
  }

  const body = await parseBody<{
    patient_id?: string;
    amount?: number;
    payment_method?: string;
    allocation?: Array<{ invoice_id: string; amount: number }>;
    pending_payment_id?: string;
    transaction_ref?: string;
    notes?: string;
    bank_account_id?: string;
  }>(req);

  if (!body.patient_id || !body.amount || body.amount <= 0) {
    throw new ValidationError("patient_id and a positive amount are required");
  }
  if (!body.payment_method || !ALLOWED_METHODS.includes(body.payment_method)) {
    throw new ValidationError("A valid payment method is required");
  }
  const allocation = (body.allocation || []).filter((a) => a && a.invoice_id && a.amount > 0);
  if (!allocation.length) {
    throw new ValidationError("Allocate the amount to at least one invoice");
  }
  const allocSum = allocation.reduce((s, a) => s + a.amount, 0);
  if (Math.abs(allocSum - body.amount) > 0.01) {
    throw new ValidationError("Allocated amounts must equal the payment amount");
  }

  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("User profile not found — org could not be resolved", 404);

  const svc = createServiceClient();

  // Patient must belong to this org
  const { data: patient } = await svc
    .from("patients")
    .select("id, user_id, user:users(id, first_name, last_name)")
    .eq("id", body.patient_id)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!patient) return err("Patient not found", 404);

  // Collect IDs of the patient + their dependants so we can allocate across all of them
  const { data: dependants } = await svc
    .from("patients")
    .select("id")
    .eq("primary_account_id", body.patient_id);
  const allowedPatientIds = [body.patient_id, ...(dependants || []).map((d: any) => d.id)];

  const createdPayments = [];
  const updatedInvoices = [];
  const reference = body.transaction_ref?.trim() || `RCPT-${Date.now().toString().slice(-10)}`;

  for (const item of allocation) {
    const { data: invoice } = await svc
      .from("invoices")
      .select("id, invoice_number, total, paid_amount, status, patient_id")
      .eq("id", item.invoice_id)
      .eq("org_id", orgId)
      .in("patient_id", allowedPatientIds)
      .maybeSingle();
    if (!invoice) return err(`Invoice ${item.invoice_id} not found for this patient`, 400);

    const outstanding = (invoice.total || 0) - (invoice.paid_amount || 0);
    if (item.amount > outstanding + 0.01) {
      return err(
        `Allocated ₦${item.amount.toLocaleString()} exceeds outstanding of ₦${outstanding.toLocaleString()} on invoice ${invoice.invoice_number}`,
        400
      );
    }

    const { data: payment, error: payErr } = await svc
      .from("payments")
      .insert({
        org_id: orgId,
        invoice_id: item.invoice_id,
        patient_id: invoice.patient_id,
        amount: item.amount,
        method: body.payment_method,
        status: "completed",
        transaction_ref: reference,
        notes: body.notes?.trim() || null,
        bank_account_id: body.bank_account_id || null,
        created_by: authUserId,
      })
      .select()
      .single();
    if (payErr) return err(payErr.message, 500);
    createdPayments.push(payment);

    const newPaid = (invoice.paid_amount || 0) + item.amount;
    const newStatus = newPaid >= invoice.total - 0.01 ? "paid" : "partially_paid";
    const { error: invErr } = await svc
      .from("invoices")
      .update({ paid_amount: newPaid, status: newStatus })
      .eq("id", item.invoice_id);
    if (invErr) return err(invErr.message, 500);
    updatedInvoices.push({
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      patient_id: invoice.patient_id,
      paid_amount: newPaid,
      status: newStatus,
    });
  }

  // If this confirms a patient declaration, consume the pending row
  let pendingConfirmed = false;
  if (body.pending_payment_id) {
    const { data: pending } = await svc
      .from("payments")
      .select("id")
      .eq("id", body.pending_payment_id)
      .eq("org_id", orgId)
      .eq("status", "pending")
      .maybeSingle();
    if (pending) {
      const { error: delErr } = await svc.from("payments").delete().eq("id", pending.id);
      if (delErr) console.error("[Record] failed to remove pending declaration:", delErr.message);
      else pendingConfirmed = true;
    }
  }

  // ── Notifications (transparency both ways) ──
  const staffName = `${caller.first_name || ""} ${caller.last_name || ""}`.trim() || "Staff";
  const puser = (patient as any).user;
  const patientName = `${puser?.first_name || ""} ${puser?.last_name || ""}`.trim() || "Patient";
  const invNumbers = updatedInvoices.map((i) => i.invoice_number).join(", ");
  const summary = `₦${body.amount.toLocaleString()} recorded for invoice(s) ${invNumbers}.`;

  // Collect affected patient user_ids (main + dependants who own the paid invoices)
  const affectedPatientUserIds = new Set<string>();
  if (patient.user_id) affectedPatientUserIds.add(patient.user_id);
  // Look up dependant user_ids for any invoices that belong to dependants
  for (const inv of updatedInvoices) {
    const { data: invPatient } = await svc
      .from("patients")
      .select("id, user_id, primary_account_id")
      .eq("id", inv.patient_id)
      .maybeSingle();
    if (invPatient?.user_id) affectedPatientUserIds.add(invPatient.user_id);
    if (invPatient?.primary_account_id) {
      const { data: mainP } = await svc
        .from("patients")
        .select("user_id")
        .eq("id", invPatient.primary_account_id)
        .maybeSingle();
      if (mainP?.user_id) affectedPatientUserIds.add(mainP.user_id);
    }
  }
  // Remove staff user_id from the notification list
  affectedPatientUserIds.delete(authUserId);

  // 1. Notify the affected patients
  if (affectedPatientUserIds.size) {
    await notifyUsers(svc, {
      orgId,
      userIds: [...affectedPatientUserIds],
      type: "payment_confirmed",
      title: "Payment confirmed",
      message: `${summary} — your account has been settled. Thank you!`,
      referenceType: "payment",
      referenceId: createdPayments[0].id,
      url: "/patient/payments",
      tag: `payment-${createdPayments[0].id}`,
    });
  }

  // 2. Notify the rest of the billing staff (transparency)
  const { data: staff } = await svc
    .from("users")
    .select("id")
    .eq("org_id", orgId)
    .in("role", ["admin", "accountant", "cashier"])
    .eq("is_active", true);
  const otherStaff = (staff || [])
    .map((s: any) => s.id)
    .filter((id: string) => id !== authUserId && !affectedPatientUserIds.has(id));
  if (otherStaff.length) {
    await notifyUsers(svc, {
      orgId,
      userIds: otherStaff,
      type: "payment_confirmed",
      title: "Payment recorded",
      message: `${staffName} recorded ${summary} for ${patientName}.`,
      referenceType: "payment",
      referenceId: createdPayments[0].id,
      url: "/admin/billing",
      tag: `payment-${createdPayments[0].id}`,
    });
  }

  await logAudit(req, authUserId, {
    action: "create",
    entityType: "payments",
    entityId: createdPayments[0].id,
    description: `Recorded ₦${body.amount.toLocaleString()} payment (${body.payment_method}) for ${patientName} — invoice(s) ${invNumbers}`,
  });

  // Send internal mail to the patient(s) confirming payment
  try {
    const recipientIds = [...affectedPatientUserIds];
    if (recipientIds.length) {
      await sendInternalMessage(svc, {
        orgId,
        senderId: authUserId,
        recipientUserIds: [...new Set(recipientIds)],
        subject: `Payment Confirmed — ${invNumbers}`,
        body: `A payment of ₦${body.amount.toLocaleString()} has been received and confirmed for ${patientName}.\n\nInvoice(s): ${invNumbers}\nMethod: ${body.payment_method}\n${body.transaction_ref ? `Reference: ${body.transaction_ref}\n` : ""}\nYour account has been updated. Thank you for your payment.`,
      });
    }
  } catch (e) {
    console.error("[RecordPayment] failed to send internal message:", e);
  }

  return ok({
    payments: createdPayments,
    invoices: updatedInvoices,
    pendingConfirmed,
  }, 201);
});
