import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default async function OnboardingPage() {
  const { profile } = await requireAuth();

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

  return (
    <OnboardingWizard
      userId={profile.id}
      userName={profile.name ?? ""}
      initialStep={profile.communityId ? 1 : 0}
    />
  );
}
