import { withAuth, ok, err, resolveOrgId } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";

export const GET = withAuth(async (req, supabase, authUserId, context) => {
  const { id } = await context.params;
  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("Org not found", 404);

  const sp = new URL(req.url).searchParams;
  const from = sp.get("from");
  const to = sp.get("to");

  const svc = createServiceClient();

  const [payRes, expRes, othRes, outTransRes, inTransRes] = await Promise.all([
    svc.from("payments").select("id, amount, payment_date, status, method, invoice_id, created_at")
      .eq("bank_account_id", id).eq("status", "completed")
      .then((r) => ({ ...r, type: "payment" as const })),
    svc.from("expenses").select("id, amount, expense_date, description, category, vendor, created_at")
      .eq("bank_account_id", id)
      .then((r) => ({ ...r, type: "expense" as const })),
    svc.from("other_income").select("id, amount, income_date, description, category, source, created_at")
      .eq("bank_account_id", id)
      .then((r) => ({ ...r, type: "other_income" as const })),
    svc.from("bank_transfers").select("id, amount, description, transfer_date, to_account_id, created_at")
      .eq("from_account_id", id)
      .then((r) => ({ ...r, type: "transfer_out" as const })),
    svc.from("bank_transfers").select("id, amount, description, transfer_date, from_account_id, created_at")
      .eq("to_account_id", id)
      .then((r) => ({ ...r, type: "transfer_in" as const })),
  ]);

  interface TxRow {
    id: string; amount: number; date: string; description: string;
    type: "payment" | "expense" | "other_income" | "transfer_in" | "transfer_out";
    category?: string; counterparty?: string; created_at: string;
  }

  const txs: TxRow[] = [];

  for (const p of payRes.data || []) {
    txs.push({ id: p.id, amount: Number(p.amount), date: p.payment_date || p.created_at, description: `Patient payment`, type: "payment", category: p.method, created_at: p.created_at });
  }
  for (const e of expRes.data || []) {
    txs.push({ id: e.id, amount: -Number(e.amount), date: e.expense_date || e.created_at, description: e.description, type: "expense", category: e.category, counterparty: e.vendor, created_at: e.created_at });
  }
  for (const o of othRes.data || []) {
    txs.push({ id: o.id, amount: Number(o.amount), date: o.income_date || o.created_at, description: o.description, type: "other_income", category: o.category, counterparty: o.source, created_at: o.created_at });
  }
  for (const t of outTransRes.data || []) {
    txs.push({ id: t.id, amount: -Number(t.amount), date: t.transfer_date || t.created_at, description: t.description || "Bank transfer out", type: "transfer_out", created_at: t.created_at });
  }
  for (const t of inTransRes.data || []) {
    txs.push({ id: t.id, amount: Number(t.amount), date: t.transfer_date || t.created_at, description: t.description || "Bank transfer in", type: "transfer_in", created_at: t.created_at });
  }

  txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return ok(txs);
});
