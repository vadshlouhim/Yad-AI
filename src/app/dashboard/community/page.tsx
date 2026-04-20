import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CommunityClient } from "@/components/community/community-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Ma communauté — Yad.ia" };

export default async function CommunityPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;

  const community = await prisma.community.findUnique({
    where: { id: communityId },
    include: {
      users: {
        select: { id: true, name: true, email: true, role: true, avatarUrl: true },
        orderBy: { createdAt: "asc" },
      },
      channels: {
        select: { id: true, type: true, name: true, isConnected: true, isActive: true },
      },
      _count: {
        select: { events: true, publications: true, contentDrafts: true, mediaFiles: true },
      },
    },
  });

  return <CommunityClient community={community!} />;
}
