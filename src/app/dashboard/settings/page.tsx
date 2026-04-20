import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsGeneralClient } from "@/components/settings/settings-general-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Paramètres — Yad.ia" };

export default async function SettingsPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;

  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: {
      id: true, name: true, slug: true, description: true,
      logoUrl: true, city: true, country: true, timezone: true,
      phone: true, email: true, website: true, address: true, postalCode: true,
      tone: true, language: true, signature: true, hashtags: true, mentions: true,
      editorialRules: true, communityType: true, religiousStream: true,
      onboardingDone: true, plan: true,
    },
  });

  return <SettingsGeneralClient community={community!} profile={{ name: profile.name ?? "", email: profile.email, avatarUrl: profile.avatarUrl ?? null }} />;
}
