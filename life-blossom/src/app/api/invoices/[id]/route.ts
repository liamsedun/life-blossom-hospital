import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody, resolveOrgId } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";
import { logAudit, logView } from "@/lib/audit";

export const GET = withAuth(async (req, supabase, authUserId, context) => {
  const svc = createServiceClient();
  const { id } = await context.params;
  const { data, error } = await svc
    .from("invoices")
    .select("*, patient:patients(*, user:users(id, first_name, last_name)), items:invoice_items(*), payments:payments(*)")
    .eq("id", id).single();
  if (error || !data) return err("Not found", 404);
  await logView(req, authUserId, "invoices", id, `Viewed invoice ${(data as any).invoice_number || id}`);
  return ok(data);
});

export const PUT = withAuth(async (req, supabase, authUserId, context) => {
  const { id } = await context.params;
  const svc = createServiceClient();
  const body = await parseBody<any>(req);

  const { data: existing } = await supabase.from("invoices").select("id, org_id").eq("id", id).single();
  if (!existing) return err("Not found", 404);

  const allowed = ["status", "due_date", "issue_date", "notes", "subtotal", "tax", "discount", "total", "attending_staff_id"];
  const updates: Record<string, any> = {};
  for (const k of allowed) if (body[k] !== undefined) updates[k] = body[k];

  if (body.items && Array.isArray(body.items)) {
    await svc.from("invoice_items").delete().eq("invoice_id", id);
    const newItems = body.items.map((it: any) => ({
      org_id: existing.org_id,
      description: it.description,
      quantity: it.quantity,
      unit_price: it.unit_price,
      vat_percent: it.vat_percent || 0,
      vat_amount: it.vat_amount || 0,
      line_total: it.line_total || it.quantity * it.unit_price,
      invoice_id: id,
    }));
    await svc.from("invoice_items").insert(newItems);
  }

  const { data, error } = await svc.from("invoices").update(updates).eq("id", id)
    .select("*, patient:patients(*, user:users(id, first_name, last_name)), items:invoice_items(*), payments:payments(*)")
    .single();
  if (error) return err(error.message, 500);
  await logAudit(req, authUserId, { action: "update", entityType: "invoices", entityId: id, description: body.status ? `Invoice status set to ${body.status}` : "Invoice updated" });
  return ok(data);
});

export const DELETE = withAuth(async (req, supabase, authUserId, context) => {
  const { id } = await context.params;
  const svc = createServiceClient();
  const { data: existing } = await supabase.from("invoices").select("id").eq("id", id).single();
  if (!existing) return err("Not found", 404);
  const { error } = await svc.from("invoices").delete().eq("id", id);
  if (error) return err(error.message, 500);
  await logAudit(req, authUserId, { action: "delete", entityType: "invoices", entityId: id, description: "Invoice deleted" });
  return ok(null);
});
