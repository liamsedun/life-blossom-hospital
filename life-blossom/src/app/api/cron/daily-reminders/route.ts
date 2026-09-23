import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { notifyUsers, sendInternalMessage } from "@/lib/notify";

/**
 * GET /api/cron/daily-reminders?secret=...
 *
 * Designed to be called once daily (Vercel cron, external scheduler, etc.).
 * Sends reminder notifications for all upcoming appointments (scheduled / confirmed / in_progress)
 * whose scheduled_at is within the next 24 hours.
 *
 * Uses a simple shared-secret check so unauthenticated browsers cannot trigger it.
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const svc = createServiceClient();
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Find all upcoming appointments within the next 24 hours
  const { data: appointments, error } = await svc
    .from("appointments")
    .select("id, org_id, patient_id, doctor_id, scheduled_at, status")
    .in("status", ["scheduled", "confirmed", "in_progress"])
    .gte("scheduled_at", now.toISOString())
    .lte("scheduled_at", tomorrow.toISOString());

  if (error) {
    console.error("[Cron] daily-reminders query error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  if (!appointments || appointments.length === 0) {
    return NextResponse.json({ success: true, sent: 0, message: "No upcoming appointments" });
  }

  let sent = 0;

  for (const apt of appointments) {
    try {
      const dateStr = new Date(apt.scheduled_at).toLocaleDateString("en-GB", {
        day: "numeric", month: "short", year: "numeric",
      });
      const timeStr = apt.scheduled_at.slice(11, 16);

      // Resolve patient user_id + main account holder
      const { data: pat } = await svc
        .from("patients").select("user_id, primary_account_id").eq("id", apt.patient_id).maybeSingle();

      const recipientUserIds: string[] = [];
      if (pat?.user_id) recipientUserIds.push(pat.user_id);
      if (pat?.primary_account_id) {
        const { data: mainP } = await svc
          .from("patients").select("user_id").eq("id", pat.primary_account_id).maybeSingle();
        if (mainP?.user_id) recipientUserIds.push(mainP.user_id);
      }

      // Resolve doctor/staff user_id
      if (apt.doctor_id) {
        const { data: doc } = await svc
          .from("staff").select("user_id").eq("id", apt.doctor_id).maybeSingle();
        if (doc?.user_id) recipientUserIds.push(doc.user_id);
      }

      const uniqueIds = [...new Set(recipientUserIds)];
      if (!uniqueIds.length) continue;

      const statusLabel = apt.status === "confirmed" ? "confirmed" : apt.status === "in_progress" ? "in progress" : "upcoming";

      await notifyUsers(svc, {
        orgId: apt.org_id,
        userIds: uniqueIds,
        type: "appointment_reminder",
        title: "Appointment Reminder",
        message: `Your ${statusLabel} appointment is tomorrow at ${timeStr} on ${dateStr}. Please ensure you attend.`,
        url: "/patient/appointments",
      });

      await sendInternalMessage(svc, {
        orgId: apt.org_id,
        senderId: uniqueIds[0], // system-as-patient for the sender
        recipientUserIds: uniqueIds,
        subject: `Appointment Reminder — ${dateStr} at ${timeStr}`,
        body: `This is a reminder that you have a ${statusLabel} appointment scheduled for ${dateStr} at ${timeStr}.\n\nPlease ensure you attend on time.`,
      });

      sent++;
    } catch (e) {
      console.error(`[Cron] daily-reminders error for apt ${apt.id}:`, e);
    }
  }

  return NextResponse.json({ success: true, sent, total: appointments.length });
}
