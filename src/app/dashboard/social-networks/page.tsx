import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SocialNetworksClient } from "@/components/social-networks/social-networks-client";
import { requireAuth } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("socialComposer.header");
  return { title: `${t("title")} - EasyCom IA` };
}

export default async function SocialNetworksPage() {
  const { profile } = await requireAuth();
  if (!profile.communityId) redirect("/onboarding");
  return <SocialNetworksClient />;
}
