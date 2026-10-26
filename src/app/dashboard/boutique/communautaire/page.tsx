import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { CommunityMarketplaceClient } from "@/components/community-marketplace/community-marketplace-client";
import { hasCommunityAccess } from "@/lib/billing/subscription-policy";

export const metadata: Metadata = { title: "Annonces & Ressources communautaires — EasyCom-AI" };

export default async function CommunityMarketplacePage() {
  const { supabaseUser, profile } = await requireAuth();
  const admin = createAdminClient();
  const { data: community } = await admin.from("Community").select("id, name, plan, createdAt").eq("id", profile.communityId!).single();
  return <CommunityMarketplaceClient currentUserId={supabaseUser.id} communityName={community?.name ?? "Votre communauté"} canPublish={hasCommunityAccess(community)} />;
}
