import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default async function OnboardingPage(
  { searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }
) {
  const { profile } = await requireAuth();
  const params = await searchParams;

  if (profile.communityId) {
    const admin = createAdminClient();
    const { data: community } = await admin
      .from("Community")
      .select("onboardingDone")
      .eq("id", profile.communityId)
      .single();
    if (community?.onboardingDone) {
      redirect("/dashboard/assistant");
    }
  }

  // Si on revient d'un OAuth (Meta ou Gmail), on démarre directement à l'étape Canaux
  const hasOAuthReturn = typeof params.oauth === "string";
  const initialStep = hasOAuthReturn ? 2 : profile.communityId ? 1 : 0;

  return (
    <OnboardingWizard
      userId={profile.id}
      userName={profile.name ?? ""}
      communityId={profile.communityId ?? undefined}
      initialStep={initialStep}
    />
  );
}
