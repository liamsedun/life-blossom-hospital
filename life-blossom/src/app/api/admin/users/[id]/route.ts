import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api-utils";

export const GET = withAuth(async (req, supabase, authUserId, context) => {
  const { id } = await context.params;

  const { data: caller } = await supabase
    .from("users")
    .select("role, org_id")
    .eq("id", authUserId)
    .single();

  if (!caller || caller.role !== "admin") {
    return err("Not authorized", 403);
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, org_id, email, role, full_name, phone, is_active, metadata, created_at, updated_at")
    .eq("id", id)
    .single();

  if (error || !data) return err("User not found", 404);
  if (data.org_id !== caller.org_id) return err("Cannot view users outside your org", 403);

  return ok({
    ...data,
    first_name: data.full_name?.split(" ")[0] || "",
    last_name: data.full_name?.split(" ").slice(1).join(" ") || "",
    avatar_url: data.metadata?.avatar_url || null,
  });
});

export const PUT = withAuth(async (req, supabase, authUserId, context) => {
  const { id } = await context.params;

  const { data: caller } = await supabase
    .from("users")
    .select("role, org_id")
    .eq("id", authUserId)
    .single();

  if (!caller || caller.role !== "admin") {
    return err("Not authorized", 403);
  }

  const { data: target } = await supabase
    .from("users")
    .select("id, role, org_id")
    .eq("id", id)
    .single();

  if (!target) return err("User not found", 404);
  if (target.org_id !== caller.org_id) return err("Cannot modify users outside your org", 403);
  if (target.role === "admin" && caller.role !== "admin") {
    return err("Only admin can modify another admin", 403);
  }

  const body = await parseBody<{
    first_name?: string;
    last_name?: string;
    phone?: string | null;
    email?: string;
    role?: string;
    is_active?: boolean;
  }>(req);

  const updates: Record<string, any> = {};

  // Map first_name/last_name → full_name
  if (body.first_name !== undefined || body.last_name !== undefined) {
    const first = (body.first_name || "").trim();
    const last = (body.last_name || "").trim();
    updates.full_name = `${first} ${last}`.trim();
  }

  if (body.phone !== undefined) updates.phone = body.phone || null;
  if (body.email !== undefined) updates.email = body.email.trim();
  if (body.role !== undefined) updates.role = body.role;
  if (body.is_active !== undefined) updates.is_active = body.is_active;

  if (Object.keys(updates).length === 0) return err("No fields to update", 400);

  updates.updated_at = new Date().toISOString();

  const { error } = await supabase.from("users").update(updates).eq("id", id);
  if (error) return err(error.message, 500);
  return ok({ updated: true });
});

export const DELETE = withAuth(async (req, supabase, authUserId, context) => {
  const { id } = await context.params;

  const { data: caller } = await supabase
    .from("users")
    .select("role, org_id")
    .eq("id", authUserId)
    .single();

  if (!caller || caller.role !== "admin") {
    return err("Not authorized", 403);
  }

  const { data: target } = await supabase
    .from("users")
    .select("id, role, org_id")
    .eq("id", id)
    .single();

  if (!target) return err("User not found", 404);
  if (target.org_id !== caller.org_id) return err("Cannot modify users outside your org", 403);
  if (target.role === "admin" && caller.role !== "admin") {
    return err("Only admin can deactivate another admin", 403);
  }

  const { error } = await supabase.from("users").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return err(error.message, 500);
  return ok({ deleted: true });
});
