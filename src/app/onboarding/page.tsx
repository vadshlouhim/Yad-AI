import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default async function OnboardingPage() {
  const { profile } = await requireAuth();

  // Si déjà onboardé, rediriger vers dashboard
  if (profile.communityId) {
    const community = await prisma.community.findUnique({
      where: { id: profile.communityId },
      select: { onboardingDone: true },
    });
    if (community?.onboardingDone) {
      redirect("/dashboard");
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
