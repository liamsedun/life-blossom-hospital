import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(req: NextRequest) {
  try {
    const cookieCollector = NextResponse.json({});
    const supabase = await createClient(cookieCollector);
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const updates: Record<string, any> = {};

    // Write directly to first_name, last_name, full_name columns
    if (body.first_name !== undefined || body.last_name !== undefined) {
      const first = (body.first_name || "").trim();
      const last = (body.last_name || "").trim();
      updates.first_name = first;
      updates.last_name = last;
      updates.full_name = `${first} ${last}`.trim();
    }

    if (body.phone !== undefined) updates.phone = body.phone || null;

    // Write avatar_url directly to the column (also keep in metadata for backward compat)
    if (body.avatar_url !== undefined) {
      updates.avatar_url = body.avatar_url || null;
      // Fetch current metadata
      const { data: current } = await supabase
        .from("users")
        .select("metadata")
        .eq("id", authUser.id)
        .single();
      const currentMeta = current?.metadata || {};
      updates.metadata = { ...currentMeta, avatar_url: body.avatar_url || null };
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", authUser.id)
      .select("id, org_id, email, role, first_name, last_name, avatar_url, phone, is_active, last_login_at, metadata, created_at, updated_at")
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const response = NextResponse.json({ success: true, data });
    for (const cookie of cookieCollector.headers.getSetCookie()) {
      response.headers.append("Set-Cookie", cookie);
    }
    return response;
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
