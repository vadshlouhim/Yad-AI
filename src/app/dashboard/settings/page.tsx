import { requireAuth } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SettingsGeneralClient } from "@/components/settings/settings-general-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Paramètres — Shalom IA" };

export default async function SettingsPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
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

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
        <p className="text-sm text-slate-100">
          Gérez ici vos réseaux sociaux, votre quotidien, vos contacts, la FAQ et le support.
        </p>
      </div>
      <SettingsGeneralClient
        community={community!}
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
