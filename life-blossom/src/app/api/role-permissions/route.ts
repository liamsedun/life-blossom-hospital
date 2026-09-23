import { withAuth, ok, err, parseBody, resolveOrgId, ValidationError } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";

// GET /api/role-permissions — list all permissions for the org, grouped by role
export const GET = withAuth(async (req, supabase, authUserId) => {
  const sp = new URL(req.url).searchParams;
  const role = sp.get("role");

  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("Org not found", 404);

  const svc = createServiceClient();
  let query = svc.from("role_permissions").select("*").eq("org_id", orgId);
  if (role) query = query.eq("role", role);
  const { data, error } = await query.order("role").order("module");
  if (error) return err(error.message, 500);
  return ok(data);
});

// POST /api/role-permissions — upsert permissions for a role (bulk)
export const POST = withAuth(async (req, supabase, authUserId) => {
  const body = await parseBody<{
    role: string;
    permissions: Array<{
      module: string;
      can_view: boolean;
      can_create: boolean;
      can_edit: boolean;
      can_delete: boolean;
    }>;
  }>(req);

  if (!body.role || !body.permissions?.length) {
    throw new ValidationError("role and permissions array are required");
  }

  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("Org not found", 404);

  const svc = createServiceClient();

  // Upsert each permission
  const rows = body.permissions.map((p) => ({
    org_id: orgId,
    role: body.role,
    module: p.module,
    can_view: p.can_view,
    can_create: p.can_create,
    can_edit: p.can_edit,
    can_delete: p.can_delete,
  }));

  const { data, error } = await svc
    .from("role_permissions")
    .upsert(rows, { onConflict: "org_id,role,module" })
    .select();

  if (error) return err(error.message, 500);
  return ok(data, 201);
});

// DELETE /api/role-permissions?role=X — delete all permissions for a role
export const DELETE = withAuth(async (req, supabase, authUserId) => {
  const sp = new URL(req.url).searchParams;
  const role = sp.get("role");
  if (!role) throw new ValidationError("role query param is required");

  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("Org not found", 404);

  const svc = createServiceClient();
  const { error } = await svc
    .from("role_permissions")
    .delete()
    .eq("org_id", orgId)
    .eq("role", role);

  if (error) return err(error.message, 500);
  return ok(null);
});
