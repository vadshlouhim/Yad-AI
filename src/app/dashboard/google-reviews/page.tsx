import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ReviewsClient } from "@/components/reviews/reviews-client";
import { BusinessFeatureLocked } from "@/components/billing/business-feature-locked";
import { planToTier } from "@/lib/billing";

export const metadata: Metadata = { title: "Avis Google — EasyCom IA" };

export default async function GoogleReviewsPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;

  const admin = createAdminClient();
  const { data: community } = await admin.from("Community").select("plan").eq("id", communityId).single();

  if (planToTier(community?.plan) !== "BUSINESS") {
    return (
      <BusinessFeatureLocked
        title="Gestion des avis Google réservée à l'offre Business"
        description="Consultez et répondez à vos avis Google directement depuis EasyCom IA, avec des réponses suggérées par l'IA."
        features={["Tous vos avis centralisés", "Réponses suggérées par l'IA", "Alertes sur les nouveaux avis"]}
      />
    );
  }

  const { data: gmbChannel } = await admin
    .from("Channel")
    .select("isConnected, handle, settings")
    .eq("communityId", communityId)
    .eq("type", "GOOGLE_BUSINESS")
    .maybeSingle();

  const isConnected = gmbChannel?.isConnected ?? false;
  const locationDisplayName = (gmbChannel?.settings as { locationDisplayName?: string } | null)?.locationDisplayName
    ?? gmbChannel?.handle
    ?? null;

  return (
    <ReviewsClient
      communityId={communityId}
      initialConnected={isConnected}
      locationDisplayName={locationDisplayName}
    />
  );
}
