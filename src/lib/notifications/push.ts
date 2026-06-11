import webpush from "web-push";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

let vapidConfigured = false;

function ensureVapid(): boolean {
  if (vapidConfigured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:noreply@yad-ia.com";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

interface StoredSubscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Envoie une notification push à tous les abonnements d'un utilisateur.
// Nettoie automatiquement les abonnements expirés (404/410).
export async function sendPushToUser(
  admin: Admin,
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  if (!ensureVapid()) {
    console.warn("[Push] Clés VAPID absentes — push ignoré.");
    return { sent: 0, failed: 0 };
  }

  const { data: subs } = await admin
    .from("PushSubscription")
    .select("id, endpoint, p256dh, auth")
    .eq("userId", userId);

  const subscriptions = (subs ?? []) as StoredSubscription[];
  if (subscriptions.length === 0) return { sent: 0, failed: 0 };

  const body = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;
  const staleIds: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
        sent++;
      } catch (error) {
        failed++;
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          staleIds.push(sub.id);
        } else {
          console.error("[Push] Échec d'envoi:", (error as Error).message);
        }
      }
    })
  );

  if (staleIds.length > 0) {
    await admin.from("PushSubscription").delete().in("id", staleIds);
  }

  return { sent, failed };
}
