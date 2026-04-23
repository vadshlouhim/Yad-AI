import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ChannelsSettingsClient } from "@/components/settings/channels-settings-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Canaux — Yad.ia" };

export default async function ChannelsSettingsPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const admin = createAdminClient();

  const { data: channels } = await admin
    .from("Channel")
    .select("*")
    .eq("communityId", communityId)
    .order("type", { ascending: true });

  return (
    <ChannelsSettingsClient
      channels={(channels ?? []) as Parameters<typeof ChannelsSettingsClient>[0]["channels"]}
      communityId={communityId}
    />
  );
}
