import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ContentNewClient } from "@/components/content/content-new-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Nouveau contenu — Yad.ia" };

export default async function ContentNewPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; eventId?: string; ai?: string }>;
}) {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const params = await searchParams;
  const admin = createAdminClient();

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: events }, { data: community }] = await Promise.all([
    admin
      .from("Event")
      .select("id, title, startDate, category, description")
      .eq("communityId", communityId)
      .neq("status", "ARCHIVED")
      .gte("startDate", weekAgo)
      .order("startDate", { ascending: true })
      .limit(30),
    admin
      .from("Community")
      .select("name, tone, hashtags, signature, editorialRules, channels:Channel(type, isConnected, isActive)")
      .eq("id", communityId)
      .single(),
  ]);

  return (
    <ContentNewClient
      communityId={communityId}
      events={(events ?? []) as Array<{ id: string; title: string; startDate: string; category: string; description: string | null }>}
      community={community!}
      defaultType={params.type}
      defaultEventId={params.eventId}
      aiMode={params.ai === "true"}
    />
  );
}
