import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { DonationCampaignClient } from "@/components/donation-campaign/donation-campaign-client";

export const metadata: Metadata = { title: "Campagne de dons — EasyCom IA" };

export default async function DonationCampaignPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const admin = createAdminClient();

  const { data: community } = await admin
    .from("Community")
    .select("id, name, logoUrl, plan, tone, city")
    .eq("id", communityId)
    .single();

  // Tenter de charger la campagne active (silencieux si tables absentes)
  const campaignResult = await Promise.resolve(
    admin
      .from("donation_campaigns")
      .select("*")
      .eq("communityId", communityId)
      .in("status", ["draft", "active", "pending_validation"])
      .order("created_at", { ascending: false })
      .limit(1)
  ).catch(() => ({ data: null, error: null }));

  const latestCampaign = campaignResult.data?.[0] ?? null;

  const stepsResult = latestCampaign
    ? await Promise.resolve(
        admin
          .from("donation_campaign_steps")
          .select("*")
          .eq("campaign_id", latestCampaign.id)
          .order("step_date")
      ).catch(() => ({ data: null, error: null }))
    : { data: null };

  return (
    <DonationCampaignClient
      community={community!}
      initialCampaign={latestCampaign}
      initialSteps={stepsResult.data ?? []}
    />
  );
}
