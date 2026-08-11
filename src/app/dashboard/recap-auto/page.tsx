import type { Metadata } from "next";
import { RecapAutoClient } from "@/components/recap-auto/recap-auto-client";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_RECAP_SETTINGS,
  getRecapHistory as getEventRecapHistory,
  getRecapSettingsFromTriggerConfig,
} from "@/lib/automation/event-recap";
import {
  DEFAULT_MONTHLY_SETTINGS,
  getMonthlySettings,
  getProgramHistory,
  getRecapHistory as getMonthlyRecapHistory,
} from "@/lib/automation/monthly-program-recap";

export const metadata: Metadata = { title: "Récap automatique — EasyCom IA" };

function monthKeyInTimezone(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
  }).format(date);
}

function previousMonthKey(timezone: string) {
  const current = monthKeyInTimezone(new Date(), timezone);
  const [year, month] = current.split("-").map(Number);
  const previous = new Date(Date.UTC(year, month - 2, 1));
  return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, "0")}`;
}

function validMonthKey(value: string | undefined, timezone: string) {
  return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : previousMonthKey(timezone);
}

function monthBounds(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, month - 1, 1)).toISOString(),
    end: new Date(Date.UTC(year, month, 1)).toISOString(),
  };
}

export default async function RecapAutoPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; eventId?: string; month?: string }>;
}) {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const admin = createAdminClient();
  const params = await searchParams;
  const now = new Date();
  const nowIso = now.toISOString();

  const { data: community } = await admin
    .from("Community")
    .select("id, name, logoUrl, city, timezone, tone, plan")
    .eq("id", communityId)
    .single();

  const timezone = community?.timezone ?? "Europe/Paris";
  const targetMonth = validMonthKey(params.month, timezone);
  const bounds = monthBounds(targetMonth);
  const recentSince = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000).toISOString();

  const [recentResult, monthResult, eventAutomationResult, monthlyAutomationResult, channelsResult] = await Promise.all([
    admin
      .from("Event")
      .select("id, title, startDate, endDate, coverImageUrl, status, location, mediaFiles:MediaFile(url,type)")
      .eq("communityId", communityId)
      .gte("startDate", recentSince)
      .lte("startDate", nowIso)
      .order("startDate", { ascending: false })
      .limit(60),
    admin
      .from("Event")
      .select("id, title, startDate, endDate, coverImageUrl, status, location, mediaFiles:MediaFile(url,type)")
      .eq("communityId", communityId)
      .gte("startDate", bounds.start)
      .lt("startDate", bounds.end)
      .lte("startDate", nowIso)
      .order("startDate", { ascending: true })
      .limit(100),
    admin
      .from("Automation")
      .select("id, name, isActive, status, nextRunAt, triggerConfig, updatedAt")
      .eq("communityId", communityId)
      .eq("trigger", "DAILY")
      .order("updatedAt", { ascending: false })
      .limit(50),
    admin
      .from("Automation")
      .select("id, name, isActive, status, nextRunAt, triggerConfig, updatedAt")
      .eq("communityId", communityId)
      .eq("trigger", "CUSTOM_SCHEDULE")
      .order("updatedAt", { ascending: false })
      .limit(50),
    admin
      .from("Channel")
      .select("type, isActive, isConnected")
      .eq("communityId", communityId)
      .in("type", ["FACEBOOK", "INSTAGRAM"]),
  ]);

  const eventAutomation = (eventAutomationResult.data ?? []).find((row) => getRecapSettingsFromTriggerConfig(row.triggerConfig)) ?? null;
  const monthlyAutomation = (monthlyAutomationResult.data ?? []).find((row) => getMonthlySettings(row.triggerConfig)) ?? null;
  const eventSettings = eventAutomation
    ? getRecapSettingsFromTriggerConfig(eventAutomation.triggerConfig) ?? { ...DEFAULT_RECAP_SETTINGS, timezone }
    : { ...DEFAULT_RECAP_SETTINGS, timezone };
  const monthlySettings = monthlyAutomation
    ? getMonthlySettings(monthlyAutomation.triggerConfig) ?? { ...DEFAULT_MONTHLY_SETTINGS, timezone }
    : { ...DEFAULT_MONTHLY_SETTINGS, timezone };

  const eventMap = new Map<string, NonNullable<typeof recentResult.data>[number]>();
  for (const event of [...(recentResult.data ?? []), ...(monthResult.data ?? [])]) {
    const finishedAt = new Date(event.endDate ?? event.startDate);
    if (finishedAt <= now) eventMap.set(event.id, event);
  }

  if (params.eventId && !eventMap.has(params.eventId)) {
    const { data: focusedEvent } = await admin
      .from("Event")
      .select("id, title, startDate, endDate, coverImageUrl, status, location, mediaFiles:MediaFile(url,type)")
      .eq("communityId", communityId)
      .eq("id", params.eventId)
      .maybeSingle();
    if (focusedEvent && new Date(focusedEvent.endDate ?? focusedEvent.startDate) <= now) eventMap.set(focusedEvent.id, focusedEvent);
  }

  const allFinishedEvents = Array.from(eventMap.values()).sort(
    (left, right) => new Date(right.startDate).getTime() - new Date(left.startDate).getTime()
  );
  const monthlyEventIds = new Set((monthResult.data ?? []).map((event) => event.id));

  return (
    <RecapAutoClient
      community={community!}
      events={allFinishedEvents.map((event) => ({ ...event, inTargetMonth: monthlyEventIds.has(event.id) }))}
      targetMonth={targetMonth}
      focusScope={params.scope === "event" ? "event" : params.scope === "monthly" ? "monthly" : null}
      focusEventId={params.eventId ?? null}
      eventAutomation={eventAutomation as Parameters<typeof RecapAutoClient>[0]["eventAutomation"]}
      monthlyAutomation={monthlyAutomation as Parameters<typeof RecapAutoClient>[0]["monthlyAutomation"]}
      eventSettings={eventSettings}
      monthlySettings={monthlySettings}
      eventHistory={eventAutomation ? getEventRecapHistory(eventAutomation.triggerConfig) : {}}
      monthlyHistory={monthlyAutomation ? getMonthlyRecapHistory(monthlyAutomation.triggerConfig) : {}}
      legacyProgramHistory={monthlyAutomation ? getProgramHistory(monthlyAutomation.triggerConfig) : {}}
      connectedChannels={(channelsResult.data ?? []).filter((channel) => channel.isActive && channel.isConnected).map((channel) => channel.type)}
    />
  );
}
