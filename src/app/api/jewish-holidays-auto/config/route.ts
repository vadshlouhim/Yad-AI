import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_HOLIDAY_NOTIFICATION_DAYS,
  DEFAULT_HOLIDAY_NOTIFICATION_TIME,
  getNotificationDateTime,
  JEWISH_HOLIDAYS_AUTOMATION_NAME,
} from "@/lib/automation/jewish-holidays";
import type { Database, Json } from "@/types/database.types";

type AutomationRow = Database["public"]["Tables"]["Automation"]["Row"];

type HolidayPosterConfig = {
  configured?: boolean;
  suspended?: boolean;
  country?: string | null;
  timezone?: string | null;
  daysBefore?: number;
  selectedHolidayId?: string | null;
  selectedHolidayName?: string | null;
  selectedHolidayCategory?: string | null;
  selectedHolidayDate?: string | null;
  selectedTemplateId?: string | null;
  creationMode?: "template" | "new";
  palette?: string;
  assistantMessages?: Array<{ role: "assistant" | "user"; content: string; createdAt: string }>;
  postText?: string;
  selectedChannels?: string[];
  generatedImageUrl?: string | null;
  generatedAt?: string | null;
  publishResults?: Record<string, unknown>;
  publishIdempotencyKey?: string | null;
};

const HOLIDAY_ACTIONS: Json = [
  { type: "GENERATE_CONTENT", contentType: "HOLIDAY_GREETING", channels: ["INSTAGRAM", "FACEBOOK", "WHATSAPP"], requiresValidation: true },
  { type: "CREATE_PUBLICATION", requiresValidation: true },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringOrEmpty(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDays(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 90 ? parsed : DEFAULT_HOLIDAY_NOTIFICATION_DAYS;
}

function getHolidayPosterConfig(triggerConfig: Json | null): HolidayPosterConfig {
  if (!isRecord(triggerConfig)) return {};
  const value = triggerConfig.holidayPoster;
  return isRecord(value) ? (value as HolidayPosterConfig) : {};
}

function mergeTriggerConfig(base: Json | null, poster: HolidayPosterConfig): Json {
  const existing = isRecord(base) ? base : {};
  return {
    ...existing,
    daysBeforeHoliday: poster.daysBefore ?? DEFAULT_HOLIDAY_NOTIFICATION_DAYS,
    time: DEFAULT_HOLIDAY_NOTIFICATION_TIME,
    holidayPoster: poster as Json,
  };
}

async function getAuthContext() {
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

  const { data: community } = await admin
    .from("Community")
    .select("id, country, timezone")
    .eq("id", profile.communityId)
    .single();

  if (!community) return { error: NextResponse.json({ error: "Structure introuvable" }, { status: 404 }) };
  return { admin, communityId: profile.communityId, community };
}

async function findAutomation(admin: ReturnType<typeof createAdminClient>, communityId: string) {
  const { data } = await admin
    .from("Automation")
    .select("*")
    .eq("communityId", communityId)
    .eq("trigger", "JEWISH_HOLIDAY")
    .eq("name", JEWISH_HOLIDAYS_AUTOMATION_NAME)
    .order("updatedAt", { ascending: false })
    .limit(1);

  return (data?.[0] ?? null) as AutomationRow | null;
}

async function upsertAutomation(
  admin: ReturnType<typeof createAdminClient>,
  communityId: string,
  existing: AutomationRow | null,
  poster: HolidayPosterConfig,
  status: "ACTIVE" | "PAUSED" | "DRAFT",
  nextRunAt: string | null
) {
  const now = new Date().toISOString();
  const payload = {
    name: JEWISH_HOLIDAYS_AUTOMATION_NAME,
    description: "Rappelle les prochaines fetes juives et dates hassidiques, puis prépare une affiche apres validation humaine.",
    trigger: "JEWISH_HOLIDAY" as const,
    triggerConfig: mergeTriggerConfig(existing?.triggerConfig ?? null, poster),
    actions: HOLIDAY_ACTIONS,
    isActive: status === "ACTIVE",
    status,
    nextRunAt,
    updatedAt: now,
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

function buildNextRunAt(poster: HolidayPosterConfig) {
  if (!poster.selectedHolidayDate) return null;
  return getNotificationDateTime({
    firstEveningDate: poster.selectedHolidayDate,
    daysBefore: poster.daysBefore ?? DEFAULT_HOLIDAY_NOTIFICATION_DAYS,
    timezone: poster.timezone,
  }).toISOString();
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if ("error" in auth) return auth.error;

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const mode = stringOrEmpty(body.mode);
    const existing = await findAutomation(auth.admin, auth.communityId);
    const current = getHolidayPosterConfig(existing?.triggerConfig ?? null);
    const base: HolidayPosterConfig = {
      daysBefore: DEFAULT_HOLIDAY_NOTIFICATION_DAYS,
      selectedChannels: ["FACEBOOK", "INSTAGRAM", "WHATSAPP"],
      ...current,
      country: auth.community.country ?? current.country ?? "France",
      timezone: auth.community.timezone ?? current.timezone ?? "Europe/Paris",
    };

    let poster = base;
    let status: "ACTIVE" | "PAUSED" | "DRAFT" = existing?.status === "ACTIVE" ? "ACTIVE" : "DRAFT";

    if (mode === "pause") {
      poster = { ...base, suspended: true };
      status = "PAUSED";
    } else if (mode === "resume") {
      poster = { ...base, suspended: false };
      status = base.configured ? "ACTIVE" : "DRAFT";
    } else if (mode === "save-delay") {
      poster = { ...base, daysBefore: normalizeDays(body.daysBefore) };
    } else if (mode === "save-selection") {
      poster = {
        ...base,
        selectedHolidayId: stringOrEmpty(body.holidayId) || base.selectedHolidayId || null,
        selectedHolidayName: stringOrEmpty(body.holidayName) || base.selectedHolidayName || null,
        selectedHolidayCategory: stringOrEmpty(body.holidayCategory) || base.selectedHolidayCategory || null,
        selectedHolidayDate: stringOrEmpty(body.holidayDate) || base.selectedHolidayDate || null,
        selectedTemplateId: stringOrEmpty(body.templateId) || null,
        creationMode: stringOrEmpty(body.creationMode) === "new" ? "new" : "template",
      };
    } else if (mode === "save-config" || mode === "activate") {
      const assistantMessages = Array.isArray(body.assistantMessages)
        ? body.assistantMessages
            .filter((item): item is Record<string, unknown> => isRecord(item))
            .map((item) => ({
              role: item.role === "assistant" ? "assistant" as const : "user" as const,
              content: stringOrEmpty(item.content),
              createdAt: stringOrEmpty(item.createdAt) || new Date().toISOString(),
            }))
            .filter((item) => item.content.length > 0)
        : base.assistantMessages ?? [];
      const selectedChannels = Array.isArray(body.selectedChannels)
        ? body.selectedChannels.map(String).filter(Boolean)
        : base.selectedChannels ?? [];

      poster = {
        ...base,
        palette: stringOrEmpty(body.palette) || base.palette || "violet",
        assistantMessages,
        postText: stringOrEmpty(body.postText) || base.postText || "",
        selectedChannels,
        daysBefore: normalizeDays(body.daysBefore ?? base.daysBefore),
        configured: mode === "activate" ? true : base.configured,
        suspended: mode === "activate" ? false : base.suspended,
      };
      status = mode === "activate" ? "ACTIVE" : status;
    } else {
      return NextResponse.json({ error: "Action invalide" }, { status: 400 });
    }

    const nextRunAt = status === "ACTIVE" ? buildNextRunAt(poster) : null;
    const automation = await upsertAutomation(auth.admin, auth.communityId, existing, poster, status, nextRunAt);
    return NextResponse.json(automation);
  } catch (error) {
    console.error("[Jewish Holidays Auto Config]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Enregistrement impossible" }, { status: 500 });
  }
}
