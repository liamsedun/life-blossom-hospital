import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";
import { notifyUsers } from "@/lib/notify";
import { logAudit } from "@/lib/audit";

export const GET = withAuth(async (req, supabase, _uid, context) => {
  const { id } = await context.params;
  const { data, error } = await supabase
    .from("payments")
    .select("*, invoice:invoices(*), patient:patients(*, user:users(id, first_name, last_name))")
    .eq("id", id).single();
  if (error || !data) return err("Not found", 404);
  return ok(data);
});

export const PUT = withAuth(async (req, supabase, authUserId, context) => {
  const { id } = await context.params;
  const svc = createServiceClient();
  const body = await parseBody<any>(req);

  const { data: existing } = await supabase
    .from("payments")
    .select("id, status, invoice_id, amount, patient_id, org_id, transaction_ref")
    .eq("id", id).single();
  if (!existing) return err("Not found", 404);

  const allowed = ["amount", "method", "status", "transaction_ref", "notes", "bank_account_id"];
  const updates: Record<string, any> = {};
  for (const k of allowed) if (body[k] !== undefined) updates[k] = body[k];

  const { data, error } = await svc.from("payments").update(updates).eq("id", id)
    .select("*, invoice:invoices(*), patient:patients(*, user:users(id, first_name, last_name))").single();
  if (error) return err(error.message, 500);

  // When a pending bank transfer is confirmed, update the invoice
  if (existing.status === "pending" && updates.status === "completed" && existing.invoice_id) {
    const { data: invoice } = await supabase
      .from("invoices")
      .select("id, invoice_number, total, paid_amount, status, patient_id")
      .eq("id", existing.invoice_id)
      .single();

    if (invoice) {
      const newPaid = (invoice.paid_amount || 0) + existing.amount;
      const newStatus = newPaid >= invoice.total - 0.01 ? "paid" : "partially_paid";
      await svc.from("invoices").update({ paid_amount: newPaid, status: newStatus }).eq("id", invoice.id);

      // Notify the patient
      const patientUserId = (data as any).patient?.user_id;
      if (patientUserId && patientUserId !== authUserId) {
        const { data: caller } = await supabase.from("users").select("first_name, last_name").eq("id", authUserId).single();
        const staffName = caller ? `${caller.first_name || ""} ${caller.last_name || ""}`.trim() || "Staff" : "Staff";
        const summary = `₦${existing.amount.toLocaleString()} confirmed for invoice ${invoice.invoice_number}`;
        await notifyUsers(svc, {
          orgId: existing.org_id,
          userIds: [patientUserId],
          type: "payment_confirmed",
          title: "Payment confirmed",
          message: `${staffName} confirmed your payment of ${summary}. Your balance has been updated.`,
          referenceType: "payment",
          referenceId: id,
          url: "/patient/payments",
          tag: `payment-${id}`,
        });
      }

      await logAudit(req, authUserId, {
        action: "update",
        entityType: "payments",
        entityId: id,
        description: `Confirmed ₦${existing.amount.toLocaleString()} payment (${existing.transaction_ref}) → invoice ${invoice.invoice_number}`,
      });
    }
  }

  return ok(data);
});
