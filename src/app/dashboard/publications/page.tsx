import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PublicationsClient } from "@/components/publications/publications-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Publications — Yad.ia" };

export default async function PublicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; channel?: string }>;
}) {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const params = await searchParams;

  const where: Record<string, unknown> = { communityId };
  if (params.status) where.status = params.status;
  if (params.channel) where.channelType = params.channel;

  const [publications, stats] = await Promise.all([
    prisma.publication.findMany({
      where,
      orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
      take: 100,
      include: {
        channel: { select: { type: true, name: true } },
        event: { select: { title: true, category: true } },
        draft: { select: { title: true, body: true } },
      },
    }),
    prisma.publication.groupBy({
      by: ["status"],
      where: { communityId },
      _count: true,
    }),
  ]);

  const statsByStatus = Object.fromEntries(stats.map((s) => [s.status, s._count]));

  return (
    <PublicationsClient
      publications={publications as Parameters<typeof PublicationsClient>[0]["publications"]}
      statsByStatus={statsByStatus}
      activeStatus={params.status}
      activeChannel={params.channel}
    />
  );
}
