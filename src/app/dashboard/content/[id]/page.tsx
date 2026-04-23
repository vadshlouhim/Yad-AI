import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { ContentDetailClient } from "@/components/content/content-detail-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Modifier le contenu — Yad.ia" };

export default async function ContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const { id } = await params;
  const admin = createAdminClient();

  const [{ data: draft }, { data: community }] = await Promise.all([
    admin
      .from("ContentDraft")
      .select("*, event:Event(id, title, startDate, category), channelAdaptations:ChannelAdaptation(*), publications:Publication(*, channel:Channel(type, name))")
      .eq("id", id)
      .eq("communityId", communityId)
      .single(),
    admin
      .from("Community")
      .select("name, tone, hashtags, channels:Channel(type, isConnected, isActive, name)")
      .eq("id", communityId)
      .single(),
  ]);

  if (!draft) notFound();

  return (
    <ContentDetailClient
      draft={draft as Parameters<typeof ContentDetailClient>[0]["draft"]}
      community={community!}
    />
  );
}
