import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EventsClient } from "@/components/events/events-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Événements" };

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string; q?: string }>;
}) {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const params = await searchParams;

  const where = {
    communityId,
    ...(params.status && { status: params.status as never }),
    ...(params.category && { category: params.category as never }),
    ...(params.q && {
      OR: [
        { title: { contains: params.q, mode: "insensitive" as never } },
        { description: { contains: params.q, mode: "insensitive" as never } },
      ],
    }),
  };

  const [events, counts] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { startDate: "asc" },
      take: 50,
      include: {
        _count: { select: { contentDrafts: true, publications: true } },
      },
    }),
    prisma.event.groupBy({
      by: ["status"],
      where: { communityId },
      _count: true,
    }),
  ]);

  const statusCounts = Object.fromEntries(counts.map((c) => [c.status, c._count]));

  return <EventsClient events={events} statusCounts={statusCounts} />;
}
