// Helpers client pour les notifications push web.
// Aucune UI : juste la logique d'enregistrement du service worker et de l'abonnement.

export type PushEnableResult =
  | { ok: true }
  | {
      ok: false;
      reason: "unsupported" | "missing-vapid-key" | "permission-denied" | "push-unavailable" | "subscribe-failed" | "test-failed" | "network-error";
      message?: string;
    };

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getPushPermission(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

function isPushServiceUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return error instanceof DOMException && error.name === "AbortError" || /push service not available/i.test(message);
}

export async function enablePushNotificationsDetailed(): Promise<PushEnableResult> {
  if (!isPushSupported()) return { ok: false, reason: "unsupported" };
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    console.warn("[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY absente.");
    return { ok: false, reason: "missing-vapid-key" };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, reason: "permission-denied" };

    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });
    }

    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: subscription.toJSON(), userAgent: navigator.userAgent }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      return { ok: false, reason: "subscribe-failed", message: data.error };
    }

    const testRes = await fetch("/api/push/test", { method: "POST" });
    if (!testRes.ok) {
      const data = await testRes.json().catch(() => ({})) as { error?: string };
      return { ok: false, reason: "test-failed", message: data.error };
    }

    return { ok: true };
  } catch (error) {
    if (isPushServiceUnavailable(error)) {
      return {
        ok: false,
        reason: "push-unavailable",
        message: "Les notifications push ne sont pas disponibles dans ce navigateur pour le moment.",
      };
    }
    return { ok: false, reason: "network-error", message: error instanceof Error ? error.message : undefined };
  }
}

export async function enablePushNotifications(): Promise<boolean> {
  return (await enablePushNotificationsDetailed()).ok;
}

export async function ensurePushRegistered(): Promise<void> {
  if (!isPushSupported() || Notification.permission !== "granted") return;
  try {
    // Do not create a new registration during page load. Some browsers expose PushManager
    // but have no push service; registration is reserved for the explicit user action.
    const registration = await navigator.serviceWorker.getRegistration("/sw.js");
    if (!registration) return;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON(), userAgent: navigator.userAgent }),
      });
    }
  } catch {
    // Silencieux: cette routine ne doit pas bloquer l'ouverture de l'app.
  }
}
