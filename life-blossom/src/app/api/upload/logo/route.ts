import { NextRequest, NextResponse } from "next/server";
import { withAuth, ok, err } from "@/lib/api-utils";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB

// POST /api/upload/logo — upload hospital logo as base64 data URL
export const POST = withAuth(async (req, supabase, authUserId) => {
  try {
    const { data: caller } = await supabase.from("users").select("role").eq("id", authUserId).single();
    if (!caller || caller.role !== "admin") {
      return err("Only admins can upload logos", 403);
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return err("No file provided", 400);

    if (file.size > MAX_SIZE) return err("File too large (max 2MB)", 400);
    if (!file.type.startsWith("image/")) return err("File must be an image", 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    return ok({ url: dataUrl });
  } catch (e: any) {
    return err(e.message, 500);
  }
});
