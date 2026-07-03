import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { ContentDetailClient } from "@/components/content/content-detail-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Modifier le contenu — EasyCom IA" };

export default async function ContentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ quickValidate?: string }>;
}) {
  const { id } = await params;
  if (id === "new") notFound();

  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const parsedSearchParams = await searchParams;
  const quickValidate = parsedSearchParams.quickValidate === "1";
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
      quickValidate={quickValidate}
    />
  );
}
