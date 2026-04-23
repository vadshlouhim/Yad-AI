import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { template: "%s — Yad.ia", default: "Dashboard — Yad.ia" },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireAuth();

  if (!profile.communityId) {
    redirect("/onboarding");
  }

  const admin = createAdminClient();

  const { data: community } = await admin
    .from("Community")
    .select("id, name, logoUrl, plan, onboardingDone, channels:Channel(type, isConnected)")
    .eq("id", profile.communityId)
    .single();

  if (!community || !community.onboardingDone) {
    redirect("/onboarding");
  }

  const { count: unreadCount } = await admin
    .from("Notification")
    .select("*", { count: "exact", head: true })
    .eq("userId", profile.id)
    .eq("isRead", false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar
        community={community}
        userAvatar={profile.avatarUrl}
        userName={profile.name ?? profile.email}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          communityName={community.name}
          userAvatar={profile.avatarUrl}
          userName={profile.name ?? ""}
          unreadNotifications={unreadCount ?? 0}
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
