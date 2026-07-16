import { createHash } from "crypto";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { Enums, Json } from "@/types/database.types";

type Admin = ReturnType<typeof createAdminClient>;

export interface NotificationOncePayload {
  userId: string | null;
  communityId: string;
  type: Enums<"NotificationType">;
  title: string;
  body: string;
  link: string;
  dedupeKey: string;
  data?: Record<string, unknown> | null;
}

function notificationId(dedupeKey: string) {
  return `notification-${createHash("sha256").update(dedupeKey).digest("hex")}`;
}

// The stable primary key makes retries of a scheduler or webhook idempotent.
export async function createNotificationOnce(admin: Admin, payload: NotificationOncePayload): Promise<boolean> {
  const { error } = await admin.from("Notification").insert({
    id: notificationId(payload.dedupeKey),
    userId: payload.userId,
    communityId: payload.communityId,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    link: payload.link,
    data: { ...(payload.data ?? {}), dedupeKey: payload.dedupeKey } as Json,
  });

  if (!error) return true;
  if (error.code === "23505") return false;
  throw new Error(`Impossible de creer la notification: ${error.message}`);
}
