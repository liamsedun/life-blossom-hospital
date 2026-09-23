import { withAuth, ok, err, parseBody, ValidationError, resolveOrgId } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";

export const POST = withAuth(async (req, supabase, authUserId) => {
  const body = await parseBody<{
    from_account_id?: string; to_account_id?: string; amount?: number; description?: string; transfer_date?: string;
  }>(req);

  if (!body.from_account_id || !body.to_account_id || !body.amount) {
    throw new ValidationError("from_account_id, to_account_id and amount are required");
  }
  if (body.from_account_id === body.to_account_id) {
    throw new ValidationError("Source and destination accounts must be different");
  }
  if (body.amount <= 0) {
    throw new ValidationError("Amount must be greater than zero");
  }

  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("Org not found", 404);

  const svc = createServiceClient();

  const { data, error } = await svc
    .from("bank_transfers")
    .insert({
      org_id: orgId,
      from_account_id: body.from_account_id,
      to_account_id: body.to_account_id,
      amount: body.amount,
      description: body.description || null,
      transfer_date: body.transfer_date || new Date().toISOString().split("T")[0],
      created_by: authUserId,
    })
    .select()
    .single();
  if (error) return err(error.message, 500);

  return ok(data, 201);
});
