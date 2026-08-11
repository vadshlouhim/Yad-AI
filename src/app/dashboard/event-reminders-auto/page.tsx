import type { Metadata } from "next";
import { EventRemindersAutoClient } from "@/components/event-reminders/event-reminders-auto-client";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCampaignFromTriggerConfig } from "@/lib/automation/event-reminders";

export const metadata: Metadata = { title: "Automatisation J-10 / J-5 — EasyCom IA" };

export default async function EventRemindersAutoPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const [{ data: community }, { data: events }, { data: automationRows }, { data: channels }] = await Promise.all([
    admin
      .from("Community")
      .select("id, name, logoUrl, city, timezone, tone, plan")
      .eq("id", communityId)
      .single(),
    admin
      .from("Event")
      .select("id, title, startDate, endDate, coverImageUrl, status, notes")
      .eq("communityId", communityId)
      .neq("status", "ARCHIVED")
      .gte("startDate", nowIso)
      .order("startDate", { ascending: true })
      .limit(30),
    admin
      .from("Automation")
      .select("id, name, isActive, status, nextRunAt, triggerConfig, updatedAt, eventId")
      .eq("communityId", communityId)
      .eq("trigger", "CUSTOM_SCHEDULE")
      .order("updatedAt", { ascending: false })
      .limit(50),
    admin
      .from("Channel")
      .select("type, name, handle, isConnected, isActive")
      .eq("communityId", communityId)
      .in("type", ["FACEBOOK", "INSTAGRAM"] as never[]),
  ]);

  // Ne garde que les automatisations qui portent une campagne J-10/J-5.
  const campaigns = (automationRows ?? []).filter((row) =>
    getCampaignFromTriggerConfig(row.triggerConfig)
  );

  return (
    <EventRemindersAutoClient
      community={community!}
      upcomingEvents={(events ?? []).filter((event) => !event.notes?.startsWith("Rappel automatique")) as Parameters<typeof EventRemindersAutoClient>[0]["upcomingEvents"]}
      campaigns={campaigns as Parameters<typeof EventRemindersAutoClient>[0]["campaigns"]}
      channels={(channels ?? []) as Parameters<typeof EventRemindersAutoClient>[0]["channels"]}
    />
  );
}
