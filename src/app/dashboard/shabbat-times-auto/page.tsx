import { notFound } from "next/navigation";
import { readPosterEditState } from "@/lib/templates/edit-state";
import { getPosterSource } from "@/lib/templates/edit-source";
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

export const metadata: Metadata = { title: "Horaires Chabbat et Fêtes — EasyCom IA" };

export default async function ShabbatTimesAutoPage({ searchParams }: { searchParams: Promise<{ mediaId?: string | string[] }> }) {
  const query = await searchParams;
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const admin = createAdminClient();

  const { data: community } = await admin
    .from("Community")
    .select("id, name, logoUrl, city, country, timezone, tone, phone, email, website, address, religiousStream, plan")
    .eq("id", communityId)
    .single();

  const [{ data: templates }, { data: automationRows }, { data: socialChannels }] =
    await Promise.all([
      admin
        .from("Template")
        .select("*")
        .eq("isActive", true)
        .eq("category", "SHABBAT")
        .contains("tags", ["usage:shabbat-times"])
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

  const hydratedTemplates = (templates ?? []).map((template) => ({
    ...template,
    thumbnailUrl: resolveTemplateAssetUrl(template.thumbnailUrl),
    previewUrl: resolveTemplateAssetUrl(template.previewUrl),
  }));

  const config = automationRows?.[0]?.triggerConfig;
  const poster = config && typeof config === "object" && !Array.isArray(config) ? config.shabbatPoster : null;
  const sourceId = poster && typeof poster === "object" && !Array.isArray(poster) ? poster.draftSourceMediaId ?? poster.sourceMediaId : null;
  const source = await getPosterSource(admin, communityId, typeof query.mediaId === "string" ? query.mediaId : sourceId).catch(() => null);
  if (query.mediaId && !source) notFound();
  if (query.mediaId && source && !hydratedTemplates.some((template) => template.id === source.templateId)) notFound();
  const editState = readPosterEditState(source?.editState);
  const savedFields = poster && typeof poster === "object" && !Array.isArray(poster) && poster.fields && typeof poster.fields === "object" && !Array.isArray(poster.fields) ? poster.fields : {};
  const aliases: Record<string, string> = { organization: "structureName", location: "city", Organisation: "structureName", Ville: "city" };
  const sourceFields = editState ? Object.fromEntries(editState.changes.map((change) => [aliases[change.label] ?? change.label, change.newText])) : {};
  const automation = source && query.mediaId ? {
    ...(automationRows?.[0] ?? { id: "", isActive: false, status: "DRAFT" }),
    triggerConfig: { ...(config && typeof config === "object" && !Array.isArray(config) ? config : {}), shabbatPoster: { ...(poster && typeof poster === "object" && !Array.isArray(poster) ? poster : {}), selectedTemplateId: source.templateId, draftSourceMediaId: source.id, fields: { ...savedFields, ...sourceFields, logoUrl: editState?.logoUrl ?? community?.logoUrl ?? "" } } },
  } : automationRows?.[0] ?? null;
  const liveShabbat = await getShabbatTimes({
    city: typeof sourceFields.city === "string" && query.mediaId ? sourceFields.city : typeof savedFields.city === "string" ? savedFields.city : community?.city ?? undefined,
    country: community?.country ?? undefined,
    timezone: community?.timezone ?? "Europe/Paris",
  });

  // Source unique : API REST Hebcal.
  const shabbat: ShabbatCardItem | null = liveShabbat
    ? {
        cityName: liveShabbat.cityName ?? community?.city ?? null,
        date: liveShabbat.date,
        entry: liveShabbat.entry ?? liveShabbat.candleLighting ?? null,
        exit: liveShabbat.exit ?? liveShabbat.havdalah ?? null,
        hebrewDate: liveShabbat.hebrewDate ?? null,
        parasha: liveShabbat.parasha ?? null,
      }
    : null;

  const simpleTemplates = filterShabbatTemplatesByMode(hydratedTemplates, "simple");
  return (
    <ShabbatTimesSimpleClient
      templates={simpleTemplates as Parameters<typeof ShabbatTimesSimpleClient>[0]["templates"]}
      community={community!}
      shabbat={shabbat}
      key={source?.id ?? "shabbat"}
      initialAutomation={automation}
      initialPoster={source ? { id: source.id, imageUrl: source.url } : null}
      socialChannels={(socialChannels ?? []) as Parameters<typeof ShabbatTimesSimpleClient>[0]["socialChannels"]}
    />
  );
}
