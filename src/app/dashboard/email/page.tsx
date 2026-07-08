import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { EmailClient } from "@/components/email/email-client";
import { getEmailAiState } from "@/lib/email/ai-settings";
import { BusinessFeatureLocked } from "@/components/billing/business-feature-locked";
import { planToTier } from "@/lib/billing";

export const metadata: Metadata = { title: "Messagerie Email — EasyCom IA" };

export default async function EmailPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;

  const admin = createAdminClient();
  const { data: community } = await admin
    .from("Community")
    .select("timezone, plan")
    .eq("id", communityId)
    .single();

  if (planToTier(community?.plan) !== "BUSINESS") {
    return (
      <BusinessFeatureLocked
        title="Gestion des emails réservée à l'offre Business"
        description="Répondez à vos emails avec l'IA, classez-les automatiquement et gérez vos règles de notification depuis un espace dédié."
        features={["Boîte email connectée à l'IA", "Réponses rédigées automatiquement", "Classement et règles de notification"]}
      />
    );
  }

  const { data: emailChannel } = await admin
    .from("Channel")
    .select("isConnected, handle, settings")
    .eq("communityId", communityId)
    .eq("type", "EMAIL")
    .maybeSingle();

  const isConnected = emailChannel?.isConnected ?? false;
  const gmailEmail = emailChannel?.handle ?? "";
  const emailAiState = getEmailAiState(emailChannel?.settings);

  return (
    <EmailClient
      communityId={communityId}
      initialConnected={isConnected}
      initialEmail={gmailEmail}
      initialState={emailAiState}
      timezone={community?.timezone ?? "Europe/Paris"}
    />
  );
}
