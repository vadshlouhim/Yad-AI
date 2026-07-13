import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SettingsGeneralClient } from "@/components/settings/settings-general-client";
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
      <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-700 shadow-[0_20px_48px_rgba(6,95,70,0.16)] sm:rounded-[1.75rem]">
        <div className="bg-[linear-gradient(135deg,#047857,#059669,#10b981)] px-4 py-5 text-white sm:px-8 sm:py-7">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-50">Paramètres</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:mt-3 sm:text-3xl">Paramètres</h1>
            <p className="mt-3 text-sm leading-6 text-emerald-50">
              Gérez ici vos réseaux sociaux, votre quotidien, vos contacts, la FAQ et le support.
            </p>
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
