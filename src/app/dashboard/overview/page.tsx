import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { addDays } from "date-fns";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardOverviewPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const admin = createAdminClient();

  const now = new Date();
  const in7days = addDays(now, 7).toISOString();

  const [
    { data: upcomingEvents },
    { data: pendingPublications },
    { data: recentDrafts },
    eventCount,
    publishedCount,
    draftCount,
    automationCount,
    { data: notifications },
    { data: community },
  ] = await Promise.all([
    admin
      .from("Event")
      .select("*")
      .eq("communityId", communityId)
      .gte("startDate", now.toISOString())
      .lte("startDate", in7days)
      .neq("status", "ARCHIVED")
      .order("startDate", { ascending: true })
      .limit(5),

    admin
      .from("Publication")
      .select("*, channel:Channel(type, name), event:Event(title)")
      .eq("communityId", communityId)
      .in("status", ["PENDING", "SCHEDULED", "FAILED"])
      .order("scheduledAt", { ascending: true })
      .limit(8),

    admin
      .from("ContentDraft")
      .select("*, event:Event(title, category)")
      .eq("communityId", communityId)
      .in("status", ["DRAFT", "AI_PROPOSAL", "READY_TO_PUBLISH"])
      .order("updatedAt", { ascending: false })
      .limit(5),

    admin
      .from("Event")
      .select("*", { count: "exact", head: true })
      .eq("communityId", communityId)
      .then((r) => r.count ?? 0),
    admin
      .from("Publication")
      .select("*", { count: "exact", head: true })
      .eq("communityId", communityId)
      .eq("status", "PUBLISHED")
      .then((r) => r.count ?? 0),
    admin
      .from("ContentDraft")
      .select("*", { count: "exact", head: true })
      .eq("communityId", communityId)
      .then((r) => r.count ?? 0),
    admin
      .from("Automation")
      .select("*", { count: "exact", head: true })
      .eq("communityId", communityId)
      .eq("isActive", true)
      .then((r) => r.count ?? 0),

    admin
      .from("Notification")
      .select("*")
      .eq("userId", profile.id)
      .eq("isRead", false)
      .order("createdAt", { ascending: false })
      .limit(5),

    admin
      .from("Community")
      .select("name, tone, hashtags, channels:Channel(type, isConnected), plan")
      .eq("id", communityId)
      .single(),
  ]);

  const stats = {
    events: eventCount,
    published: publishedCount,
    drafts: draftCount,
    automations: automationCount,
  };

  return (
    <DashboardClient
      userName={profile.name ?? ""}
      community={community!}
      upcomingEvents={upcomingEvents ?? []}
      pendingPublications={pendingPublications ?? []}
      recentDrafts={recentDrafts ?? []}
      stats={stats}
      notifications={notifications ?? []}
    />
  );
}
