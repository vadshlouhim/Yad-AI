import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MarketplaceSubmitClient } from "@/components/community-marketplace/marketplace-submit-client";
import { hasCommunityAccess } from "@/lib/billing/subscription-policy";

export const metadata: Metadata = { title: "Publier — Annonces & Ressources communautaires" };

export default async function MarketplaceSubmitPage() {
  const { profile } = await requireAuth();
  const admin = createAdminClient();
  const { data: community } = await admin.from("Community").select("name, plan, createdAt").eq("id", profile.communityId!).single();
  if (!community || !hasCommunityAccess(community)) redirect("/dashboard/boutique/communautaire");
  return <MarketplaceSubmitClient communityName={community.name} />;
}
