import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ChannelsSettingsClient } from "@/components/settings/channels-settings-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Canaux — EasyCom IA" };

export default async function ChannelsSettingsPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const admin = createAdminClient();

  const { data: channels } = await admin
    .from("Channel")
    .select("*")
    .eq("communityId", communityId)
    .order("type", { ascending: true });

  // Si le canal EMAIL n'existe pas encore en base mais qu'un refresh token
  // est présent en env, on l'affiche comme connecté (connexion legacy)
  const channelList = channels ?? [];
  const hasEmailInDb = channelList.some((c) => c.type === "EMAIL");
  const hasGmailEnvToken = !!process.env.GMAIL_REFRESH_TOKEN;

  const syntheticChannels = [...channelList];
  if (!hasEmailInDb && hasGmailEnvToken) {
    syntheticChannels.push({
      id: "env-gmail",
      communityId,
      type: "EMAIL",
      name: "Email / Newsletter",
      handle: process.env.GMAIL_CLIENT_ID?.split("-")[0] ?? "Gmail",
      isConnected: true,
      isActive: true,
      pageId: null,
      lastSyncAt: null,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      settings: { provider: "gmail", source: "env" },
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <ChannelsSettingsClient
        channels={syntheticChannels as Parameters<typeof ChannelsSettingsClient>[0]["channels"]}
        communityId={communityId}
      />
    </div>
  );
}
