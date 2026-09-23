import type { SupabaseClient } from "@supabase/supabase-js";
import { sendPushNotifications, type PushPayload } from "@/lib/push-notifications";

export interface NotifyInput {
  orgId: string;
  userIds: string[];
  type: string;
  title: string;
  message?: string;
  referenceType?: string;
  referenceId?: string;
  url?: string;
  tag?: string;
}

export interface InternalMessageInput {
  orgId: string;
  senderId: string;
  recipientUserIds: string[];
  subject: string;
  body: string;
}

/**
 * Resolve the user_id to notify for a given patient.
 * If the patient is a dependant (has primary_account_id), return the primary account holder's user_id.
 * If the patient is the primary, return their own user_id.
 * Returns null if no valid user_id is found.
 */
export async function resolveNotifyUserId(svc: SupabaseClient, patientId: string): Promise<string | null> {
  const { data: patient } = await svc
    .from("patients")
    .select("id, user_id, primary_account_id")
    .eq("id", patientId)
    .maybeSingle();
  if (!patient) return null;

  // If this patient is a dependant, notify the primary account holder instead
  if (patient.primary_account_id) {
    const { data: primary } = await svc
      .from("patients")
      .select("user_id")
      .eq("id", patient.primary_account_id)
      .maybeSingle();
    return primary?.user_id || patient.user_id;
  }

  return patient.user_id;
}

/**
 * Insert an in-app notification row per recipient + fire a best-effort web push.
 * Used for payment declarations (→ staff) and payment confirmations (→ patient + staff).
 */
export async function notifyUsers(svc: SupabaseClient, n: NotifyInput) {
  if (!n.userIds.length) {
    console.warn("[Notify] No userIds provided, skipping.");
    return;
  }
  console.log("[Notify] Sending notification to", n.userIds.length, "user(s):", n.userIds, "type:", n.type, "title:", n.title);
  for (const userId of n.userIds) {
    const { error } = await svc.from("notifications").insert({
      org_id: n.orgId,
      user_id: userId,
      type: n.type,
      title: n.title,
      body: n.message ?? null,
      link: n.url ?? null,
    });
    if (error) console.error("[Notify] insert error for user", userId, ":", error.message, error);
    else console.log("[Notify] notification inserted for user:", userId);
  }

  try {
    const { data: subs } = await svc
      .from("push_subscriptions")
      .select("user_id, subscription_json")
      .in("user_id", n.userIds);
    if (subs && subs.length > 0) {
      const payload: PushPayload = {
        title: n.title,
        body: n.message,
        url: n.url,
        tag: n.tag,
        requireInteraction: false,
      };
      await sendPushNotifications(subs.map((s: any) => s.subscription_json), payload);
    }
  } catch (e) {
    console.error("[Notify] web push error:", e);
  }
}

/**
 * Send an internal mail message from the system (Account) to one or more patients.
 * Creates the message row + recipient rows so it appears in their Inbox.
 */
export async function sendInternalMessage(svc: SupabaseClient, msg: InternalMessageInput) {
  if (!msg.recipientUserIds.length) return;
  const { data: message, error } = await svc
    .from("internal_messages")
    .insert({
      org_id: msg.orgId,
      sender_id: msg.senderId,
      subject: msg.subject,
      body: msg.body,
      is_broadcast: false,
    })
    .select("id")
    .single();
  if (error) {
    console.error("[InternalMail] message insert error:", error.message);
    return;
  }
  for (const userId of msg.recipientUserIds) {
    const { error: rcptErr } = await svc
      .from("internal_message_recipients")
      .insert({ message_id: message.id, recipient_id: userId });
    if (rcptErr) console.error("[InternalMail] recipient insert error:", rcptErr.message);
  }
}
