import type { Metadata } from "next";
import { ShabbatTimesAutoClient } from "@/components/shabbat-times/shabbat-times-auto-client";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getShabbatTimes } from "@/lib/automation/hebcal";
import {
  filterShabbatTemplatesByMode,
  findCityScheduleForYear,
  getNextShabbatFromSchedule,
  type ShabbatCardItem,
  type ShabbatScheduleItem,
} from "@/lib/automation/shabbat-times";
import { resolveTemplateAssetUrl } from "@/lib/templates/shared";

export const metadata: Metadata = { title: "Horaires de Chabbat — EasyCom IA" };

export default async function ShabbatTimesAutoPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const admin = createAdminClient();
  const now = new Date();

  const { data: community } = await admin
    .from("Community")
    .select("id, name, logoUrl, city, timezone, tone, phone, email, website, address, religiousStream, plan")
    .eq("id", communityId)
    .single();

  const calendarYears = [now.getFullYear(), now.getFullYear() + 1];
  const [{ data: templates }, { data: automationRows }, { data: socialChannels }, currentYearScheduleRow, nextYearScheduleRow] =
    await Promise.all([
      admin
        .from("Template")
        .select("*")
        .eq("isActive", true)
        .eq("category", "SHABBAT")
        .or(`isGlobal.eq.true,communityId.eq.${communityId}`)
        .order("usageCount", { ascending: false }),
      admin
        .from("Automation")
        .select("id, name, isActive, status, nextRunAt, triggerConfig, updatedAt")
        .eq("communityId", communityId)
        .eq("trigger", "WEEKLY_SHABBAT")
        .order("updatedAt", { ascending: false })
        .limit(1),
      admin
        .from("Channel")
        .select("type, name, handle, pageId, settings, isConnected, isActive")
        .eq("communityId", communityId)
        .in("type", ["INSTAGRAM", "FACEBOOK"])
        .eq("isActive", true),
      findCityScheduleForYear(admin, community?.city, calendarYears[0]),
      findCityScheduleForYear(admin, community?.city, calendarYears[1]),
    ]);

  const currentYearSchedule = Array.isArray(currentYearScheduleRow?.shabbat_schedule)
    ? (currentYearScheduleRow.shabbat_schedule as ShabbatScheduleItem[])
    : [];
  const nextYearSchedule = Array.isArray(nextYearScheduleRow?.shabbat_schedule)
    ? (nextYearScheduleRow.shabbat_schedule as ShabbatScheduleItem[])
    : [];
  const nextShabbatFromDatabase =
    getNextShabbatFromSchedule(currentYearSchedule, now) ?? getNextShabbatFromSchedule(nextYearSchedule, now);

  let shabbat: ShabbatCardItem | null = nextShabbatFromDatabase
    ? {
        cityName: currentYearScheduleRow?.city_name ?? nextYearScheduleRow?.city_name ?? community?.city ?? null,
        date: nextShabbatFromDatabase.gregorian_date,
        entry: nextShabbatFromDatabase.shabbat_entry_time ?? null,
        exit: nextShabbatFromDatabase.shabbat_exit_time ?? null,
        hebrewDate: nextShabbatFromDatabase.hebrew_date ?? null,
        parasha: nextShabbatFromDatabase.parasha ?? null,
      }
    : null;

  if (!shabbat) {
    const liveShabbat = await getShabbatTimes({
      city: community?.city ?? "Paris",
      timezone: community?.timezone ?? "Europe/Paris",
    });

    shabbat = liveShabbat
      ? {
          cityName: community?.city ?? "Paris",
          date: liveShabbat.date,
          entry: liveShabbat.entry ?? liveShabbat.candleLighting ?? null,
          exit: liveShabbat.exit ?? liveShabbat.havdalah ?? null,
          hebrewDate: liveShabbat.hebrewDate ?? null,
          parasha: liveShabbat.parasha ?? null,
        }
      : null;
  }

  const hydratedTemplates = (templates ?? []).map((template) => ({
    ...template,
    thumbnailUrl: resolveTemplateAssetUrl(template.thumbnailUrl),
    previewUrl: resolveTemplateAssetUrl(template.previewUrl),
  }));

  const simpleTemplates = filterShabbatTemplatesByMode(hydratedTemplates, "simple");
  const detailedTemplates = filterShabbatTemplatesByMode(hydratedTemplates, "detailed");

  return (
    <ShabbatTimesAutoClient
      templates={{
        simple: simpleTemplates as Parameters<typeof ShabbatTimesAutoClient>[0]["templates"]["simple"],
        detailed: detailedTemplates as Parameters<typeof ShabbatTimesAutoClient>[0]["templates"]["detailed"],
      }}
      community={community!}
      shabbat={shabbat}
      initialAutomation={automationRows?.[0] ?? null}
      socialChannels={(socialChannels ?? []) as Parameters<typeof ShabbatTimesAutoClient>[0]["socialChannels"]}
    />
  );
}
