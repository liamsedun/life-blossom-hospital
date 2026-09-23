import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAuth } from "@/lib/audit";

/**
 * POST /api/auth/logout
 *
 * Ends the Supabase session (clears cookies) and records a logout event
 * in the audit trail. Safe to call even when already signed out.
 */
export async function POST(req: NextRequest) {
  try {
    const cookieCollector = NextResponse.json({});
    const supabase = await createClient(cookieCollector);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await logAuth(req, user.id, "logout");
    }

    await supabase.auth.signOut();
    const response = NextResponse.json({ success: true });
    for (const cookie of cookieCollector.headers.getSetCookie()) {
      response.headers.append("Set-Cookie", cookie);
    }
    return response;
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
