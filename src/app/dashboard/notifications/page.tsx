import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NotificationsClient } from "@/components/notifications/notifications-client";
import { ensureTodayEventReminderNotifications } from "@/lib/notifications/event-reminders";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Notifications — EasyCom IA" };

export default async function NotificationsPage() {
  const { profile } = await requireAuth();
  const admin = createAdminClient();

  if (profile.communityId) {
    const { data: community } = await admin
      .from("Community")
      .select("timezone")
      .eq("id", profile.communityId)
      .single();

    await ensureTodayEventReminderNotifications(admin, {
      userId: profile.id,
      communityId: profile.communityId,
      timezone: community?.timezone,
    });
  }

  const { data: notifications } = await admin
    .from("Notification")
    .select("*")
    .eq("userId", profile.id)
    .order("createdAt", { ascending: false })
    .limit(50);

  return (
    <div className="container max-w-6xl mx-auto py-6 px-4 sm:px-6">
      <NotificationsClient notifications={notifications ?? []} />
    </div>
  );
}
