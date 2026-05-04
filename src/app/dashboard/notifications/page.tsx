import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NotificationsClient } from "@/components/notifications/notifications-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Notifications — Shalom IA" };

export default async function NotificationsPage() {
  const { profile } = await requireAuth();
  const admin = createAdminClient();

  const { data: notifications } = await admin
    .from("Notification")
    .select("*")
    .eq("userId", profile.id)
    .order("createdAt", { ascending: false })
    .limit(50);

  return <NotificationsClient notifications={notifications ?? []} />;
}
