import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";
import { AUTOMATION_PRESETS, buildAutomationActions } from "@/lib/automation/presets";

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

function normalizeActions(body: Record<string, unknown>) {
  const contentType = CONTENT_TYPES.has(body.contentType as never) ? body.contentType : "GENERAL";
  const channels = Array.isArray(body.channels)
    ? body.channels.filter((channel) => CHANNELS.has(channel as never))
    : [];
  const requiresValidation = body.requiresValidation === undefined ? true : Boolean(body.requiresValidation);

  return [
    ...buildAutomationActions({ contentType: String(contentType), channels: channels as string[], requiresValidation }),
  ];
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
    const preset = body.preset as keyof typeof AUTOMATION_PRESETS | undefined;
    const presetConfig = preset ? AUTOMATION_PRESETS[preset] : null;

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
      ? buildAutomationActions({ contentType: presetConfig.contentType, channels: presetChannels })
      : normalizeActions(body);

    const { data: automation, error } = await admin
      .from("Automation")
      .insert({
        id: crypto.randomUUID(),
        communityId: profile.communityId,
        eventId: typeof body.eventId === "string" && body.eventId ? body.eventId : null,
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
