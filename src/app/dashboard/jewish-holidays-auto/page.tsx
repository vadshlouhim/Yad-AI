import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildHolidayItems,
  getNextAnnualHoliday,
  type HolidayCalendarRow,
} from "@/lib/automation/jewish-holidays";
import { resolveTemplateAssetUrl } from "@/lib/templates/shared";
import { JewishHolidaysAutoClient } from "@/components/jewish-holidays/jewish-holidays-auto-client";
import { getLocale, getTranslations } from "next-intl/server";
import type { OutputLocale } from "@/lib/ai/output-locale";

export async function generateMetadata() {
  const t = await getTranslations("holidays");
  return { title: `${t("title")} — EasyCom IA` };
}

export default async function JewishHolidaysAutoPage() {
  const interfaceLocale = (await getLocale()) as OutputLocale;
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const admin = createAdminClient();
  const now = new Date();
  const calendarYears = [now.getFullYear(), now.getFullYear() + 1];

  const { data: community } = await admin
    .from("Community")
    .select("id, name, logoUrl, city, country, timezone, plan")
    .eq("id", communityId)
    .single();

  const country = community?.country && community.country !== "Other" ? community.country : "France";

  const [{ data: holidayRows }, { data: templates }, { data: automationRows }, { data: channels }] = await Promise.all([
    admin
      .from("HebrewCalendarReference")
      .select("*")
      .in("calendar_year", calendarYears)
      .in("entry_type", ["HOLIDAY", "HASSIDIC_DATE"])
      .or(`country.eq.${country},country.is.null`)
      .gte("gregorian_date", now.toISOString().slice(0, 10))
      .order("gregorian_date", { ascending: true })
      .limit(240),
    admin
      .from("Template")
      .select("*")
      .eq("isActive", true)
      .eq("category", "HOLIDAY")
      .contains("languages", [interfaceLocale])
      .contains("tags", ["usage:holiday-times"])
      .not("tags", "cs", "{legacy}")
      .or(`isGlobal.eq.true,communityId.eq.${communityId}`)
      .order("usageCount", { ascending: false })
      .limit(120),
    admin
      .from("Automation")
      .select("id, name, isActive, status, nextRunAt, triggerConfig, updatedAt")
      .eq("communityId", communityId)
      .eq("trigger", "JEWISH_HOLIDAY")
      .eq("name", "Fetes juives et Hassidiques")
      .order("updatedAt", { ascending: false })
      .limit(1),
    admin
      .from("Channel")
      .select("id, name, type, isActive, isConnected, settings, pageId, handle")
      .eq("communityId", communityId)
      .in("type", ["FACEBOOK", "INSTAGRAM", "WHATSAPP", "TELEGRAM", "EMAIL"])
      .order("type", { ascending: true }),
  ]);

  const holidays = buildHolidayItems((holidayRows ?? []) as HolidayCalendarRow[], now);
  const nextHoliday = getNextAnnualHoliday(holidays, now);
  const hydratedTemplates = (templates ?? []).map((template) => ({
    ...template,
    thumbnailUrl: template.tags?.includes("crop:right-clean") ? `/api/jewish-holidays-auto/background/${template.id}` : resolveTemplateAssetUrl(template.thumbnailUrl),
    previewUrl: template.tags?.includes("crop:right-clean") ? `/api/jewish-holidays-auto/background/${template.id}` : resolveTemplateAssetUrl(template.previewUrl),
  }));

  return (
    <JewishHolidaysAutoClient
      community={{
        id: community?.id ?? communityId,
        name: community?.name ?? "Votre structure",
        logoUrl: community?.logoUrl ?? null,
        city: community?.city ?? null,
        country,
        timezone: community?.timezone ?? "Europe/Paris",
        plan: community?.plan ?? "FREE_TRIAL",
      }}
      holidays={holidays}
      nextHoliday={nextHoliday}
      allTemplates={hydratedTemplates}
      initialAutomation={automationRows?.[0] ?? null}
      channels={channels ?? []}
      interfaceLocale={interfaceLocale}
    />
  );
}
