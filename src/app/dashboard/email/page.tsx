import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { EmailClient } from "@/components/email/email-client";
import { getEmailAiState } from "@/lib/email/ai-settings";

export const metadata: Metadata = { title: "Messagerie Email — EasyCom IA" };

export default async function EmailPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;

  const admin = createAdminClient();
  const { data: emailChannel } = await admin
    .from("Channel")
    .select("isConnected, handle, settings")
    .eq("communityId", communityId)
    .eq("type", "EMAIL")
    .maybeSingle();
  const { data: community } = await admin
    .from("Community")
    .select("timezone")
    .eq("id", communityId)
    .single();

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
