import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { SocialPlanningClient } from "@/components/social-networks/social-planning-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("socialPlanning");
  return { title: `${t("title")} - EasyCom IA` };
}

export default async function SocialPlanningPage() {
  const { profile } = await requireAuth();
  if (!profile.communityId) redirect("/onboarding");
  return <SocialPlanningClient />;
}
