import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const cookieCollector = NextResponse.json({});
    const supabase = await createClient(cookieCollector);
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const { oldPassword, newPassword } = await req.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ success: false, error: "Both old and new passwords are required" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ success: false, error: "New password must be at least 6 characters" }, { status: 400 });
    }

    // Verify old password by attempting to sign in
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: authUser.email!,
      password: oldPassword,
    });

    if (verifyError) {
      return NextResponse.json({ success: false, error: "Current password is incorrect" }, { status: 401 });
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    const response = NextResponse.json({ success: true, data: { message: "Password changed successfully" } });
    for (const cookie of cookieCollector.headers.getSetCookie()) {
      response.headers.append("Set-Cookie", cookie);
    }
    return response;
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
