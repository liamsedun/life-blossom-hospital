import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api-utils";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DEFAULT_ORG_ID = "00000000-0000-4000-8000-000000000001";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("landing_doctors")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) return err(error.message, 500);
    return ok(data);
  } catch (e: any) {
    console.error("[Landing Doctors GET]", e);
    return err("Internal server error", 500);
  }
}

export const POST = withAuth(async (req, supabase, authUserId) => {
  const body = await parseBody<{
    name: string;
    specialty: string;
    bio?: string;
    qualifications?: string;
    photo_url?: string;
    experience_years?: number;
    is_featured?: boolean;
    sort_order?: number;
  }>(req);

  const name = body.name?.trim();
  if (!name) return err("Name is required", 400);
  if (!body.specialty?.trim()) return err("Specialty is required", 400);

  // Get org_id from the authenticated user
  const { data: userData } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", authUserId)
    .single();

  const orgId = userData?.org_id || DEFAULT_ORG_ID;

  const { data, error } = await supabase
    .from("landing_doctors")
    .insert({
      org_id: orgId,
      name,
      specialty: body.specialty.trim(),
      bio: body.bio || null,
      qualifications: body.qualifications || null,
      photo_url: body.photo_url || null,
      experience_years: body.experience_years || null,
      is_featured: body.is_featured ?? false,
      sort_order: body.sort_order ?? 0,
      is_active: true,
    })
    .select()
    .single();

  if (error) return err(error.message, 500);
  return ok(data, 201);
});
