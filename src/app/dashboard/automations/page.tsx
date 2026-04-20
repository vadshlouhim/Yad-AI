import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AutomationsClient } from "@/components/automations/automations-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Automatisations — Yad.ia" };

export default async function AutomationsPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;

  const [automations, runs] = await Promise.all([
    prisma.automation.findMany({
      where: { communityId },
      orderBy: { createdAt: "desc" },
      include: {
        event: { select: { title: true, startDate: true } },
        runs: {
          orderBy: { startedAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.automationRun.findMany({
      where: {
        automation: { communityId },
        startedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { startedAt: "desc" },
      take: 20,
      include: {
        automation: { select: { name: true } },
      },
    }),
  ]);

  return (
    <AutomationsClient
      automations={automations as Parameters<typeof AutomationsClient>[0]["automations"]}
      recentRuns={runs as Parameters<typeof AutomationsClient>[0]["recentRuns"]}
    />
  );
}
