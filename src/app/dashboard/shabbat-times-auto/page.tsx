import type { Metadata } from "next";
import { ShabbatTimesSimpleClient } from "@/components/shabbat-times/shabbat-times-simple-client";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getShabbatTimes } from "@/lib/automation/hebcal";
import {
  filterShabbatTemplatesByMode,
  type ShabbatCardItem,
} from "@/lib/automation/shabbat-times";
import { resolveTemplateAssetUrl } from "@/lib/templates/shared";

export const metadata: Metadata = { title: "Horaires de Chabbat — EasyCom IA" };

export default async function ShabbatTimesAutoPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const admin = createAdminClient();

  const { data: community } = await admin
    .from("Community")
    .select("id, name, logoUrl, city, timezone, tone, phone, email, website, address, religiousStream, plan")
    .eq("id", communityId)
    .single();

  const [{ data: templates }, { data: automationRows }, { data: socialChannels }] =
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
    ]);

  const liveShabbat = await getShabbatTimes({
    city: community?.city ?? "Paris",
    timezone: community?.timezone ?? "Europe/Paris",
  });

  // Source unique : API REST Hebcal.
  const shabbat: ShabbatCardItem | null = liveShabbat
    ? {
        cityName: community?.city ?? "Paris",
        date: liveShabbat.date,
        entry: liveShabbat.entry ?? liveShabbat.candleLighting ?? null,
        exit: liveShabbat.exit ?? liveShabbat.havdalah ?? null,
        hebrewDate: liveShabbat.hebrewDate ?? null,
        parasha: liveShabbat.parasha ?? null,
      }
    : null;

  const hydratedTemplates = (templates ?? []).map((template) => ({
    ...template,
    thumbnailUrl: resolveTemplateAssetUrl(template.thumbnailUrl),
    previewUrl: resolveTemplateAssetUrl(template.previewUrl),
  }));

  const simpleTemplates = filterShabbatTemplatesByMode(hydratedTemplates, "simple");
  return (
    <ShabbatTimesSimpleClient
      templates={simpleTemplates as Parameters<typeof ShabbatTimesSimpleClient>[0]["templates"]}
      community={community!}
      shabbat={shabbat}
      initialAutomation={automationRows?.[0] ?? null}
      socialChannels={(socialChannels ?? []) as Parameters<typeof ShabbatTimesSimpleClient>[0]["socialChannels"]}
    />
  );
}
