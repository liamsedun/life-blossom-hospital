import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type Role = "patient" | "admin" | "doctor" | "nurse" | "accountant" | "cashier" | "receptionist" | "lab_technician" | "pharmacist" | "radiographer" | "radiologist";

const STAFF_ROLES: Role[] = ["admin", "doctor", "nurse", "accountant", "cashier", "receptionist", "lab_technician", "pharmacist", "radiographer", "radiologist"];

/** Routes that require authentication. */
const PROTECTED_ROUTES = [
  { prefix: "/patient", allowedRoles: ["patient" as Role] },
  { prefix: "/admin", allowedRoles: STAFF_ROLES },
];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const initialResponse = supabaseResponse;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Reuse the same response to avoid losing previously-set cookies
          if (supabaseResponse === initialResponse) {
            supabaseResponse = NextResponse.next({ request });
          }
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Find matching protected route
  const matchedRoute = PROTECTED_ROUTES.find((r) => pathname.startsWith(r.prefix));

  // Not authenticated → redirect to login
  if (matchedRoute && !authUser) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (authUser) {
    // Fetch the user's role from the public.users table.
    // MUST filter by authUser.id — otherwise RLS may return the
    // first row in the org, mis-identifying the current user.
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", authUser.id)
      .maybeSingle();

    const role = (profile?.role as Role | undefined) || null;

    // Check role-based access
    if (matchedRoute && role && !matchedRoute.allowedRoles.includes(role)) {
      // Redirect to the correct dashboard for their role
      const url = request.nextUrl.clone();
      if (role === "patient") {
        url.pathname = "/patient";
      } else {
        url.pathname = "/admin";
      }
      return NextResponse.redirect(url);
    }

    // Note: the login pages (/login and /staff-login) are intentionally NOT
    // protected — even logged-in users see the login form ("the gate") so
    // they can switch accounts. The role check above only guards the actual
    // portal routes (/patient and /admin).
  }

  return supabaseResponse;
}
