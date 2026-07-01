import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { GmbNotificationBadge } from "@/components/layout/gmb-notification-badge";
import { ensureTodayEventReminderNotifications } from "@/lib/notifications/event-reminders";
import { headers } from "next/headers";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { template: "%s — EasyCom IA", default: "Dashboard — EasyCom IA" },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireAuth();
  const pathname = (await headers()).get("x-current-pathname") ?? "";
  const isSettingsPath = pathname.startsWith("/dashboard/settings");

  if (!profile.communityId) {
    redirect("/onboarding");
  }

  const admin = createAdminClient();

  const { data: community } = await admin
    .from("Community")
    .select("id, name, logoUrl, plan, onboardingDone, timezone, communityType, channels:Channel(type, isConnected)")
    .eq("id", profile.communityId)
    .single();

  if (!community) {
    redirect("/onboarding");
  }

  if (!community.onboardingDone && !isSettingsPath) {
    redirect("/onboarding");
  }

  await ensureTodayEventReminderNotifications(admin, {
    userId: profile.id,
    communityId: profile.communityId,
    timezone: community.timezone,
  });

  const { count: unreadCount } = await admin
    .from("Notification")
    .select("*", { count: "exact", head: true })
    .eq("userId", profile.id)
    .eq("isRead", false);

  return (
    <div className="flex h-dvh bg-slate-50 overflow-hidden">
      <Sidebar
        community={community}
        userAvatar={profile.avatarUrl}
        userName={profile.name ?? profile.email}
        unreadNotifications={unreadCount ?? 0}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          communityName={community.name}
          communityType={community.communityType}
          userAvatar={profile.avatarUrl}
          userName={profile.name ?? ""}
          unreadNotifications={unreadCount ?? 0}
        />
        <GmbNotificationBadge />
        <main className="flex-1 overflow-y-auto w-full animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
