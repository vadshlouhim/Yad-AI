import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicationsClient } from "@/components/publications/publications-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Historique des publications — Shalom IA" };

const PUBLICATION_STATUSES = ["PENDING", "SCHEDULED", "PUBLISHING", "PUBLISHED", "FAILED", "FALLBACK_READY", "CANCELLED"];

export default async function PublicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; channel?: string }>;
}) {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const params = await searchParams;
  const admin = createAdminClient();

  let query = admin
    .from("Publication")
    .select("*, channel:Channel(type, name), event:Event(title, category), draft:ContentDraft(title, body)")
    .eq("communityId", communityId)
    .order("scheduledAt", { ascending: false })
    .order("createdAt", { ascending: false })
    .limit(100);

  if (params.status) query = query.eq("status", params.status);
  if (params.channel) query = query.eq("channelType", params.channel);

  const [{ data: publications }, statusCounts] = await Promise.all([
    query,
    Promise.all(
      PUBLICATION_STATUSES.map(async (status) => {
        const { count } = await admin
          .from("Publication")
          .select("*", { count: "exact", head: true })
          .eq("communityId", communityId)
          .eq("status", status);
        return [status, count ?? 0] as [string, number];
      })
    ),
  ]);

  const statsByStatus = Object.fromEntries(statusCounts);

  return (
    <PublicationsClient
      publications={(publications ?? []) as Parameters<typeof PublicationsClient>[0]["publications"]}
      statsByStatus={statsByStatus}
      activeStatus={params.status}
      activeChannel={params.channel}
    />
  );
}
