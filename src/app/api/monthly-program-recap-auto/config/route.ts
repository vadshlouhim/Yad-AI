import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateContent } from "@/lib/ai/engine";
import { createPublicationsFromDraft, publishToAllChannels } from "@/lib/publishing/publisher";
import {
  MONTHLY_PROGRAM_RECAP_AUTOMATION_NAME,
  MONTHLY_CHANNELS,
  MAX_RECAP_PHOTOS,
  DEFAULT_MONTHLY_SETTINGS,
  DEFAULT_MONTHLY_TIME,
  getNextMonthlyRun,
  getMonthlySettings,
  getProgramHistory,
  getRecapHistory,
  defaultRecapCaption,
  type MonthlySettings,
  type MonthlyChannel,
  type MonthlyHistory,
} from "@/lib/automation/monthly-program-recap";
import type { Database, Json } from "@/types/database.types";

type AutomationRow = Database["public"]["Tables"]["Automation"]["Row"];
type Admin = ReturnType<typeof createAdminClient>;
type SocialChannelRow = { id: string; type: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
function stringOrEmpty(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
function normalizeTime(value: unknown) {
  const time = typeof value === "string" ? value.trim() : DEFAULT_MONTHLY_TIME;
  return /^\d{2}:\d{2}$/.test(time) ? time : DEFAULT_MONTHLY_TIME;
}
function normalizeDay(value: unknown, fallback: number): number {
  const day = typeof value === "number" ? value : Number(value);
  return Number.isInteger(day) && day >= 0 && day <= 28 ? day : fallback;
}
function normalizeChannels(value: unknown): MonthlyChannel[] {
  if (!Array.isArray(value)) return ["INSTAGRAM", "FACEBOOK"];
  const valid = value.filter((c): c is MonthlyChannel => (MONTHLY_CHANNELS as readonly string[]).includes(c as string));
  const socialOnly = valid.filter((channel) => channel === "INSTAGRAM" || channel === "FACEBOOK");
  return socialOnly.length > 0 ? socialOnly : ["INSTAGRAM", "FACEBOOK"];
}

function sanitizeSettings(value: unknown, existing: MonthlySettings): MonthlySettings {
  if (!isRecord(value)) return existing;
  return {
    status: value.status === "paused" ? "paused" : "active",
    timezone: stringOrEmpty(value.timezone) || existing.timezone,
    programNotificationDay: normalizeDay(value.programNotificationDay ?? existing.programNotificationDay, 1) || 1,
    programNotificationTime: normalizeTime(value.programNotificationTime ?? existing.programNotificationTime),
    recapNotificationDay: 0,
    recapNotificationTime: DEFAULT_MONTHLY_TIME,
    selectedProgramBackgroundId: stringOrEmpty(value.selectedProgramBackgroundId) || existing.selectedProgramBackgroundId || null,
    selectedRecapBackgroundId: stringOrEmpty(value.selectedRecapBackgroundId) || existing.selectedRecapBackgroundId || null,
    channels: normalizeChannels(value.channels ?? existing.channels),
  };
}

// requiresValidation TOUJOURS true (validation humaine obligatoire).
function buildActions(channels: MonthlyChannel[], contentType: string): Json {
  return [
    { type: "GENERATE_CONTENT", contentType, channels, requiresValidation: true },
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

async function findMonthlyAutomation(admin: Admin, communityId: string): Promise<AutomationRow | null> {
  const { data } = await admin
    .from("Automation")
    .select("*")
    .eq("communityId", communityId)
    .eq("trigger", "CUSTOM_SCHEDULE")
    .order("updatedAt", { ascending: false })
    .limit(50);
  const rows = (data ?? []) as AutomationRow[];
  return rows.find((row) => getMonthlySettings(row.triggerConfig)) ?? null;
}

async function getCommunity(admin: Admin, communityId: string) {
  const { data } = await admin.from("Community").select("name, city, timezone").eq("id", communityId).single();
  return data ?? { name: null, city: null, timezone: "Europe/Paris" };
}

async function upsertMonthlyAutomation(
  admin: Admin,
  communityId: string,
  existing: AutomationRow | null,
  settings: MonthlySettings,
  programHistory: MonthlyHistory,
  recapHistory: MonthlyHistory,
  state: { isActive: boolean; status: "ACTIVE" | "PAUSED" | "DRAFT"; nextRunAt: string | null }
) {
  const base = (existing?.triggerConfig ?? {}) as Record<string, unknown>;
  const triggerConfig = {
    ...base,
    repeat: "monthly",
    monthlyProgramRecapSettings: settings,
    programHistory,
    recapHistory,
  } as unknown as Json;

  const payload = {
    name: MONTHLY_PROGRAM_RECAP_AUTOMATION_NAME,
    description: "Prépare le récap des événements du mois sur Instagram et Facebook, après validation.",
    trigger: "CUSTOM_SCHEDULE" as const,
    triggerConfig,
    actions: buildActions(settings.channels, "EVENT_RECAP"),
    isActive: state.isActive,
    status: state.status,
    nextRunAt: state.nextRunAt,
    updatedAt: new Date().toISOString(),
  };

  if (existing) {
    const { data, error } = await admin.from("Automation").update(payload).eq("id", existing.id).eq("communityId", communityId).select().single();
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

function currentMonthKey(timezone: string): string {
  const iso = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return iso.slice(0, 7);
}

function requestedMonthKey(value: unknown, timezone: string) {
  const monthKey = stringOrEmpty(value);
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey) ? monthKey : currentMonthKey(timezone);
}

async function publishMonthly(
  admin: Admin,
  communityId: string,
  body: Record<string, unknown>,
  community: { name: string | null; city: string | null; timezone: string | null },
  existing: AutomationRow | null,
  settings: MonthlySettings,
  programHistory: MonthlyHistory,
  recapHistory: MonthlyHistory
) {
  const caption = stringOrEmpty(body.caption);
  const channels = normalizeChannels(body.channels);
  const eventIds = Array.isArray(body.eventIds)
    ? Array.from(new Set(body.eventIds.map(String).filter(Boolean))).slice(0, 50)
    : [];
  const visualUrls = Array.isArray(body.visualUrls)
    ? (body.visualUrls as unknown[]).map(String).filter(Boolean).slice(0, MAX_RECAP_PHOTOS)
    : [];
  if (!caption) return NextResponse.json({ error: "Le texte de la publication est vide." }, { status: 400 });
  if (visualUrls.length === 0) return NextResponse.json({ error: "Ajoutez au moins un visuel." }, { status: 400 });
  if (eventIds.length === 0) return NextResponse.json({ error: "Sélectionnez au moins un événement terminé." }, { status: 400 });

  const { data: selectedEvents } = await admin
    .from("Event")
    .select("id,startDate,endDate")
    .eq("communityId", communityId)
    .in("id", eventIds);
  const hasFinishedEvent = (selectedEvents ?? []).some((event) => new Date(event.endDate ?? event.startDate) <= new Date());
  if (!hasFinishedEvent) return NextResponse.json({ error: "Aucun événement sélectionné n'est encore terminé." }, { status: 400 });

  const { data: socialChannels } = await admin
    .from("Channel")
    .select("id,type")
    .eq("communityId", communityId)
    .in("type", channels as never[])
    .eq("isActive", true)
    .eq("isConnected", true);
  const typedChannels = (socialChannels ?? []) as SocialChannelRow[];
  if (typedChannels.length === 0) {
    return NextResponse.json({ error: "Aucun canal Instagram ou Facebook actif. Configurez vos réseaux dans Paramètres > Canaux." }, { status: 409 });
  }

  const draftId = crypto.randomUUID();
  const nowIso = new Date().toISOString();
  await admin.from("ContentDraft").insert({
    id: draftId,
    communityId,
    title: "Récap du mois",
    body: caption,
    imageUrl: visualUrls[0],
    contentType: "EVENT_RECAP" as never,
    status: "APPROVED",
    aiGenerated: true,
    createdAt: nowIso,
    updatedAt: nowIso,
  } as never);

  const channelIds = typedChannels.map((c) => c.id);
  await createPublicationsFromDraft({ draftId, communityId, channelIds });
  const results = await publishToAllChannels(draftId, channelIds);
  const links = typedChannels.map((channel) => {
    const result = results[channel.id];
    return {
      channel: channel.type === "INSTAGRAM" ? "Instagram" : "Facebook",
      url: result?.externalUrl ?? null,
      success: result?.success === true,
      error: result?.error,
    };
  });

  const key = requestedMonthKey(body.monthKey, community.timezone ?? "Europe/Paris");
  recapHistory[key] = { status: "PUBLISHED", publishedAt: nowIso, draftId };

  await upsertMonthlyAutomation(admin, communityId, existing, settings, programHistory, recapHistory, {
    isActive: existing?.isActive ?? true,
    status: (existing?.status as "ACTIVE" | "PAUSED" | "DRAFT") ?? "ACTIVE",
    nextRunAt: existing?.nextRunAt ?? null,
  });

  return NextResponse.json({ success: true, draftId, results, links });
}

export async function POST(request: Request) {
  try {
    const auth = await getAuth();
    if ("error" in auth) return auth.error;
    const { admin, communityId } = auth;
    const now = new Date();

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const mode = stringOrEmpty(body.mode);

    const existing = await findMonthlyAutomation(admin, communityId);
    const community = await getCommunity(admin, communityId);
    const timezone = community.timezone ?? "Europe/Paris";
    const currentSettings: MonthlySettings = existing
      ? getMonthlySettings(existing.triggerConfig) ?? { ...DEFAULT_MONTHLY_SETTINGS, timezone }
      : { ...DEFAULT_MONTHLY_SETTINGS, timezone };
    const programHistory: MonthlyHistory = existing ? { ...getProgramHistory(existing.triggerConfig) } : {};
    const recapHistory: MonthlyHistory = existing ? { ...getRecapHistory(existing.triggerConfig) } : {};

    if (mode === "pause") {
      const settings: MonthlySettings = { ...currentSettings, status: "paused" };
      const automation = await upsertMonthlyAutomation(admin, communityId, existing, settings, programHistory, recapHistory, {
        isActive: false,
        status: "PAUSED",
        nextRunAt: null,
      });
      return NextResponse.json(automation);
    }

    if (mode === "save-selection") {
      const templateId = stringOrEmpty(body.templateId);
      if (!templateId) return NextResponse.json({ error: "Fond manquant." }, { status: 400 });
      const settings: MonthlySettings = {
        ...currentSettings,
        selectedRecapBackgroundId: templateId,
      };
      const automation = await upsertMonthlyAutomation(admin, communityId, existing, settings, programHistory, recapHistory, {
        isActive: existing?.isActive ?? false,
        status: existing?.status === "ACTIVE" ? "ACTIVE" : "DRAFT",
        nextRunAt: existing?.nextRunAt ?? null,
      });
      return NextResponse.json(automation);
    }

    if (mode === "save-config" || mode === "activate" || mode === "update-notification-detail") {
      const settings = sanitizeSettings(body.settings, currentSettings);
      const active = mode === "activate" ? true : mode === "save-config" ? existing?.isActive ?? false : existing?.isActive ?? true;
      const status: "ACTIVE" | "PAUSED" | "DRAFT" = active ? "ACTIVE" : existing?.status === "PAUSED" ? "PAUSED" : "DRAFT";
      const effective: MonthlySettings = { ...settings, status: active ? "active" : settings.status };
      const automation = await upsertMonthlyAutomation(admin, communityId, existing, effective, programHistory, recapHistory, {
        isActive: active,
        status,
        nextRunAt: active ? getNextMonthlyRun(effective, now, timezone)?.runAt.toISOString() ?? null : existing?.nextRunAt ?? null,
      });
      return NextResponse.json(automation);
    }

    if (mode === "ignore-program-month" || mode === "ignore-recap-month") {
      const key = stringOrEmpty(body.monthKey) || currentMonthKey(timezone);
      if (mode === "ignore-program-month") programHistory[key] = { status: "IGNORED" };
      else recapHistory[key] = { status: "IGNORED" };
      const automation = await upsertMonthlyAutomation(admin, communityId, existing, currentSettings, programHistory, recapHistory, {
        isActive: existing?.isActive ?? true,
        status: (existing?.status as "ACTIVE" | "PAUSED" | "DRAFT") ?? "ACTIVE",
        nextRunAt: existing?.nextRunAt ?? null,
      });
      return NextResponse.json(automation);
    }

    if (mode === "prepare-recap") {
      const eventIds = Array.isArray(body.eventIds)
        ? Array.from(new Set(body.eventIds.map(String).filter(Boolean))).slice(0, 50)
        : [];
      const { data: events } = eventIds.length
        ? await admin
            .from("Event")
            .select("id,title,startDate,endDate,location")
            .eq("communityId", communityId)
            .in("id", eventIds)
            .order("startDate", { ascending: true })
        : { data: [] };
      const finishedEvents = (events ?? []).filter((event) => new Date(event.endDate ?? event.startDate) <= now);
      if (!finishedEvents.length) return NextResponse.json({ error: "Sélectionnez au moins un événement terminé." }, { status: 400 });

      const eventDetails = finishedEvents.map((event) => {
        const date = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: timezone }).format(new Date(event.startDate));
        return `- ${event.title} — ${date}${event.location ? ` — ${event.location}` : ""}`;
      }).join("\n");
      const fallback = `${defaultRecapCaption({ city: community.city, communityName: community.name })}\n\n${finishedEvents.map((event) => event.title).join(" · ")}`;
      try {
        const generated = await generateContent({
          communityId,
          contentType: "EVENT_RECAP",
          customInstructions: [
            "Rédige un seul récap chaleureux et concis des événements communautaires ci-dessous.",
            "Conserve exactement les noms, dates et lieux. N'invente aucune information.",
            `Mois concerné : ${requestedMonthKey(body.monthKey, timezone)}.`,
            eventDetails,
          ].join("\n"),
        });
        return NextResponse.json({ caption: generated.body || fallback });
      } catch {
        return NextResponse.json({ caption: fallback });
      }
    }

    if (mode === "publish-recap") {
      return publishMonthly(admin, communityId, body, community, existing, currentSettings, programHistory, recapHistory);
    }

    if (mode === "prepare-program" || mode === "publish-program") {
      return NextResponse.json({ error: "Le programme du mois a été remplacé par le récap automatique." }, { status: 410 });
    }

    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  } catch (error) {
    console.error("[Monthly Program/Recap Config]", error);
    return NextResponse.json({ error: "Enregistrement impossible" }, { status: 500 });
  }
}
