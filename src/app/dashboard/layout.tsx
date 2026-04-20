import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  const community = await prisma.community.findUnique({
    where: { id: profile.communityId },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      plan: true,
      onboardingDone: true,
      channels: { select: { type: true, isConnected: true } },
    },
  });

  if (!community || !community.onboardingDone) {
    redirect("/onboarding");
  }

  // Compteur notifications non lues
  const unreadCount = await prisma.notification.count({
    where: { userId: profile.id, isRead: false },
  });

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar fixe */}
      <Sidebar
        community={community}
        userAvatar={profile.avatarUrl}
        userName={profile.name ?? profile.email}
      />

      {/* Zone principale */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          communityName={community.name}
          userAvatar={profile.avatarUrl}
          userName={profile.name ?? ""}
          unreadNotifications={unreadCount}
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
