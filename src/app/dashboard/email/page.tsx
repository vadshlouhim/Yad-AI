import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { EmailClient } from "@/components/email/email-client";

export const metadata: Metadata = { title: "Messagerie Email — Easycom AI" };

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

  const isConnected = emailChannel?.isConnected ?? false;
  const gmailEmail = emailChannel?.handle ?? "";

  return (
    <EmailClient
      communityId={communityId}
      initialConnected={isConnected}
      initialEmail={gmailEmail}
    />
  );
}
