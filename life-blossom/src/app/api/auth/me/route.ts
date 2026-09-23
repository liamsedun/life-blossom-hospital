import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/auth/me
 *
 * Returns the authenticated user's profile from the public.users table.
 * Uses the SSR server client → session from cookies → anon key.
 * RLS policies restrict access to the current user's own record.
 *
 * Returns 401 if no valid session. Never uses the service role key.
 */
export async function GET() {
  try {
    const cookieCollector = NextResponse.json({});
    const supabase = await createClient(cookieCollector);

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    // Use service client for profile query — middleware already validated the session.
    // This avoids token-rotation issues where the route handler reads old cookies.
    const svc = createServiceClient();
    const { data: rawProfile, error: profileError } = await svc
      .from("users")
      .select("id, org_id, email, role, full_name, first_name, last_name, phone, is_active, last_login_at, metadata, created_at, updated_at, organization:organizations(id, name, logo_url)")
      .eq("id", authUser.id)
      .single();

    if (profileError || !rawProfile) {
      return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 });
    }

    const profile = {
      ...rawProfile,
      first_name: rawProfile.first_name || rawProfile.full_name?.split(" ")[0] || "",
      last_name: rawProfile.last_name || rawProfile.full_name?.split(" ").slice(1).join(" ") || "",
      avatar_url: rawProfile.metadata?.avatar_url || null,
    };

    // For patients, attach the family/account info — use service client
    let patient: { id: string; patient_number: string; is_primary_account: boolean; primary_account_id: string | null; is_dependant: boolean } | null = null;
    if (profile.role === "patient") {
      const { data: patientRow } = await svc
        .from("patients")
        .select("id, patient_number, is_primary_account, primary_account_id")
        .eq("user_id", profile.id)
        .maybeSingle();
      if (patientRow) {
        patient = {
          id: patientRow.id,
          patient_number: patientRow.patient_number,
          is_primary_account: Boolean(patientRow.is_primary_account),
          primary_account_id: patientRow.primary_account_id || null,
          is_dependant: Boolean(patientRow.primary_account_id),
        };
      }
    }

    const response = NextResponse.json({ success: true, data: { ...profile, patient } });
    for (const cookie of cookieCollector.headers.getSetCookie()) {
      response.headers.append("Set-Cookie", cookie);
    }
    return response;
  } catch (err) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
