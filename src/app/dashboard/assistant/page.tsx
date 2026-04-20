import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AssistantClient } from "@/components/assistant/assistant-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Assistant IA — Yad.ia" };

export default async function AssistantPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;

  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: {
      name: true,
      tone: true,
      hashtags: true,
      language: true,
      communityType: true,
      religiousStream: true,
    },
  });

  return (
    <AssistantClient
      communityName={community?.name ?? "Ma communauté"}
      tone={community?.tone ?? "MODERN"}
    />
  );
}
