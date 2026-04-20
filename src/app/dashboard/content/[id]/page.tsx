import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ContentDetailClient } from "@/components/content/content-detail-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Modifier le contenu — Yad.ia" };

export default async function ContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const { id } = await params;

  const [draft, community] = await Promise.all([
    prisma.contentDraft.findFirst({
      where: { id, communityId },
      include: {
        event: { select: { id: true, title: true, startDate: true, category: true } },
        channelAdaptations: true,
        publications: {
          include: {
            channel: { select: { type: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.community.findUnique({
      where: { id: communityId },
      select: {
        name: true,
        tone: true,
        hashtags: true,
        channels: { select: { type: true, isConnected: true, isActive: true, name: true } },
      },
    }),
  ]);

  if (!draft) notFound();

  return (
    <ContentDetailClient
      draft={draft as Parameters<typeof ContentDetailClient>[0]["draft"]}
      community={community!}
    />
  );
}
