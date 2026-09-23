import { NextRequest } from "next/server";
import {
  withAuth, ok, err, parseBody, ValidationError,
  resolvePatientId, resolveOrgId, resolvePaymentAccess,
} from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";
import { notifyUsers, sendInternalMessage } from "@/lib/notify";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/payments/declare
 *
 * Patient marks a bank transfer (or POS payment) as completed for an invoice,
 * entering the exact amount they paid (may be partial). Creates a pending
 * payment row and pushes a notification to every admin / super admin /
 * accountant in the org so they can confirm it in Billing → Record Payment.
 *
 * Body: { invoice_id, amount, payment_method? } (amount in Naira;
 * payment_method: "bank_transfer" | "pos", defaults to bank_transfer)
 */
export const POST = withAuth(async (req, supabase, authUserId) => {
  const { data: caller } = await supabase.from("users").select("role, first_name, last_name").eq("id", authUserId).single();
  if (caller?.role !== "patient") return err("Only patients can declare a transfer", 403);

  const body = await parseBody<{ invoice_id?: string; amount?: number; payment_method?: string; bank_account_id?: string }>(req);
  if (!body.invoice_id || !body.amount || body.amount <= 0) {
    throw new ValidationError("invoice_id and a positive amount are required");
  }
  if (!body.bank_account_id) {
    throw new ValidationError("bank_account_id is required — please select which hospital account you transferred to");
  }
  const method = body.payment_method === "pos" ? "pos" : "bank_transfer";

  const patientId = await resolvePatientId(supabase, authUserId);
  if (!patientId) return err("Patient profile not found", 404);

  // Family payment rule: dependants cannot declare payments — the main
  // account holder pays on their behalf
  const access = await resolvePaymentAccess(supabase, authUserId);
  if (access.isDependant) {
    return err("Only the main account holder can make payments on your behalf", 403);
  }

  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("User profile not found — org could not be resolved", 404);

  const svc = createServiceClient();

  // Invoice must belong to this patient and still be payable
  const { data: invoice } = await svc
    .from("invoices")
    .select("id, invoice_number, total, paid_amount, status")
    .eq("id", body.invoice_id)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!invoice) return err("Invoice not found", 404);
  if (invoice.status === "paid") return err("Invoice already paid", 400);
  const outstanding = (invoice.total || 0) - (invoice.paid_amount || 0);
  if (outstanding <= 0) return err("Invoice is fully paid", 400);
  if (body.amount > outstanding) {
    return err(`Amount exceeds outstanding balance of ₦${outstanding.toLocaleString()}`, 400);
  }

  // Prevent duplicate declarations for the same invoice
  const { data: dup } = await svc
    .from("payments")
    .select("id")
    .eq("org_id", orgId)
    .eq("patient_id", patientId)
    .eq("invoice_id", body.invoice_id)
    .eq("status", "pending")
    .maybeSingle();
  if (dup) return err("You already have a pending transfer declaration for this invoice", 400);

  const reference = `TRF-${Date.now().toString().slice(-10)}`;

  // Look up the bank account name for the notification
  const { data: bankAcct } = await svc
    .from("hospital_bank_accounts")
    .select("bank_name, account_number")
    .eq("id", body.bank_account_id)
    .eq("org_id", orgId)
    .maybeSingle();
  const bankLabel = bankAcct ? `${bankAcct.bank_name} (${bankAcct.account_number})` : "the hospital account";

  const { data: payment, error } = await svc
    .from("payments")
    .insert({
      org_id: orgId,
      invoice_id: body.invoice_id,
      patient_id: patientId,
      amount: body.amount,
      method: method,
      status: "pending",
      transaction_ref: reference,
      notes: `Declared by patient (${method}) to ${bankLabel} — awaiting staff confirmation`,
      created_by: authUserId,
      bank_account_id: body.bank_account_id,
    })
    .select()
    .single();
  if (error) return err(error.message, 500);

  // Notify every billing staff member in the org
  const { data: staff } = await svc
    .from("users")
    .select("id")
    .eq("org_id", orgId)
    .in("role", ["admin", "super_admin", "accountant", "cashier"])
    .eq("is_active", true);
  const staffIds = (staff || []).map((s: any) => s.id).filter((id: string) => id !== authUserId);

  const patientName = caller.first_name
    ? `${caller.first_name} ${caller.last_name || ""}`.trim()
    : "A patient";
  const methodLabel = method === "pos" ? "POS payment" : "bank transfer";
  await notifyUsers(svc, {
    orgId,
    userIds: staffIds,
    type: "payment_declared",
    title: "New payment declared",
    message: `${patientName} declared ₦${body.amount.toLocaleString()} (${methodLabel}) to ${bankLabel} for invoice ${invoice.invoice_number} — confirm in Billing → Record Payment.`,
    referenceType: "payment",
    referenceId: payment.id,
    url: "/admin/billing",
    tag: `payment-${payment.id}`,
  });

  await logAudit(req, authUserId, { action: "create", entityType: "payments", entityId: payment.id, description: `Patient declared ${methodLabel} of ₦${body.amount.toLocaleString()} for invoice ${invoice.invoice_number}` });

  // Send internal mail confirmation to the patient
  try {
    await sendInternalMessage(svc, {
      orgId,
      senderId: authUserId,
      recipientUserIds: [authUserId],
      subject: `Payment Declaration Received — ${invoice.invoice_number}`,
      body: `Your ${methodLabel} declaration has been received.\n\nAmount: ₦${body.amount.toLocaleString()}\nInvoice: ${invoice.invoice_number}\nBank Account: ${bankLabel}\nReference: ${reference}\n\nOur billing team will verify and confirm your payment shortly. You will be notified once confirmed.`,
    });
  } catch (e) {
    console.error("[Declare] failed to send internal message:", e);
  }

  return ok(payment, 201);
});
