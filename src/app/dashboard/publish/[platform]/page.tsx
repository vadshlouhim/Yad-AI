import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ManualPublishClient } from "@/components/publish/manual-publish-client";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface Props {
  params: Promise<{
    platform: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { platform } = await params;
  const capitalized = platform.charAt(0).toUpperCase() + platform.slice(1);
  return {
    title: `Publier sur ${capitalized} - EasyCom IA`,
  };
}

const VALID_PLATFORMS = ["whatsapp", "instagram", "facebook", "telegram", "email"];

export default async function ManualPublishPage({ params }: Props) {
  const { platform } = await params;

  if (!VALID_PLATFORMS.includes(platform.toLowerCase())) {
    notFound();
  }

  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const admin = createAdminClient();

  const type = platform.toUpperCase();
  const { data: channel } = await admin
    .from("Channel")
    .select("id, isConnected")
    .eq("communityId", communityId)
    .eq("type", type)
    .maybeSingle();

  const { data: community } = await admin
    .from("Community")
    .select("name")
    .eq("id", communityId)
    .single();

  const isConnected = channel?.isConnected || false;
  const communityName = community?.name || "Ma Communaute";

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <ManualPublishClient
        platform={platform}
        channelId={channel?.id ?? null}
        isConnected={isConnected}
        communityName={communityName}
      />
    </div>
  );
}
