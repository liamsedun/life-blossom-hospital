import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("avatar") as File | null;
    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    // Convert file to base64 data URL for storage in metadata
    // (avoids needing Supabase Storage / service role key)
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = file.type || "image/png";
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Fetch current metadata
    const { data: current } = await supabase
      .from("users")
      .select("metadata")
      .eq("id", authUser.id)
      .single();

    const currentMeta = current?.metadata || {};

    // Update metadata with avatar data URL
    const { error: updateError } = await supabase
      .from("users")
      .update({
        metadata: { ...currentMeta, avatar_url: dataUrl },
        updated_at: new Date().toISOString(),
      })
      .eq("id", authUser.id);

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { avatar_url: dataUrl } });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
