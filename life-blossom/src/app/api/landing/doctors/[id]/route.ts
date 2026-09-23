import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api-utils";

export const PUT = withAuth(async (req, supabase, authUserId, context) => {
  const { id } = await context.params;

  const body = await parseBody<{
    name?: string;
    specialty?: string;
    bio?: string;
    qualifications?: string;
    photo_url?: string;
    experience_years?: number;
    is_featured?: boolean;
    sort_order?: number;
    is_active?: boolean;
  }>(req);

  const updates: Record<string, any> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.specialty !== undefined) updates.specialty = body.specialty.trim();
  if (body.bio !== undefined) updates.bio = body.bio;
  if (body.qualifications !== undefined) updates.qualifications = body.qualifications;
  if (body.photo_url !== undefined) updates.photo_url = body.photo_url;
  if (body.experience_years !== undefined) updates.experience_years = body.experience_years;
  if (body.is_featured !== undefined) updates.is_featured = body.is_featured;
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order;
  if (body.is_active !== undefined) updates.is_active = body.is_active;

  if (Object.keys(updates).length === 0) return err("No fields to update", 400);

  const { data, error } = await supabase
    .from("landing_doctors")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return err(error.message, 500);
  return ok(data);
});

export const DELETE = withAuth(async (req, supabase, authUserId, context) => {
  const { id } = await context.params;

  const { error } = await supabase
    .from("landing_doctors")
    .delete()
    .eq("id", id);

  if (error) return err(error.message, 500);
  return ok({ deleted: true });
});
