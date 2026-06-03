import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";
import { AUTOMATION_PRESETS, buildAutomationActions } from "@/lib/automation/presets";
import { presetAppliesToCommunity, type PresetWithClientTypes } from "@/lib/automation/preset-utils";

const TRIGGERS = new Set<Database["public"]["Enums"]["AutomationTrigger"]>([
  "BEFORE_EVENT",
  "EVENT_DAY",
  "AFTER_EVENT",
  "WEEKLY_SHABBAT",
  "JEWISH_HOLIDAY",
  "DAILY",
  "CUSTOM_SCHEDULE",
  "MANUAL",
]);

const CONTENT_TYPES = new Set<Database["public"]["Enums"]["ContentType"]>([
  "EVENT_ANNOUNCEMENT",
  "EVENT_REMINDER",
  "EVENT_DAY",
  "EVENT_RECAP",
  "SHABBAT_TIMES",
  "HOLIDAY_GREETING",
  "DAILY_CONTENT",
  "COURSE_ANNOUNCEMENT",
  "COMMUNITY_NEWS",
  "FUNDRAISING",
  "GENERAL",
  "EVENT_POST",
]);

const CHANNELS = new Set<Database["public"]["Enums"]["ChannelType"]>([
  "INSTAGRAM",
  "FACEBOOK",
  "WHATSAPP",
  "TELEGRAM",
  "EMAIL",
  "WEB",
]);

function getRequiresValidationDefault(vocabulary: unknown) {
  if (vocabulary && typeof vocabulary === "object" && !Array.isArray(vocabulary)) {
    const mode = (vocabulary as { automationValidationMode?: unknown; manualValidationBeforeSend?: unknown }).automationValidationMode;
    const manual = (vocabulary as { manualValidationBeforeSend?: unknown }).manualValidationBeforeSend;
    if (mode === "automatic" || manual === false) return false;
  }
  return true;
}

function applyValidationPreference(actions: unknown[], requiresValidation: boolean) {
  return actions.map((action) => {
    if (!action || typeof action !== "object") return action;
    const item = action as Record<string, unknown>;
    if (item.type === "CREATE_PUBLICATION" || item.type === "GENERATE_CONTENT") {
      return { ...item, requiresValidation };
    }
    return item;
  });
}

function normalizeActions(body: Record<string, unknown>, requiresValidationDefault: boolean) {
  const contentType = CONTENT_TYPES.has(body.contentType as never) ? body.contentType : "GENERAL";
  const channels = Array.isArray(body.channels)
    ? body.channels.filter((channel) => CHANNELS.has(channel as never))
    : [];
  const requiresValidation = body.requiresValidation === undefined ? requiresValidationDefault : Boolean(body.requiresValidation);

  return [
    ...buildAutomationActions({ contentType: String(contentType), channels: channels as string[], requiresValidation }),
  ];
}

function getEventStartDate(body: Record<string, unknown>) {
  if (typeof body.nextRunAt !== "string" || !body.nextRunAt) return null;
  const startDate = new Date(body.nextRunAt);
  return Number.isNaN(startDate.getTime()) ? null : startDate.toISOString();
}

async function createCalendarEventForAutomation(
  admin: ReturnType<typeof createAdminClient>,
  communityId: string,
  body: Record<string, unknown>
) {
  const startDate = getEventStartDate(body);
  if (!startDate) return null;

  const triggerConfig = body.triggerConfig && typeof body.triggerConfig === "object"
    ? body.triggerConfig as Record<string, unknown>
    : {};
  const title = String(body.name ?? triggerConfig.eventTitle ?? "Nouvel evenement").trim();
  const note = typeof triggerConfig.message === "string" ? triggerConfig.message.trim() : "";

  const { data: event, error } = await admin
    .from("Event")
    .insert({
      id: crypto.randomUUID(),
      communityId,
      title,
      description: null,
      startDate,
      endDate: null,
      category: "OTHER",
      status: "SCHEDULED",
      isRecurring: Boolean(triggerConfig.repeat && triggerConfig.repeat !== "none"),
      recurrenceRule: triggerConfig.repeat ? triggerConfig as never : null,
      isPublic: true,
      notes: note || null,
      updatedAt: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[Automations POST] event insert error", error);
    return null;
  }

  return event?.id ?? null;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("communityId")
      .eq("id", user.id)
      .single();

    if (!profile?.communityId) {
      return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    if (typeof body.presetId === "string" && body.presetId) {
      const [{ data: community }, { data: preset }] = await Promise.all([
        admin.from("Community").select("id, communityType, vocabulary").eq("id", profile.communityId).single(),
        admin
          .from("AutomationPreset")
          .select("*")
          .eq("id", body.presetId)
          .eq("isActive", true)
          .single(),
      ]);

      const typedPreset = preset as PresetWithClientTypes | null;
      if (!community || !typedPreset || !presetAppliesToCommunity(typedPreset, community)) {
        return NextResponse.json({ error: "Publication IA non disponible pour ce compte" }, { status: 403 });
      }

      const requiresValidationDefault = getRequiresValidationDefault(community.vocabulary);
      const trigger = TRIGGERS.has(body.trigger as never) ? body.trigger : typedPreset.trigger;
      const actions =
        body.channels !== undefined || body.contentType !== undefined || body.requiresValidation !== undefined
          ? normalizeActions(body, requiresValidationDefault)
          : applyValidationPreference((typedPreset.actions ?? []) as unknown[], requiresValidationDefault);
      const eventId =
        typeof body.eventId === "string" && body.eventId
          ? body.eventId
          : await createCalendarEventForAutomation(admin, profile.communityId, body);

      const { data: automation, error } = await admin
        .from("Automation")
        .insert({
          id: crypto.randomUUID(),
          communityId: profile.communityId,
          presetId: typedPreset.id,
          eventId,
          name: String(body.name ?? typedPreset.title).trim(),
          description: body.description === undefined ? typedPreset.description ?? null : String(body.description).trim() || null,
          trigger,
          triggerConfig: (body.triggerConfig ?? typedPreset.triggerConfig ?? {}) as never,
          actions: actions as never,
          isActive: body.isActive === undefined ? true : Boolean(body.isActive),
          status: body.isActive === false ? "PAUSED" : "ACTIVE",
          nextRunAt: typeof body.nextRunAt === "string" && body.nextRunAt ? body.nextRunAt : null,
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (error || !automation) {
        console.error("[Automations preset POST]", error);
        return NextResponse.json({ error: "Création échouée" }, { status: 500 });
      }

      return NextResponse.json(automation, { status: 201 });
    }

    const preset = body.preset as keyof typeof AUTOMATION_PRESETS | undefined;
    const presetConfig = preset ? AUTOMATION_PRESETS[preset] : null;
    const { data: communitySettings } = await admin
      .from("Community")
      .select("vocabulary")
      .eq("id", profile.communityId)
      .single();
    const requiresValidationDefault = getRequiresValidationDefault(communitySettings?.vocabulary);

    if (preset && !presetConfig) return NextResponse.json({ error: "Preset non supporté" }, { status: 400 });

    const trigger = presetConfig?.trigger ?? body.trigger ?? "MANUAL";
    if (!TRIGGERS.has(trigger as never)) return NextResponse.json({ error: "Déclencheur invalide" }, { status: 400 });

    const name = String(body.name ?? presetConfig?.name ?? "Nouvelle automatisation").trim();
    if (name.length < 2) return NextResponse.json({ error: "Nom trop court" }, { status: 400 });

    const triggerConfig = body.triggerConfig && typeof body.triggerConfig === "object"
      ? body.triggerConfig
      : presetConfig?.triggerConfig ?? {};

    const presetChannels = Array.isArray(body.channels)
      ? body.channels.filter((channel) => CHANNELS.has(channel as never)).map(String)
      : presetConfig ? [...presetConfig.channels] : [];

    const actions = presetConfig
      ? buildAutomationActions({ contentType: presetConfig.contentType, channels: presetChannels, requiresValidation: body.requiresValidation === undefined ? requiresValidationDefault : Boolean(body.requiresValidation) })
      : normalizeActions(body, requiresValidationDefault);
    const eventId =
      typeof body.eventId === "string" && body.eventId
        ? body.eventId
        : await createCalendarEventForAutomation(admin, profile.communityId, body);

    const { data: automation, error } = await admin
      .from("Automation")
      .insert({
        id: crypto.randomUUID(),
        communityId: profile.communityId,
        eventId,
        name,
        description: body.description === undefined
          ? presetConfig?.description ?? null
          : String(body.description).trim() || null,
        trigger,
        triggerConfig,
        actions,
        isActive: body.isActive === undefined ? true : Boolean(body.isActive),
        status: body.isActive === false ? "PAUSED" : "ACTIVE",
        nextRunAt: typeof body.nextRunAt === "string" && body.nextRunAt ? body.nextRunAt : null,
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !automation) {
      console.error("[Automations POST]", error);
      return NextResponse.json({ error: "Création échouée" }, { status: 500 });
    }

    return NextResponse.json(automation, { status: 201 });
  } catch (error) {
    console.error("[Automations POST]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
