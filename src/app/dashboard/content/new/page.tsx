import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ContentNewClient } from "@/components/content/content-new-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Nouveau contenu — Yad.ia" };

export default async function ContentNewPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; eventId?: string; ai?: string }>;
}) {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const params = await searchParams;

  const [events, community] = await Promise.all([
    prisma.event.findMany({
      where: {
        communityId,
        status: { not: "ARCHIVED" },
        startDate: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { startDate: "asc" },
      select: { id: true, title: true, startDate: true, category: true, description: true },
      take: 30,
    }),
    prisma.community.findUnique({
      where: { id: communityId },
      select: {
        name: true,
        tone: true,
        hashtags: true,
        signature: true,
        editorialRules: true,
        channels: { select: { type: true, isConnected: true, isActive: true } },
      },
    }),
  ]);

  return (
    <ContentNewClient
      communityId={communityId}
      events={events as Array<{ id: string; title: string; startDate: Date; category: string; description: string | null }>}
      community={community!}
      defaultType={params.type}
      defaultEventId={params.eventId}
      aiMode={params.ai === "true"}
    />
  );
}
