import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BillingClient } from "@/components/settings/billing-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Facturation — Yad.ia" };

export default async function BillingPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;

  const [community, subscription] = await Promise.all([
    prisma.community.findUnique({
      where: { id: communityId },
      select: {
        plan: true,
        stripeCustomerId: true,
        planExpiresAt: true,
      },
    }),
    prisma.subscription.findFirst({
      where: { communityId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <BillingClient
      community={community!}
      subscription={subscription as Parameters<typeof BillingClient>[0]["subscription"]}
    />
  );
}
