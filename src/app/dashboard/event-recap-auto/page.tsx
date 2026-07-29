import type { Metadata } from "next";
import { EventRecapAutoClient } from "@/components/event-recap/event-recap-auto-client";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_RECAP_SETTINGS,
  getRecapSettingsFromTriggerConfig,
  getRecapHistory,
} from "@/lib/automation/event-recap";

export const metadata: Metadata = { title: "Récap automatique après événement — EasyCom IA" };

export default async function EventRecapAutoPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const { eventId } = await searchParams;

  const [{ data: community }, { data: events }, { data: automationRows }] = await Promise.all([
    admin.from("Community").select("id, name, logoUrl, city, timezone, tone, plan").eq("id", communityId).single(),
    admin
      .from("Event")
      .select("id, title, startDate, endDate, coverImageUrl, status")
      .eq("communityId", communityId)
      .neq("status", "ARCHIVED")
      .gte("startDate", nowIso)
      .order("startDate", { ascending: true })
      .limit(3),
    admin
      .from("Automation")
      .select("id, name, isActive, status, nextRunAt, triggerConfig, updatedAt")
      .eq("communityId", communityId)
      .eq("trigger", "DAILY")
      .order("updatedAt", { ascending: false })
      .limit(50),
  ]);

  const automation = (automationRows ?? []).find((row) => getRecapSettingsFromTriggerConfig(row.triggerConfig)) ?? null;
  const settings = automation
    ? getRecapSettingsFromTriggerConfig(automation.triggerConfig) ?? {
        ...DEFAULT_RECAP_SETTINGS,
        timezone: community?.timezone ?? "Europe/Paris",
      }
    : { ...DEFAULT_RECAP_SETTINGS, timezone: community?.timezone ?? "Europe/Paris" };
  const history = automation ? getRecapHistory(automation.triggerConfig) : {};

  return (
    <EventRecapAutoClient
      community={community!}
      finishedEvents={(events ?? []) as Parameters<typeof EventRecapAutoClient>[0]["finishedEvents"]}
      automation={automation as Parameters<typeof EventRecapAutoClient>[0]["automation"]}
      settings={settings}
      history={history}
      focusEventId={eventId ?? null}
    />
  );
}
