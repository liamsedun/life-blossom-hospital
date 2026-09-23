import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Creates an SSR-compatible Supabase client that reads/writes session cookies.
 *
 * @param response - Optional NextResponse. When provided, Set-Cookie headers
 *   are propagated to it so the browser actually receives them. In Next.js 16
 *   Route Handlers, `cookies().set()` alone does NOT add headers to the HTTP
 *   response — you must also call `response.cookies.set()`.
 */
export async function createClient(response?: NextResponse) {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
          if (response) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          }
        },
      },
    }
  );
}

export function createServiceClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "[supabase] SUPABASE_SERVICE_ROLE_KEY is not set. " +
      "Service-role features (audit logging, lockout) are disabled."
    );
  }
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
