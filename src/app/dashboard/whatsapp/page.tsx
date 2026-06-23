import type { Metadata } from "next";
import { WhatsAppClient } from "@/components/whatsapp/whatsapp-client";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBillingConfig, getBillingGate } from "@/lib/billing";

export const metadata: Metadata = { title: "WhatsApp - EasyCom IA" };

export default async function WhatsAppPage() {
  const { profile } = await requireAuth();
  const admin = createAdminClient();
  const communityId = profile.communityId!;

  const [billingConfig, gate, waChannelResult] = await Promise.all([
    getBillingConfig(admin),
    getBillingGate(admin, profile.id),
    admin
      .from("Channel")
      .select("accessToken, pageId, settings, isConnected, isActive")
      .eq("communityId", communityId)
      .eq("type", "WHATSAPP")
      .maybeSingle(),
  ]);

  const waChannel = waChannelResult.data as {
    accessToken: string | null;
    pageId: string | null;
    settings: Record<string, unknown> | null;
    isConnected: boolean;
    isActive: boolean;
  } | null;

  const isCloudConfigured =
    !!(waChannel?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN) &&
    !!(waChannel?.pageId || process.env.WHATSAPP_PHONE_NUMBER_ID);
  const isPersonalMode = (waChannel?.settings as { mode?: string } | null)?.mode === "personal";

  return (
    <div className="container max-w-6xl mx-auto py-6 px-4 sm:px-6">
      <WhatsAppClient
        billingConfig={billingConfig}
        isPaid={gate.isPaid}
        isCloudConfigured={isCloudConfigured}
        isPersonalMode={isPersonalMode}
      />
    </div>
  );
}
