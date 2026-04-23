import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SettingsGeneralClient } from "@/components/settings/settings-general-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Paramètres — Yad.ia" };

export default async function SettingsPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const admin = createAdminClient();

  const { data: community } = await admin
    .from("Community")
    .select("id, name, slug, description, logoUrl, city, country, timezone, phone, email, website, address, postalCode, tone, language, signature, hashtags, mentions, editorialRules, communityType, religiousStream, onboardingDone, plan")
    .eq("id", communityId)
    .single();

  return (
    <SettingsGeneralClient
      community={community!}
      profile={{ name: profile.name ?? "", email: profile.email, avatarUrl: profile.avatarUrl ?? null }}
    />
  );
}
