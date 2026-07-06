import type { Metadata } from "next";
import { MonthlyProgramRecapAutoClient } from "@/components/monthly-program-recap/monthly-program-recap-auto-client";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_MONTHLY_SETTINGS,
  getMonthlySettings,
  getProgramHistory,
  getRecapHistory,
} from "@/lib/automation/monthly-program-recap";

export const metadata: Metadata = { title: "Programme du mois — EasyCom IA" };

export default async function MonthlyProgramRecapAutoPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const admin = createAdminClient();
  const { type } = await searchParams;

  const now = new Date();
  const nowIso = now.toISOString();

  const [{ data: community }, { data: upcoming }, { data: automationRows }] = await Promise.all([
    admin.from("Community").select("id, name, logoUrl, city, timezone, tone, plan").eq("id", communityId).single(),
    admin
      .from("Event")
      .select("id, title, startDate, endDate, coverImageUrl, status")
      .eq("communityId", communityId)
      .neq("status", "ARCHIVED")
      .gte("startDate", nowIso)
      .order("startDate", { ascending: true })
      .limit(40),
    admin
      .from("Automation")
      .select("id, name, isActive, status, nextRunAt, triggerConfig, updatedAt")
      .eq("communityId", communityId)
      .eq("trigger", "CUSTOM_SCHEDULE")
      .order("updatedAt", { ascending: false })
      .limit(50),
  ]);

  const automation = (automationRows ?? []).find((row) => getMonthlySettings(row.triggerConfig)) ?? null;
  const settings = automation
    ? getMonthlySettings(automation.triggerConfig) ?? { ...DEFAULT_MONTHLY_SETTINGS, timezone: community?.timezone ?? "Europe/Paris" }
    : { ...DEFAULT_MONTHLY_SETTINGS, timezone: community?.timezone ?? "Europe/Paris" };

  return (
    <MonthlyProgramRecapAutoClient
      community={community!}
      upcomingEvents={(upcoming ?? []) as Parameters<typeof MonthlyProgramRecapAutoClient>[0]["upcomingEvents"]}
      automation={automation as Parameters<typeof MonthlyProgramRecapAutoClient>[0]["automation"]}
      settings={settings}
      programHistory={automation ? getProgramHistory(automation.triggerConfig) : {}}
      recapHistory={automation ? getRecapHistory(automation.triggerConfig) : {}}
      focusType={type === "recap" ? "recap" : type === "program" ? "program" : null}
    />
  );
}
