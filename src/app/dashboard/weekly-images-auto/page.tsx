import type { Metadata } from "next";
import { WeeklyImagesAutoClient } from "@/components/weekly-images/weekly-images-auto-client";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_WEEKLY_IMAGES_SETTINGS,
  getWeeklyImagesSettings,
  getWeeklyImagesHistory,
} from "@/lib/automation/weekly-images";

export const metadata: Metadata = { title: "Cette semaine en images — EasyCom IA" };

export default async function WeeklyImagesAutoPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const admin = createAdminClient();

  const [{ data: community }, { data: automationRows }] = await Promise.all([
    admin.from("Community").select("id, name, logoUrl, city, timezone, tone, plan").eq("id", communityId).single(),
    admin
      .from("Automation")
      .select("id, name, isActive, status, nextRunAt, triggerConfig, updatedAt")
      .eq("communityId", communityId)
      .eq("trigger", "CUSTOM_SCHEDULE")
      .order("updatedAt", { ascending: false })
      .limit(50),
  ]);

  const automation = (automationRows ?? []).find((row) => getWeeklyImagesSettings(row.triggerConfig)) ?? null;
  const settings = automation
    ? getWeeklyImagesSettings(automation.triggerConfig) ?? {
        ...DEFAULT_WEEKLY_IMAGES_SETTINGS,
        timezone: community?.timezone ?? "Europe/Paris",
      }
    : { ...DEFAULT_WEEKLY_IMAGES_SETTINGS, timezone: community?.timezone ?? "Europe/Paris" };
  const history = automation ? getWeeklyImagesHistory(automation.triggerConfig) : [];

  return (
    <WeeklyImagesAutoClient
      community={community!}
      automation={automation as Parameters<typeof WeeklyImagesAutoClient>[0]["automation"]}
      settings={settings}
      history={history}
    />
  );
}
