import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SettingsGeneralClient } from "@/components/settings/settings-general-client";
import { AgentPageBanner } from "@/components/dashboard/agent-page-banner";
import { Settings2, Sparkles } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Paramètres - EasyCom IA" };

type SettingsSection = "community" | "contacts" | "editorial" | "profile";

function getSettingsSection(value: string | string[] | undefined): SettingsSection {
  const section = Array.isArray(value) ? value[0] : value;
  return section === "contacts" || section === "editorial" || section === "profile"
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
    .select("id, name, slug, description, logoUrl, city, country, timezone, phone, email, website, address, postalCode, tone, language, signature, hashtags, mentions, editorialRules, communityType, religiousStream, onboardingDone, plan, vocabulary")
    .eq("id", communityId)
    .single();

  if (!community) {
    redirect("/onboarding");
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-6">
      <div className="hidden md:block">
        <AgentPageBanner
          eyebrow="Espace de réglages"
          title="Paramètres"
          description="Gérez votre communauté, vos canaux, votre identité éditoriale et votre profil dans une interface claire, moderne et cohérente."
          icon={Settings2}
          tone="teal"
        />
      </div>

      <section className="relative overflow-hidden rounded-[2rem] bg-[#421388] px-5 py-6 text-white shadow-[0_24px_58px_-32px_rgba(66,19,136,0.7)] md:hidden">
        <div className="absolute -right-12 -top-14 size-40 rounded-full bg-fuchsia-400/25 blur-3xl" />
        <div className="absolute -bottom-16 left-1/3 size-36 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white text-[#421388] shadow-lg"><Settings2 className="size-7" /></span>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.14em] text-violet-100"><Sparkles className="size-3.5" /> Mon espace</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight">Paramètres</h1>
          </div>
        </div>
      </section>

      <SettingsGeneralClient
        community={{
          ...community,
          hashtags: community.hashtags ?? [],
          mentions: community.mentions ?? [],
        }}
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
