import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { EventsClient } from "@/components/events/events-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Événements" };

const EVENT_STATUSES = ["DRAFT", "SCHEDULED", "ONGOING", "COMPLETED", "ARCHIVED", "CANCELLED"];

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string; q?: string }>;
}) {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const params = await searchParams;
  const admin = createAdminClient();

  let query = admin
    .from("Event")
    .select("*, contentDrafts:ContentDraft(id), publications:Publication(id)")
    .eq("communityId", communityId)
    .order("startDate", { ascending: true })
    .limit(50);

  if (params.status) query = query.eq("status", params.status);
  if (params.category) query = query.eq("category", params.category);
  if (params.q) query = query.ilike("title", `%${params.q}%`);

  const [{ data: events }, statusCounts] = await Promise.all([
    query,
    Promise.all(
      EVENT_STATUSES.map(async (status) => {
        const { count } = await admin
          .from("Event")
          .select("*", { count: "exact", head: true })
          .eq("communityId", communityId)
          .eq("status", status);
        return [status, count ?? 0] as [string, number];
      })
    ),
  ]);

  const statusCounts2 = Object.fromEntries(statusCounts);

  return <EventsClient events={events ?? []} statusCounts={statusCounts2} />;
}
