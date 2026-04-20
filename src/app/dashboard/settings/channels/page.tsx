import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChannelsSettingsClient } from "@/components/settings/channels-settings-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Canaux — Yad.ia" };

export default async function ChannelsSettingsPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;

  const channels = await prisma.channel.findMany({
    where: { communityId },
    orderBy: { type: "asc" },
  });

  return <ChannelsSettingsClient channels={channels as Parameters<typeof ChannelsSettingsClient>[0]["channels"]} communityId={communityId} />;
}
