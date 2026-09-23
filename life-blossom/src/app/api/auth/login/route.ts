import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { checkLoginLockout, recordLoginFailure, logAuth } from "@/lib/audit";

/**
 * POST /api/auth/login
 *
 * Authenticates via Supabase Auth and returns the user profile.
 * Cookies are set automatically by the SSR client so subsequent
 * server-side requests carry the session.
 *
 * Accepts:
 *   { loginType: "email", email: string, password: string }
 *   { loginType: "phone", phone: string, password: string }
 *   { loginType: "patient_id", patientId: string, password: string }
 *
 * Rules:
 *   - Patients & dependants may log in with their EMAIL, PHONE NUMBER or
 *     PATIENT/DEPENDANT ID (PT-xxxx / DEP-xxxx) + password.
 *   - Admins/staff may ONLY log in with their registered email + password.
 *   - Phone / patient-id logins resolve the account through the public
 *     profile tables, then authenticate via the linked auth email
 *     (auth.users has no phone populated for portal-created accounts).
 *
 * Security: failed attempts are recorded in security_events; after 5
 * failures for the same identifier + IP within 15 minutes the account is
 * temporarily locked (HTTP 429).
 */
export async function POST(req: NextRequest) {
  // Create a cookie collector so session cookies are propagated to the
  // HTTP response. In Next.js 16, cookies().set() alone does NOT add
  // Set-Cookie headers — we must also write them to a NextResponse.
  const cookieCollector = NextResponse.json({});

  try {
    const body = await req.json();
    const { loginType, password } = body;

    const identifier =
      loginType === "email" ? (body.email || "").toLowerCase()
      : loginType === "phone" ? normalizePhone(body.phone || "")
      : (body.patientId || "");

    if (!loginType || !password || !identifier) {
      return NextResponse.json({ success: false, error: "Missing credentials" }, { status: 400 });
    }

    // Brute-force lockout: 5+ failures for this identifier+IP in 15 min
    if (await checkLoginLockout(req, identifier)) {
      await recordLoginFailure(req, identifier, "blocked by temporary lockout");
      return NextResponse.json(
        { success: false, error: "Too many failed login attempts. Please try again in 15 minutes." },
        { status: 429 }
      );
    }

    // Use the SSR-compatible server client so session cookies are written
    const supabase = await createClient(cookieCollector);

    const fail = async (message: string, status = 401) => {
      await recordLoginFailure(req, identifier, message);
      return propagateCookies(cookieCollector, NextResponse.json({ success: false, error: message }, { status }));
    };

    let authEmail: string | undefined;

    if (loginType === "email") {
      // Email works for everyone (patients, dependants and staff)
      authEmail = identifier;
    } //
    else if (loginType === "phone" || loginType === "patient_id") {
      // Resolve the account through the profile tables first
      const account = await resolvePatientAccount(loginType, body);
      if (account.error) return await fail(account.error, account.status);
      if (!account.email) return await fail("No email found for this account", 400);

      // Staff may only log in with their registered email
      if (account.role && STAFF_ROLES.includes(account.role)) {
        return await fail("Staff must log in with their registered email address", 403);
      }
      if (account.is_active === false) {
        return await fail("This account has been deactivated. Contact the hospital.", 403);
      }

      authEmail = account.email;
    } //
    else {
      return NextResponse.json({ success: false, error: "Invalid login type" }, { status: 400 });
    }

    if (!authEmail) {
      return NextResponse.json({ success: false, error: "Could not resolve login email" }, { status: 400 });
    }

    const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password });
    if (error) return await fail(error.message);

    // Session is now in cookies. Fetch the full profile.
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return propagateCookies(cookieCollector, NextResponse.json({ success: false, error: "Authentication succeeded but no user found" }, { status: 500 }));
    }

    // Query the public.users table through RLS.
    // MUST filter by id to guarantee we get the right row, not
    // just the first user in the org.
    const { data: rawProfile } = await supabase
      .from("users")
      .select("id, org_id, email, role, full_name, first_name, last_name, phone, is_active, last_login_at, metadata, created_at, updated_at, organization:organizations(id, name, logo_url)")
      .eq("id", authUser.id)
      .single();

    // Map full_name → first_name/last_name to match the User interface
    const profile = rawProfile ? {
      ...rawProfile,
      first_name: rawProfile.first_name || rawProfile.full_name?.split(" ")[0] || "",
      last_name: rawProfile.last_name || rawProfile.full_name?.split(" ").slice(1).join(" ") || "",
      avatar_url: rawProfile.metadata?.avatar_url || null,
    } : null;

    if (!profile) {
      // Auto-create profile from auth metadata if missing.
      // This handles accounts created in Supabase Auth but not yet in public.users.
      const meta = authUser.user_metadata || {};
      const appMeta = authUser.app_metadata || {};
      const role = (meta.role as string) || (appMeta.role as string) || "admin";
      const fullName = (meta.full_name as string) || (meta.first_name as string) || authUser.email?.split("@")[0] || "Admin";

      // Try to get the default org
      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (!org) {
        return propagateCookies(cookieCollector, NextResponse.json(
          { success: false, error: "No active organization found. Contact the hospital admin." },
          { status: 404 },
        ));
      }

      const { data: newProfile, error: insertError } = await supabase
        .from("users")
        .insert({
          id: authUser.id,
          org_id: org.id,
          email: authUser.email || "",
          role,
          full_name: fullName,
          first_name: (meta.first_name as string) || fullName.split(" ")[0] || "",
          last_name: (meta.last_name as string) || fullName.split(" ").slice(1).join(" ") || "",
          phone: authUser.phone || meta.phone || null,
          is_active: true,
        })
        .select("id, org_id, email, role, full_name, first_name, last_name, phone, is_active, last_login_at, metadata, created_at, updated_at, organization:organizations(*)")
        .single();

      if (insertError) {
        return propagateCookies(cookieCollector, NextResponse.json(
          { success: false, error: `Profile not found and could not auto-create: ${insertError.message}. Contact the hospital admin.` },
          { status: 404 },
        ));
      }

      // Map full_name → first_name/last_name to match the User interface
      const mappedProfile = {
        ...newProfile,
        first_name: newProfile.first_name || newProfile.full_name?.split(" ")[0] || "",
        last_name: newProfile.last_name || newProfile.full_name?.split(" ").slice(1).join(" ") || "",
        avatar_url: newProfile.metadata?.avatar_url || null,
      };

      logAuth(req, authUser.id, "login").catch(() => {});
      return propagateCookies(cookieCollector, NextResponse.json({ success: true, data: { user: mappedProfile, session: true } }));
    }

    logAuth(req, authUser.id, "login").catch(() => {});

    return propagateCookies(cookieCollector, NextResponse.json({ success: true, data: { user: profile, session: true } }));
  } catch (err) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

const STAFF_ROLES = ["admin", "accountant", "doctor", "nurse", "cashier", "receptionist", "lab_technician", "pharmacist", "radiographer", "radiologist"];

/** Copy Set-Cookie headers from a cookie collector to the actual response. */
function propagateCookies(collector: NextResponse, response: NextResponse): NextResponse {
  for (const cookie of collector.headers.getSetCookie()) {
    response.headers.append("Set-Cookie", cookie);
  }
  return response;
}

/** Keep digits only, e.g. "+234 801 234 5678" → "2348012345678". */
function normalizePhone(input: string): string {
  return (input || "").replace(/\D/g, "");
}

/**
 * Resolve the patient/dependant account for phone or patient-id login.
 * Returns the linked auth email + role + active state (or an error).
 */
async function resolvePatientAccount(
  loginType: string,
  body: Record<string, any>
): Promise<{ email?: string; role?: string; is_active?: boolean; error?: string; status?: number }> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: "Phone/ID login requires server configuration. Use email login.", status: 503 };
  }
  const svc = createServiceClient();

  if (loginType === "phone") {
    const digits = normalizePhone(body.phone || "");
    if (!digits) return { error: "Phone number is required", status: 400 };

    // Match on the last 10 digits so "+2348012345678" / "08012345678"
    // / "8012345678" all resolve to the same account.
    const suffix = digits.slice(-10);

    const { data: users, error } = await svc
      .from("users")
      .select("id, email, role, phone, is_active")
      .eq("role", "patient")
      .ilike("phone", `%${suffix}%`);

    if (error) return { error: error.message, status: 500 };

    // Exact-normalized match (handles multiple rows sharing the suffix)
    const match = (users || []).find((u: any) => u.phone && normalizePhone(u.phone).slice(-10) === suffix);
    if (!match) return { error: "No patient account found with this phone number", status: 404 };
    return { email: match.email, role: match.role, is_active: match.is_active };
  }

  // patient_id login: PT-0001 or DEP-0001 (case-insensitive)
  const patientId: string = body.patientId || "";
  const { data: patients, error: patientError } = await svc
    .from("patients")
    .select("user_id, patient_number")
    .ilike("patient_number", patientId);

  if (patientError) return { error: patientError.message, status: 500 };
  if (!Array.isArray(patients) || patients.length === 0) {
    return { error: "Patient ID not found", status: 404 };
  }

  const userId = patients[0].user_id;
  const { data: user } = await svc
    .from("users")
    .select("id, email, role, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (!user) return { error: "No email found for this patient", status: 400 };
  return { email: user.email, role: user.role, is_active: user.is_active };
}
