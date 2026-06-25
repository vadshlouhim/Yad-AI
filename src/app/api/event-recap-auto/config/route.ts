import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateContent } from "@/lib/ai/engine";
import { createPublicationsFromDraft, publishToAllChannels } from "@/lib/publishing/publisher";
import {
  POST_EVENT_RECAP_AUTOMATION_NAME,
  RECAP_CHANNELS,
  DEFAULT_RECAP_SETTINGS,
  DEFAULT_RECAP_TIME,
  nextDailyRunAt,
  nextAllowedRecapDate,
  addDaysISO,
  dateISOInTz,
  getRecapSettingsFromTriggerConfig,
  getRecapHistory,
  type EventRecapSettings,
  type RecapChannel,
  type RecapHistory,
} from "@/lib/automation/event-recap";
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
  const time = typeof value === "string" ? value.trim() : DEFAULT_RECAP_TIME;
  return /^\d{2}:\d{2}$/.test(time) ? time : DEFAULT_RECAP_TIME;
}

function normalizeChannels(value: unknown): RecapChannel[] {
  if (!Array.isArray(value)) return [...DEFAULT_RECAP_SETTINGS.channels];
  const valid = value.filter((c): c is RecapChannel => (RECAP_CHANNELS as readonly string[]).includes(c as string));
  return valid.length > 0 ? valid : [...DEFAULT_RECAP_SETTINGS.channels];
}

function sanitizeSettings(value: unknown, existing: EventRecapSettings): EventRecapSettings {
  if (!isRecord(value)) return existing;
  return {
    status: value.status === "paused" ? "paused" : "active",
    notificationTime: normalizeTime(value.notificationTime ?? existing.notificationTime),
    timezone: stringOrEmpty(value.timezone) || existing.timezone,
    channels: normalizeChannels(value.channels ?? existing.channels),
  };
}

// requiresValidation est TOUJOURS true pour cette automatisation (photos d'événement).
function buildActions(channels: RecapChannel[]): Json {
  return [
    { type: "GENERATE_CONTENT", contentType: "EVENT_RECAP", channels, requiresValidation: true },
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
  if (!profile?.communityId) {
    return { error: NextResponse.json({ error: "Communauté introuvable" }, { status: 403 }) };
  }
  return { admin, communityId: profile.communityId };
}

async function findRecapAutomation(admin: Admin, communityId: string): Promise<AutomationRow | null> {
  const { data } = await admin
    .from("Automation")
    .select("*")
    .eq("communityId", communityId)
    .eq("trigger", "DAILY")
    .order("updatedAt", { ascending: false })
    .limit(50);

  const rows = (data ?? []) as AutomationRow[];
  return rows.find((row) => getRecapSettingsFromTriggerConfig(row.triggerConfig)) ?? null;
}

async function getTimezone(admin: Admin, communityId: string) {
  const { data } = await admin.from("Community").select("timezone").eq("id", communityId).single();
  return data?.timezone ?? "Europe/Paris";
}

async function upsertRecapAutomation(
  admin: Admin,
  communityId: string,
  existing: AutomationRow | null,
  settings: EventRecapSettings,
  history: RecapHistory,
  state: { isActive: boolean; status: "ACTIVE" | "PAUSED" | "DRAFT"; nextRunAt: string | null }
) {
  const base = (existing?.triggerConfig ?? {}) as Record<string, unknown>;
  const triggerConfig = {
    ...base,
    repeat: "daily",
    eventRecapSettings: settings,
    recapHistory: history,
  } as unknown as Json;

  const payload = {
    name: POST_EVENT_RECAP_AUTOMATION_NAME,
    description: "Rappelle de publier les photos après chaque événement, le lendemain hors Chabbat et Yom Tov.",
    trigger: "DAILY" as const,
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

    const existing = await findRecapAutomation(admin, communityId);
    const timezone = await getTimezone(admin, communityId);
    const currentSettings: EventRecapSettings = existing
      ? getRecapSettingsFromTriggerConfig(existing.triggerConfig) ?? { ...DEFAULT_RECAP_SETTINGS, timezone }
      : { ...DEFAULT_RECAP_SETTINGS, timezone };
    const history: RecapHistory = existing ? { ...getRecapHistory(existing.triggerConfig) } : {};

    // ── pause ──
    if (mode === "pause") {
      const settings: EventRecapSettings = { ...currentSettings, status: "paused" };
      const automation = await upsertRecapAutomation(admin, communityId, existing, settings, history, {
        isActive: false,
        status: "PAUSED",
        nextRunAt: null,
      });
      return NextResponse.json(automation);
    }

    // ── save-config / activate / update-notification-detail ──
    if (mode === "save-config" || mode === "activate" || mode === "update-notification-detail") {
      const settings = sanitizeSettings(body.settings, currentSettings);
      const active = mode === "activate" ? true : mode === "save-config" ? existing?.isActive ?? false : existing?.isActive ?? true;
      const status: "ACTIVE" | "PAUSED" | "DRAFT" = active ? "ACTIVE" : existing?.status === "PAUSED" ? "PAUSED" : "DRAFT";
      const effectiveSettings: EventRecapSettings = { ...settings, status: active ? "active" : settings.status };
      const automation = await upsertRecapAutomation(admin, communityId, existing, effectiveSettings, history, {
        isActive: active,
        status,
        nextRunAt: active ? nextDailyRunAt(effectiveSettings, now).toISOString() : existing?.nextRunAt ?? null,
      });
      return NextResponse.json(automation);
    }

    // ── ignore-event ──
    if (mode === "ignore-event") {
      const eventId = stringOrEmpty(body.eventId);
      if (!eventId) return NextResponse.json({ error: "Événement manquant." }, { status: 400 });
      history[eventId] = { status: "IGNORED" };
      const automation = await upsertRecapAutomation(admin, communityId, existing, currentSettings, history, {
        isActive: existing?.isActive ?? true,
        status: (existing?.status as "ACTIVE" | "PAUSED" | "DRAFT") ?? "ACTIVE",
        nextRunAt: existing?.nextRunAt ?? null,
      });
      return NextResponse.json(automation);
    }

    // ── postpone-event (Plus tard : relance le lendemain) ──
    if (mode === "postpone-event") {
      const eventId = stringOrEmpty(body.eventId);
      if (!eventId) return NextResponse.json({ error: "Événement manquant." }, { status: 400 });
      const tomorrow = addDaysISO(dateISOInTz(now, timezone), 1);
      history[eventId] = { status: "POSTPONED", postponedUntil: nextAllowedRecapDate(tomorrow, timezone) };
      const automation = await upsertRecapAutomation(admin, communityId, existing, currentSettings, history, {
        isActive: existing?.isActive ?? true,
        status: (existing?.status as "ACTIVE" | "PAUSED" | "DRAFT") ?? "ACTIVE",
        nextRunAt: existing?.nextRunAt ?? null,
      });
      return NextResponse.json(automation);
    }

    // ── prepare-recap : génère un texte de publication unique ──
    if (mode === "prepare-recap") {
      const eventId = stringOrEmpty(body.eventId);
      if (!eventId) return NextResponse.json({ error: "Événement manquant." }, { status: 400 });
      const { data: event } = await admin.from("Event").select("id, title").eq("id", eventId).eq("communityId", communityId).maybeSingle();
      if (!event) return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });
      const generated = await generateContent({
        communityId,
        contentType: "EVENT_RECAP" as never,
        eventId,
      });
      return NextResponse.json({ caption: generated.body, eventName: event.title });
    }

    // ── publish-recap : crée le draft + publie (validation humaine déjà faite) ──
    if (mode === "publish-recap") {
      const eventId = stringOrEmpty(body.eventId);
      const caption = stringOrEmpty(body.caption);
      const channels = normalizeChannels(body.channels);
      const photoUrls = Array.isArray(body.photoUrls) ? (body.photoUrls as unknown[]).map(String).filter(Boolean) : [];
      if (!eventId) return NextResponse.json({ error: "Événement manquant." }, { status: 400 });
      if (!caption) return NextResponse.json({ error: "Le texte de la publication est vide." }, { status: 400 });
      if (photoUrls.length === 0) return NextResponse.json({ error: "Ajoutez au moins une photo." }, { status: 400 });

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
        eventId,
        title: "Récap après événement",
        body: caption,
        imageUrl: photoUrls[0],
        contentType: "EVENT_RECAP" as never,
        status: "APPROVED",
        aiGenerated: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      } as never);

      const channelIds = socialChannels.map((c) => c.id);
      await createPublicationsFromDraft({ draftId, communityId, channelIds });
      const results = await publishToAllChannels(draftId, channelIds);

      history[eventId] = { status: "PUBLISHED", publishedAt: nowIso, draftId };
      await upsertRecapAutomation(admin, communityId, existing, currentSettings, history, {
        isActive: existing?.isActive ?? true,
        status: (existing?.status as "ACTIVE" | "PAUSED" | "DRAFT") ?? "ACTIVE",
        nextRunAt: existing?.nextRunAt ?? null,
      });

      return NextResponse.json({ success: true, draftId, results });
    }

    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  } catch (error) {
    console.error("[Event Recap Auto Config]", error);
    return NextResponse.json({ error: "Enregistrement impossible" }, { status: 500 });
  }
}
