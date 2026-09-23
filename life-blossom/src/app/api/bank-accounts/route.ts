import { withAuth, ok, err, resolveOrgId } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";

export const GET = withAuth(async (req, supabase, authUserId) => {
  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("Org not found", 404);

  const svc = createServiceClient();

  const { data: accounts, error: accErr } = await svc
    .from("hospital_bank_accounts")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });
  if (accErr) return err(accErr.message, 500);

  const results = await Promise.all(
    (accounts || []).map(async (acc) => {
      const [payRes, expRes, othRes, outTransRes, inTransRes] = await Promise.all([
        svc.from("payments").select("amount").eq("bank_account_id", acc.id).eq("status", "completed"),
        svc.from("expenses").select("amount").eq("bank_account_id", acc.id),
        svc.from("other_income").select("amount").eq("bank_account_id", acc.id),
        svc.from("bank_transfers").select("amount").eq("from_account_id", acc.id),
        svc.from("bank_transfers").select("amount").eq("to_account_id", acc.id),
      ]);

      const paymentsIn = (payRes.data || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
      const otherIn = (othRes.data || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
      const expensesOut = (expRes.data || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
      const transfersOut = (outTransRes.data || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
      const transfersIn = (inTransRes.data || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

      const balance = paymentsIn + otherIn + transfersIn - expensesOut - transfersOut;

      return {
        ...acc,
        balance: Math.round(balance * 100) / 100,
        total_in: Math.round((paymentsIn + otherIn + transfersIn) * 100) / 100,
        total_out: Math.round((expensesOut + transfersOut) * 100) / 100,
      };
    })
  );

  return ok(results);
});
