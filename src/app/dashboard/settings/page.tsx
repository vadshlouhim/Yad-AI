import { requireAuth } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SettingsGeneralClient } from "@/components/settings/settings-general-client";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Paramètres - EasyCom AI" };

type SettingsSection = "community" | "contacts" | "editorial" | "profile" | "interface";

function getSettingsSection(value: string | string[] | undefined): SettingsSection {
  const section = Array.isArray(value) ? value[0] : value;
  return section === "contacts" ||
    section === "editorial" ||
    section === "profile" ||
    section === "interface"
    ? section
    : "community";
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string | string[] }>;
}) {
  const { section } = await searchParams;
  const initialSection = getSettingsSection(section);
  const { profile } = await requireAuth();
  if (!profile.communityId) {
    redirect("/onboarding");
  }

  const communityId = profile.communityId;
  const admin = createAdminClient();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: community } = await admin
    .from("Community")
    .select("id, name, slug, description, logoUrl, city, country, timezone, phone, email, website, address, postalCode, tone, language, signature, hashtags, mentions, editorialRules, communityType, religiousStream, onboardingDone, plan")
    .eq("id", communityId)
    .single();

  if (!community) {
    redirect("/onboarding");
  }

  const settingsCommunity = {
    ...community,
    rhythmId: null,
    hashtags: community.hashtags ?? [],
    mentions: community.mentions ?? [],
  };

  const rhythmQuery = admin
    .from("CommunityRhythm")
    .select("id, name, slug, description, isActive, sortOrder")
    .order("sortOrder", { ascending: true })
    .order("name", { ascending: true });

  const { data: rhythms } = await rhythmQuery.eq("isActive", true);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
        <p className="text-sm text-slate-100">
          Gérez ici vos réseaux sociaux, votre quotidien, vos contacts, la FAQ et le support.
        </p>
      </div>
      <SettingsGeneralClient
        community={settingsCommunity}
        rhythms={rhythms ?? []}
        initialSection={initialSection}
        profile={{
          name: profile.name ?? "",
          email: profile.email,
          avatarUrl: profile.avatarUrl ?? null,
          canAccessAdmin: canAccessAdmin(profile),
          authProviders: Array.isArray(user?.app_metadata?.providers)
            ? user.app_metadata.providers
            : [],
        }}
      />
    </div>
  );
}
