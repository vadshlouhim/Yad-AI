import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicationsClient } from "@/components/publications/publications-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Historique des publications - EasyCom IA" };

const PUBLICATION_STATUSES = ["PUBLISHED", "FAILED"] as const;

export default async function PublicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; channel?: string }>;
}) {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const params = await searchParams;
  const admin = createAdminClient();
  const status = params.status === "FAILED" ? "FAILED" : "PUBLISHED";

  let query = admin
    .from("Publication")
    .select("*, channel:Channel(type, name, handle, pageId, settings), event:Event(title, category), draft:ContentDraft(title, body)")
    .eq("communityId", communityId)
    .in("status", [...PUBLICATION_STATUSES])
    .eq("status", status)
    .order("scheduledAt", { ascending: false })
    .order("createdAt", { ascending: false })
    .limit(100);

  if (params.channel) query = query.eq("channelType", params.channel);

  const [{ data: publications }, statusCounts] = await Promise.all([
    query,
    Promise.all(
      PUBLICATION_STATUSES.map(async (publicationStatus) => {
        const { count } = await admin
          .from("Publication")
          .select("*", { count: "exact", head: true })
          .eq("communityId", communityId)
          .eq("status", publicationStatus);
        return [publicationStatus, count ?? 0] as [string, number];
      })
    ),
  ]);

  const statsByStatus = Object.fromEntries(statusCounts);

  return (
    <div className="container max-w-6xl mx-auto py-6 px-4 sm:px-6">
      <PublicationsClient
        publications={(publications ?? []) as Parameters<typeof PublicationsClient>[0]["publications"]}
        statsByStatus={statsByStatus}
        activeStatus={status}
        activeChannel={params.channel}
      />
    </div>
  );
}
