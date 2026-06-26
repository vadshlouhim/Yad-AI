import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicationsFromDraft, publishToAllChannels } from "@/lib/publishing/publisher";
import {
  WEEKLY_IMAGES_AUTOMATION_NAME,
  WEEKLY_IMAGES_CHANNELS,
  DEFAULT_WEEKLY_IMAGES_SETTINGS,
  DEFAULT_WEEKLY_IMAGES_TIME,
  DEFAULT_WEEKLY_IMAGES_DAY,
  MAX_WEEKLY_PHOTOS,
  nextWeeklyImagesRunAt,
  defaultWeeklyImagesCaption,
  getWeeklyImagesSettings,
  getWeeklyImagesHistory,
  type WeeklyImagesSettings,
  type WeeklyImagesChannel,
  type WeeklyImagesHistory,
} from "@/lib/automation/weekly-images";
import type { Database, Json } from "@/types/database.types";

type AutomationRow = Database["public"]["Tables"]["Automation"]["Row"];
type Admin = ReturnType<typeof createAdminClient>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
function stringOrEmpty(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
function normalizeTime(value: unknown) {
  const time = typeof value === "string" ? value.trim() : DEFAULT_WEEKLY_IMAGES_TIME;
  return /^\d{2}:\d{2}$/.test(time) ? time : DEFAULT_WEEKLY_IMAGES_TIME;
}
function normalizeDay(value: unknown): number {
  const day = typeof value === "number" ? value : Number(value);
  return Number.isInteger(day) && day >= 0 && day <= 6 ? day : DEFAULT_WEEKLY_IMAGES_DAY;
}
function normalizeChannels(value: unknown): WeeklyImagesChannel[] {
  if (!Array.isArray(value)) return [...DEFAULT_WEEKLY_IMAGES_SETTINGS.channels];
  const valid = value.filter((c): c is WeeklyImagesChannel =>
    (WEEKLY_IMAGES_CHANNELS as readonly string[]).includes(c as string)
  );
  return valid.length > 0 ? valid : [...DEFAULT_WEEKLY_IMAGES_SETTINGS.channels];
}

function sanitizeSettings(value: unknown, existing: WeeklyImagesSettings): WeeklyImagesSettings {
  if (!isRecord(value)) return existing;
  return {
    status: value.status === "paused" ? "paused" : "active",
    notificationDay: normalizeDay(value.notificationDay ?? existing.notificationDay),
    notificationTime: normalizeTime(value.notificationTime ?? existing.notificationTime),
    timezone: stringOrEmpty(value.timezone) || existing.timezone,
    selectedBackgroundTemplateId:
      stringOrEmpty(value.selectedBackgroundTemplateId) || existing.selectedBackgroundTemplateId || null,
    channels: normalizeChannels(value.channels ?? existing.channels),
  };
}

// requiresValidation TOUJOURS true (photos d'événements, validation humaine).
function buildActions(channels: WeeklyImagesChannel[]): Json {
  return [
    { type: "GENERATE_CONTENT", contentType: "WEEKLY_IMAGES_POST", channels, requiresValidation: true },
    { type: "CREATE_PUBLICATION", requiresValidation: true },
  ] as unknown as Json;
}

async function getAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
  if (!profile?.communityId) return { error: NextResponse.json({ error: "Communauté introuvable" }, { status: 403 }) };
  return { admin, communityId: profile.communityId };
}

async function findWeeklyImagesAutomation(admin: Admin, communityId: string): Promise<AutomationRow | null> {
  const { data } = await admin
    .from("Automation")
    .select("*")
    .eq("communityId", communityId)
    .eq("trigger", "CUSTOM_SCHEDULE")
    .order("updatedAt", { ascending: false })
    .limit(50);
  const rows = (data ?? []) as AutomationRow[];
  return rows.find((row) => getWeeklyImagesSettings(row.triggerConfig)) ?? null;
}

async function getCommunity(admin: Admin, communityId: string) {
  const { data } = await admin.from("Community").select("name, city, timezone").eq("id", communityId).single();
  return data ?? { name: null, city: null, timezone: "Europe/Paris" };
}

async function upsertWeeklyImagesAutomation(
  admin: Admin,
  communityId: string,
  existing: AutomationRow | null,
  settings: WeeklyImagesSettings,
  history: WeeklyImagesHistory,
  state: { isActive: boolean; status: "ACTIVE" | "PAUSED" | "DRAFT"; nextRunAt: string | null }
) {
  const base = (existing?.triggerConfig ?? {}) as Record<string, unknown>;
  const triggerConfig = {
    ...base,
    repeat: "weekly",
    dayOfWeek: settings.notificationDay,
    time: settings.notificationTime,
    weeklyImagesSettings: settings,
    weeklyImagesHistory: history,
  } as unknown as Json;

  const payload = {
    name: WEEKLY_IMAGES_AUTOMATION_NAME,
    description: "Publie chaque semaine vos photos sur Instagram, Facebook et WhatsApp, après validation.",
    trigger: "CUSTOM_SCHEDULE" as const,
    triggerConfig,
    actions: buildActions(settings.channels),
    isActive: state.isActive,
    status: state.status,
    nextRunAt: state.nextRunAt,
    updatedAt: new Date().toISOString(),
  };

  if (existing) {
    const { data, error } = await admin
      .from("Automation")
      .update(payload)
      .eq("id", existing.id)
      .eq("communityId", communityId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await admin
    .from("Automation")
    .insert({ id: crypto.randomUUID(), communityId, eventId: null, ...payload })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function POST(request: Request) {
  try {
    const auth = await getAuth();
    if ("error" in auth) return auth.error;
    const { admin, communityId } = auth;
    const now = new Date();

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const mode = stringOrEmpty(body.mode);

    const existing = await findWeeklyImagesAutomation(admin, communityId);
    const community = await getCommunity(admin, communityId);
    const timezone = community.timezone ?? "Europe/Paris";
    const currentSettings: WeeklyImagesSettings = existing
      ? getWeeklyImagesSettings(existing.triggerConfig) ?? { ...DEFAULT_WEEKLY_IMAGES_SETTINGS, timezone }
      : { ...DEFAULT_WEEKLY_IMAGES_SETTINGS, timezone };
    const history: WeeklyImagesHistory = existing ? getWeeklyImagesHistory(existing.triggerConfig) : [];

    // ── pause ──
    if (mode === "pause") {
      const settings: WeeklyImagesSettings = { ...currentSettings, status: "paused" };
      const automation = await upsertWeeklyImagesAutomation(admin, communityId, existing, settings, history, {
        isActive: false,
        status: "PAUSED",
        nextRunAt: null,
      });
      return NextResponse.json(automation);
    }

    // ── save-selection : choix du fond ──
    if (mode === "save-selection") {
      const templateId = stringOrEmpty(body.templateId);
      if (!templateId) return NextResponse.json({ error: "Fond manquant." }, { status: 400 });
      const settings: WeeklyImagesSettings = { ...currentSettings, selectedBackgroundTemplateId: templateId };
      const automation = await upsertWeeklyImagesAutomation(admin, communityId, existing, settings, history, {
        isActive: existing?.isActive ?? false,
        status: existing?.status === "ACTIVE" ? "ACTIVE" : "DRAFT",
        nextRunAt: existing?.nextRunAt ?? null,
      });
      return NextResponse.json(automation);
    }

    // ── save-config / activate / update-notification-detail ──
    if (mode === "save-config" || mode === "activate" || mode === "update-notification-detail") {
      const settings = sanitizeSettings(body.settings, currentSettings);
      const active = mode === "activate" ? true : mode === "save-config" ? existing?.isActive ?? false : existing?.isActive ?? true;
      const status: "ACTIVE" | "PAUSED" | "DRAFT" = active ? "ACTIVE" : existing?.status === "PAUSED" ? "PAUSED" : "DRAFT";
      const effectiveSettings: WeeklyImagesSettings = { ...settings, status: active ? "active" : settings.status };
      const automation = await upsertWeeklyImagesAutomation(admin, communityId, existing, effectiveSettings, history, {
        isActive: active,
        status,
        nextRunAt: active ? nextWeeklyImagesRunAt(effectiveSettings, now).toISOString() : existing?.nextRunAt ?? null,
      });
      return NextResponse.json(automation);
    }

    // ── prepare-weekly-images : texte par défaut ──
    if (mode === "prepare-weekly-images") {
      const caption = defaultWeeklyImagesCaption({ communityName: community.name, city: community.city });
      return NextResponse.json({ caption });
    }

    // ── publish-weekly-images : crée le draft + publie ──
    if (mode === "publish-weekly-images") {
      const caption = stringOrEmpty(body.caption);
      const channels = normalizeChannels(body.channels);
      const visualUrls = Array.isArray(body.visualUrls)
        ? (body.visualUrls as unknown[]).map(String).filter(Boolean).slice(0, MAX_WEEKLY_PHOTOS)
        : [];
      if (!caption) return NextResponse.json({ error: "Le texte de la publication est vide." }, { status: 400 });
      if (visualUrls.length === 0) return NextResponse.json({ error: "Ajoutez au moins une photo." }, { status: 400 });

      const { data: socialChannels } = await admin
        .from("Channel")
        .select("id")
        .eq("communityId", communityId)
        .in("type", channels as never[])
        .eq("isActive", true);

      if (!socialChannels || socialChannels.length === 0) {
        return NextResponse.json(
          { error: "Aucun canal actif. Configurez vos réseaux dans Paramètres > Canaux." },
          { status: 409 }
        );
      }

      const draftId = crypto.randomUUID();
      const nowIso = new Date().toISOString();
      await admin.from("ContentDraft").insert({
        id: draftId,
        communityId,
        title: "Cette semaine en images",
        body: caption,
        imageUrl: visualUrls[0],
        contentType: "GENERAL" as never,
        status: "APPROVED",
        aiGenerated: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      } as never);

      const channelIds = socialChannels.map((c) => c.id);
      await createPublicationsFromDraft({ draftId, communityId, channelIds });
      const results = await publishToAllChannels(draftId, channelIds);

      const newHistory: WeeklyImagesHistory = [
        { id: crypto.randomUUID(), publishedAt: nowIso, photoCount: visualUrls.length, channels, visualUrls, draftId },
        ...history,
      ].slice(0, 52);

      await upsertWeeklyImagesAutomation(admin, communityId, existing, currentSettings, newHistory, {
        isActive: existing?.isActive ?? true,
        status: (existing?.status as "ACTIVE" | "PAUSED" | "DRAFT") ?? "ACTIVE",
        nextRunAt: existing?.nextRunAt ?? null,
      });

      return NextResponse.json({ success: true, draftId, results });
    }

    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  } catch (error) {
    console.error("[Weekly Images Auto Config]", error);
    return NextResponse.json({ error: "Enregistrement impossible" }, { status: 500 });
  }
}
