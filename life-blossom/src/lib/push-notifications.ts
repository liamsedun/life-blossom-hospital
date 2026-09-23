import webpush, { PushSubscription, SendResult } from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

// ─── VAPID Key Management ───────────────────────────────────────

/** Get or derive the VAPID public key from env, falling back to a built-in dev key. */
export function getVapidPublicKey(): string {
  return (
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    "BIGxpDWB6_y1vSx-0Elw6Kd8p9xGq3SLin2VQXFCNoLYcDdMGx7aqKQNvUUs8xrAeDAM3l3NqTvwyrR0Dcf7sOs"
  );
}

function ensureVapidConfigured(): void {
  const publicKey = getVapidPublicKey();
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const contact = process.env.VAPID_CONTACT || "mailto:notifications@lifeblossom.com";

  if (!privateKey) {
    console.warn("[Push Notifications] VAPID_PRIVATE_KEY not set — generating ephemeral keys.");
    const keys = webpush.generateVAPIDKeys();
    webpush.setVapidDetails(contact, keys.publicKey, keys.privateKey);
    console.warn("[Push Notifications] Ephemeral VAPID public key:", keys.publicKey);
    console.warn("[Push Notifications] Set VAPID_PRIVATE_KEY and NEXT_PUBLIC_VAPID_PUBLIC_KEY in .env.local for production use.");
    return;
  }

  webpush.setVapidDetails(contact, publicKey, privateKey);
}

// ─── Send ───────────────────────────────────────────────────────

/**
 * Push payload shape sent to the service worker (`public/sw.js`).
 *
 * Example (cURL — admin broadcast):
 *   curl -X POST https://<host>/api/notifications/send \
 *     -H "Authorization: Bearer <admin-session-cookie>" \
 *     -H "Content-Type: application/json" \
 *     -d '{
 *       "title": "New appointment confirmed",
 *       "body": "Dr. Adebayo confirmed your checkup for tomorrow 10:00 AM.",
 *       "url": "/patient/appointments",
 *       "id": "apt-1234",
 *       "tag": "appointment-confirmed",
 *       "requireInteraction": false,
 *       "actions": [
 *         { "action": "view", "title": "View" },
 *         { "action": "reschedule", "title": "Reschedule" }
 *       ]
 *     }'
 *
 * From server code:
 *   await sendPushNotifications(subscriptions, {
 *     title: "New message",
 *     body: "You have 1 unread message",
 *     url: "/patient/chats",
 *   });
 *
 * The SW shows the notification with `icon` / `badge` PNGs and opens
 * `data.url` on click.
 */
export interface PushPayload {
  title: string;
  body?: string;
  url?: string;
  id?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{ action: string; title: string }>;
}

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload
): Promise<SendResult> {
  ensureVapidConfigured();
  return webpush.sendNotification(subscription, JSON.stringify(payload));
}

export async function sendPushNotifications(
  subscriptions: PushSubscription[],
  payload: PushPayload
): Promise<Array<{ success: boolean; error?: string }>> {
  ensureVapidConfigured();
  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush
        .sendNotification(sub, JSON.stringify(payload))
        .then(() => ({ success: true as const }))
        .catch((err: any) => ({
          success: false as const,
          error: err.message || "Unknown error",
          subscription: sub,
        }))
    )
  );

  return results.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : { success: false, error: r.reason?.message || "Unknown error" }
  );
}

// ─── High-Level Helper: send by user ID ─────────────────────────

/**
 * Look up all push subscriptions for `userId` and send a notification to each.
 * Safe to call even if the user has no subscriptions (no-ops silently).
 *
 * Usage:
 *   await sendPushNotificationByUserId(svc, userId, {
 *     title: "Appointment Confirmed",
 *     body: "Your appointment on 23 Sep at 10:00 has been confirmed.",
 *     url: "/patient/appointments",
 *   });
 */
export async function sendPushNotificationByUserId(
  svc: SupabaseClient,
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  const { data: subs, error } = await svc
    .from("push_subscriptions")
    .select("subscription_json")
    .eq("user_id", userId);

  if (error || !subs || subs.length === 0) return { sent: 0, failed: 0 };

  const results = await sendPushNotifications(
    subs.map((s: { subscription_json: PushSubscription }) => s.subscription_json),
    payload
  );

  return {
    sent: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
  };
}
