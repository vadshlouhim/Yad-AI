import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SocialNetworksClient } from "@/components/social-networks/social-networks-client";
import { requireAuth } from "@/lib/auth";

export const metadata: Metadata = { title: "Tous mes réseaux - EasyCom IA" };

export default async function SocialNetworksPage() {
  const { profile } = await requireAuth();
  if (!profile.communityId) redirect("/onboarding");

  return <SocialNetworksClient />;
}
