import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody, resolveOrgId } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";

const WRITE_ROLES = ["doctor", "admin"];

export const PUT = withAuth(async (req, supabase, authUserId, context) => {
  const { data: user } = await supabase.from("users").select("role").eq("id", authUserId).single();
  if (!user || !WRITE_ROLES.includes(user.role)) {
    return err("Forbidden: only doctors and admin can edit medical reports", 403);
  }
  const { id } = await context.params;
  const body = await parseBody<any>(req);
  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("Org not found", 404);

  const allowed = ["content", "report_date", "author_title"];
  const updates: Record<string, any> = {};
  for (const k of allowed) if (body[k] !== undefined) updates[k] = body[k];

  const svc = createServiceClient();
  const { data, error } = await svc
    .from("medical_reports")
    .update(updates)
    .eq("id", id)
    .eq("org_id", orgId)
    .select("*")
    .single();

  if (error) return err(error.message, 500);
  if (!data) return err("Not found", 404);
  return ok(data);
});

export const DELETE = withAuth(async (req, supabase, authUserId, context) => {
  const { data: user } = await supabase.from("users").select("role").eq("id", authUserId).single();
  if (!user || !WRITE_ROLES.includes(user.role)) {
    return err("Forbidden: only doctors and the super admin can delete medical reports", 403);
  }
  const { id } = await context.params;
  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("Org not found", 404);

  const svc = createServiceClient();
  const { error } = await svc.from("medical_reports").delete().eq("id", id).eq("org_id", orgId);
  if (error) return err(error.message, 500);
  return ok(null);
});
