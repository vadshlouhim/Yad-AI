import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { OnboardingWizard, type OnboardingData } from "@/components/onboarding/onboarding-wizard";
import { getPublicToolDestination } from "@/lib/public-tools";
import {
  DEFAULT_COUNTRY,
  isSupportedCountry,
  normalizeSupportedCountry,
} from "@/lib/community/countries";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; country?: string }> }) {
  const { profile, supabaseUser } = await requireAuth();
  const params = await searchParams;
  const destination = getPublicToolDestination(params.callbackUrl) ?? "/dashboard";
  const registrationCountry = isSupportedCountry(params.country)
    ? params.country
    : isSupportedCountry(supabaseUser.country)
      ? supabaseUser.country
      : DEFAULT_COUNTRY;

  const admin = createAdminClient();
  let initialData: Partial<OnboardingData> | undefined = {
    country: registrationCountry,
  };

  if (profile.communityId) {
    const { data: community } = await admin
      .from("Community")
      .select("onboardingDone, name, city, country, phone, email, website, logoUrl")
      .eq("id", profile.communityId)
      .single();

    if (community?.onboardingDone) {
      redirect(destination);
    }

    if (community) {
      initialData = {
        communityName: community.name ?? "",
        city: community.city ?? "",
        country: normalizeSupportedCountry(community.country),
        phone: community.phone ?? "",
        email: community.email ?? "",
        website: community.website ?? "",
        logoUrl: community.logoUrl ?? "",
      };
    }
  }

  // L'étape Identité crée le brouillon de communauté : profile.communityId présent
  // signifie donc qu'elle est déjà passée (y compris au retour d'une popup OAuth).
  const initialStep = profile.communityId ? 1 : 0;

  return (
    <OnboardingWizard
      userId={profile.id}
      userName={profile.name ?? ""}
      communityId={profile.communityId ?? undefined}
      initialStep={initialStep}
      initialData={initialData}
      returnTo={destination}
    />
  );
}
