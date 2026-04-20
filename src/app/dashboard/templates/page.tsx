import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TemplatesClient } from "@/components/templates/templates-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Templates d'affiches — Yad.ia" };

export default async function TemplatesPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;

  const [templates, community] = await Promise.all([
    prisma.template.findMany({
      where: {
        isActive: true,
        OR: [{ isGlobal: true }, { communityId }],
      },
      orderBy: [{ category: "asc" }, { usageCount: "desc" }],
    }),
    prisma.community.findUnique({
      where: { id: communityId },
      select: {
        id: true,
        name: true,
        city: true,
        tone: true,
        phone: true,
        email: true,
        website: true,
        address: true,
        religiousStream: true,
        plan: true,
      },
    }),
  ]);

  return (
    <TemplatesClient
      templates={templates as Parameters<typeof TemplatesClient>[0]["templates"]}
      community={community!}
      plan={community?.plan ?? "FREE_TRIAL"}
    />
  );
}
