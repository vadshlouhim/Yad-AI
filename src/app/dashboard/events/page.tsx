import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { EventsClient } from "@/components/events/events-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mon agenda" };

const EVENT_STATUSES = ["DRAFT", "READY", "SCHEDULED", "PUBLISHED", "COMPLETED", "ARCHIVED"];

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string; q?: string; view?: string; period?: string }>;
}) {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const params = await searchParams;
  const admin = createAdminClient();

  let query = admin
    .from("Event")
    .select("id, title, startDate, endDate, location, category, status, isRecurring, coverImageUrl, contentDrafts:ContentDraft(id), publications:Publication(id)")
    .eq("communityId", communityId)
    .order("startDate", { ascending: true })
    .limit(500);

  if (params.status) query = query.eq("status", params.status);
  else query = query.neq("status", "ARCHIVED");
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
  const normalizedEvents = (events ?? []).map((event) => ({
    id: event.id,
    title: event.title,
    startDate: event.startDate,
    endDate: event.endDate,
    location: event.location,
    category: event.category,
    status: event.status,
    isRecurring: event.isRecurring,
    coverImageUrl: event.coverImageUrl,
    _count: {
      contentDrafts: Array.isArray(event.contentDrafts) ? event.contentDrafts.length : 0,
      publications: Array.isArray(event.publications) ? event.publications.length : 0,
    },
  }));

  return <EventsClient events={normalizedEvents} statusCounts={statusCounts2} />;
}
