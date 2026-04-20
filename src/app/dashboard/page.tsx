import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { addDays, startOfDay, endOfDay } from "date-fns";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;

  // Chargement parallèle des données dashboard
  const [
    upcomingEvents,
    pendingPublications,
    recentDrafts,
    stats,
    notifications,
  ] = await Promise.all([
    // Prochains événements (7 jours)
    prisma.event.findMany({
      where: {
        communityId,
        startDate: { gte: new Date(), lte: addDays(new Date(), 7) },
        status: { not: "ARCHIVED" },
      },
      orderBy: { startDate: "asc" },
      take: 5,
    }),

    // Publications en attente
    prisma.publication.findMany({
      where: {
        communityId,
        status: { in: ["PENDING", "SCHEDULED", "FAILED"] },
      },
      orderBy: { scheduledAt: "asc" },
      take: 8,
      include: {
        channel: { select: { type: true, name: true } },
        event: { select: { title: true } },
      },
    }),

    // Brouillons récents
    prisma.contentDraft.findMany({
      where: {
        communityId,
        status: { in: ["DRAFT", "AI_PROPOSAL", "READY_TO_PUBLISH"] },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { event: { select: { title: true, category: true } } },
    }),

    // Stats globales
    Promise.all([
      prisma.event.count({ where: { communityId } }),
      prisma.publication.count({ where: { communityId, status: "PUBLISHED" } }),
      prisma.contentDraft.count({ where: { communityId } }),
      prisma.automation.count({ where: { communityId, isActive: true } }),
    ]).then(([events, published, drafts, automations]) => ({
      events, published, drafts, automations,
    })),

    // Notifications non lues récentes
    prisma.notification.findMany({
      where: { userId: profile.id, isRead: false },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  // Récupérer les infos communauté pour l'assistant IA
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: {
      name: true,
      tone: true,
      hashtags: true,
      channels: { select: { type: true, isConnected: true } },
      plan: true,
    },
  });

  return (
    <DashboardClient
      userName={profile.name ?? ""}
      community={community!}
      upcomingEvents={upcomingEvents}
      pendingPublications={pendingPublications}
      recentDrafts={recentDrafts}
      stats={stats}
      notifications={notifications}
    />
  );
}
