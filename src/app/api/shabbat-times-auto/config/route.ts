import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getNextWeeklyRunAt,
  SHABBAT_AUTOMATION_NAME,
  type ShabbatTemplateMode,
} from "@/lib/automation/shabbat-times";
import type { Database, Json } from "@/types/database.types";

type AutomationRow = Database["public"]["Tables"]["Automation"]["Row"];

const ALL_CHANNELS = ["INSTAGRAM", "FACEBOOK", "WHATSAPP", "EMAIL"] as const;

function buildActions(channels: string[], scheduleMode: string): Json {
  const validChannels = channels.filter((c) => (ALL_CHANNELS as readonly string[]).includes(c));
  const selected = validChannels.length > 0 ? validChannels : ["INSTAGRAM", "FACEBOOK", "WHATSAPP"];
  const requiresValidation = scheduleMode !== "direct";
  return [
    { type: "GENERATE_CONTENT", contentType: "SHABBAT_TIMES", channels: selected, requiresValidation },
    { type: "CREATE_PUBLICATION", requiresValidation },
  ];
}

type ShabbatPosterConfig = {
  selectedTemplateId?: string | null;
  selectedTemplateCategory?: ShabbatTemplateMode | null;
  palette?: string;
  fields?: Record<string, string>;
  postText?: string;
  officeTimes?: string;
  notificationDay?: string;
  notificationDayOfWeek?: number;
  notificationTime?: string;
  scheduleMode?: string;
  channels?: string[];
  configured?: boolean;
  suspended?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringOrEmpty(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTemplateMode(value: unknown): ShabbatTemplateMode {
  return value === "detailed" ? "detailed" : "simple";
}

function normalizeDayOfWeek(value: unknown) {
  const day = typeof value === "number" ? value : Number(value);
  return Number.isInteger(day) && day >= 0 && day <= 6 ? day : 5;
}

function normalizeTime(value: unknown) {
  const time = typeof value === "string" ? value.trim() : "10:00";
  return /^\d{2}:\d{2}$/.test(time) ? time : "10:00";
}

function getPosterConfig(triggerConfig: Json | null): ShabbatPosterConfig {
  if (!isRecord(triggerConfig)) return {};
  const value = triggerConfig.shabbatPoster;
  return isRecord(value) ? (value as ShabbatPosterConfig) : {};
}

function mergeTriggerConfig(base: Json | null, poster: ShabbatPosterConfig): Json {
  const existing = isRecord(base) ? base : {};
  return {
    ...existing,
    day: "friday",
    dayOfWeek: poster.notificationDayOfWeek ?? 5,
    time: poster.notificationTime ?? "10:00",
    shabbatPoster: poster as Json,
  };
}

function sanitizeFields(value: unknown) {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).map(([key, fieldValue]) => [key, stringOrEmpty(fieldValue)])
  );
}

function sanitizeConfig(value: unknown, existing: ShabbatPosterConfig): ShabbatPosterConfig {
  if (!isRecord(value)) return existing;

  const notificationTime = normalizeTime(value.notificationTime ?? existing.notificationTime);
  const notificationDayOfWeek = normalizeDayOfWeek(value.notificationDayOfWeek ?? existing.notificationDayOfWeek);

  return {
    ...existing,
    palette: stringOrEmpty(value.palette) || existing.palette || "violet",
    fields: sanitizeFields(value.fields ?? existing.fields),
    postText: stringOrEmpty(value.postText ?? existing.postText),
    officeTimes: stringOrEmpty(value.officeTimes ?? existing.officeTimes),
    notificationDay: stringOrEmpty(value.notificationDay ?? existing.notificationDay) || "Vendredi",
    notificationDayOfWeek,
    notificationTime,
    scheduleMode: typeof value.scheduleMode === "string" ? value.scheduleMode : (existing.scheduleMode ?? "notification"),
    channels: Array.isArray(value.channels) ? (value.channels as string[]) : (existing.channels ?? ["INSTAGRAM", "FACEBOOK", "WHATSAPP"]),
  };
}

async function getAuthenticatedCommunityId() {
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

async function findAutomation(admin: ReturnType<typeof createAdminClient>, communityId: string) {
  const { data } = await admin
    .from("Automation")
    .select("*")
    .eq("communityId", communityId)
    .eq("trigger", "WEEKLY_SHABBAT")
    .order("updatedAt", { ascending: false })
    .limit(1);

  return (data?.[0] ?? null) as AutomationRow | null;
}

async function getCommunityTimezone(admin: ReturnType<typeof createAdminClient>, communityId: string) {
  const { data } = await admin.from("Community").select("timezone").eq("id", communityId).single();
  return data?.timezone ?? "Europe/Paris";
}

async function upsertAutomation(
  admin: ReturnType<typeof createAdminClient>,
  communityId: string,
  existing: AutomationRow | null,
  update: {
    poster: ShabbatPosterConfig;
    isActive: boolean;
    status: "ACTIVE" | "PAUSED" | "DRAFT";
    nextRunAt: string | null;
  }
) {
  const payload = {
    name: SHABBAT_AUTOMATION_NAME,
    description: "Prépare chaque semaine l'affiche des horaires de Chabbat avant validation humaine.",
    trigger: "WEEKLY_SHABBAT" as const,
    triggerConfig: mergeTriggerConfig(existing?.triggerConfig ?? null, update.poster),
    actions: buildActions(update.poster.channels ?? ["INSTAGRAM", "FACEBOOK", "WHATSAPP"], update.poster.scheduleMode ?? "notification"),
    isActive: update.isActive,
    status: update.status,
    nextRunAt: update.nextRunAt,
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
    .insert({
      id: crypto.randomUUID(),
      communityId,
      eventId: null,
      ...payload,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedCommunityId();
    if ("error" in auth) return auth.error;

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const mode = stringOrEmpty(body.mode);
    const existing = await findAutomation(auth.admin, auth.communityId);
    const currentPoster = getPosterConfig(existing?.triggerConfig ?? null);
    const timezone = await getCommunityTimezone(auth.admin, auth.communityId);

    if (mode === "pause") {
      const poster = { ...currentPoster, suspended: true };
      const automation = await upsertAutomation(auth.admin, auth.communityId, existing, {
        poster,
        isActive: false,
        status: "PAUSED",
        nextRunAt: null,
      });
      return NextResponse.json(automation);
    }

    if (mode === "save-selection") {
      const templateId = stringOrEmpty(body.templateId);
      if (!templateId) return NextResponse.json({ error: "Modèle manquant" }, { status: 400 });

      const poster: ShabbatPosterConfig = {
        ...currentPoster,
        selectedTemplateId: templateId,
        selectedTemplateCategory: normalizeTemplateMode(body.templateMode),
        suspended: existing?.status === "PAUSED" || currentPoster.suspended === true,
      };
      const automation = await upsertAutomation(auth.admin, auth.communityId, existing, {
        poster,
        isActive: existing?.isActive ?? false,
        status: existing?.status === "ACTIVE" ? "ACTIVE" : "DRAFT",
        nextRunAt: existing?.nextRunAt ?? null,
      });
      return NextResponse.json(automation);
    }

    const posterBase = sanitizeConfig(body.config, currentPoster);
    const poster: ShabbatPosterConfig = {
      ...posterBase,
      selectedTemplateId: stringOrEmpty(body.templateId) || posterBase.selectedTemplateId || currentPoster.selectedTemplateId || null,
      selectedTemplateCategory: normalizeTemplateMode(body.templateMode ?? posterBase.selectedTemplateCategory),
      configured: mode === "activate" ? true : posterBase.configured,
      suspended: mode === "activate" ? false : posterBase.suspended,
    };

    if (mode === "save-config") {
      const automation = await upsertAutomation(auth.admin, auth.communityId, existing, {
        poster,
        isActive: existing?.isActive ?? false,
        status: existing?.status === "ACTIVE" ? "ACTIVE" : "DRAFT",
        nextRunAt: existing?.nextRunAt ?? null,
      });
      return NextResponse.json(automation);
    }

    if (mode === "publish-now-config") {
      const automation = await upsertAutomation(auth.admin, auth.communityId, existing, {
        poster,
        isActive: false,
        status: "DRAFT",
        nextRunAt: null,
      });
      return NextResponse.json(automation);
    }

    if (mode === "activate") {
      const nextRunAt = getNextWeeklyRunAt({
        dayOfWeek: poster.notificationDayOfWeek ?? 5,
        time: poster.notificationTime ?? "10:00",
        timezone,
      }).toISOString();

      const automation = await upsertAutomation(auth.admin, auth.communityId, existing, {
        poster,
        isActive: true,
        status: "ACTIVE",
        nextRunAt,
      });
      return NextResponse.json(automation);
    }

    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  } catch (error) {
    console.error("[Shabbat Times Auto Config]", error);
    return NextResponse.json({ error: "Enregistrement impossible" }, { status: 500 });
  }
}
