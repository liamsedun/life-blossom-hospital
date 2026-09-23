import { withAuth, ok, err, parseBody, resolveOrgId, ValidationError } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";

// GET /api/custom-roles — list custom roles for the org
export const GET = withAuth(async (req, supabase, authUserId) => {
  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("Org not found", 404);

  const svc = createServiceClient();
  const { data, error } = await svc
    .from("custom_roles")
    .select("*")
    .eq("org_id", orgId)
    .order("name");

  if (error) return err(error.message, 500);
  return ok(data);
});

// POST /api/custom-roles — create a new custom role
export const POST = withAuth(async (req, supabase, authUserId) => {
  const body = await parseBody<{ name: string; description?: string }>(req);
  if (!body.name?.trim()) throw new ValidationError("name is required");

  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("Org not found", 404);

  // Check only admin can create roles
  const { data: caller } = await supabase.from("users").select("role").eq("id", authUserId).single();
  if (caller?.role !== "admin") return err("Only admin can create roles", 403);

  const svc = createServiceClient();

  // Check for duplicate name
  const { data: existing } = await svc
    .from("custom_roles")
    .select("id")
    .eq("org_id", orgId)
    .ilike("name", body.name.trim())
    .maybeSingle();

  if (existing) return err(`A role named "${body.name}" already exists`, 409);

  const { data, error } = await svc
    .from("custom_roles")
    .insert({ org_id: orgId, name: body.name.trim(), description: body.description || null })
    .select()
    .single();

  if (error) return err(error.message, 500);

  // Seed default permissions (view only) for the new role across all modules
  const modules = ["dashboard", "patients", "appointments", "billing", "expenses", "other_income", "internal_mail", "live_chat", "staff", "reports", "security_audit", "settings", "profile"];
  const defaultPerms = modules.map((m) => ({
    org_id: orgId,
    role: body.name.trim().toLowerCase(),
    module: m,
    can_view: true,
    can_create: false,
    can_edit: false,
    can_delete: false,
  }));

  await svc.from("role_permissions").upsert(defaultPerms, { onConflict: "org_id,role,module" });

  return ok(data, 201);
});

// DELETE /api/custom-roles?id=X — delete a custom role
export const DELETE = withAuth(async (req, supabase, authUserId) => {
  const sp = new URL(req.url).searchParams;
  const id = sp.get("id");
  if (!id) throw new ValidationError("id query param is required");

  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("Org not found", 404);

  const { data: caller } = await supabase.from("users").select("role").eq("id", authUserId).single();
  if (caller?.role !== "admin") return err("Only admin can delete roles", 403);

  const svc = createServiceClient();

  // Get the role name before deleting
  const { data: role } = await svc.from("custom_roles").select("name").eq("id", id).eq("org_id", orgId).maybeSingle();
  if (!role) return err("Role not found", 404);

  // Delete the role
  const { error } = await svc.from("custom_roles").delete().eq("id", id);
  if (error) return err(error.message, 500);

  // Also delete its permissions
  await svc.from("role_permissions").delete().eq("org_id", orgId).eq("role", role.name.toLowerCase());

  return ok(null);
});
