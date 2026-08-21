import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ReviewsClient } from "@/components/reviews/reviews-client";

export const metadata: Metadata = { title: "Avis Google — EasyCom IA" };

export default async function GoogleReviewsPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;

  const admin = createAdminClient();
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
