import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

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

function getEventStartDate(body: Record<string, unknown>) {
  if (typeof body.nextRunAt !== "string" || !body.nextRunAt) return null;
  const startDate = new Date(body.nextRunAt);
  return Number.isNaN(startDate.getTime()) ? null : startDate.toISOString();
}

async function upsertCalendarEventForAutomation(
  admin: ReturnType<typeof createAdminClient>,
  automation: { eventId?: string | null; communityId: string; name: string },
  body: Record<string, unknown>
) {
  const startDate = getEventStartDate(body);
  if (!startDate) return automation.eventId ?? null;

  const triggerConfig = body.triggerConfig && typeof body.triggerConfig === "object"
    ? body.triggerConfig as Record<string, unknown>
    : {};
  const title = String(body.name ?? triggerConfig.eventTitle ?? automation.name).trim();
  const note = typeof triggerConfig.message === "string" ? triggerConfig.message.trim() : "";
  const eventPayload = {
    title,
    description: null,
    startDate,
    endDate: null,
    category: "OTHER" as const,
    status: "SCHEDULED" as const,
    isRecurring: Boolean(triggerConfig.repeat && triggerConfig.repeat !== "none"),
    recurrenceRule: triggerConfig.repeat ? triggerConfig as never : null,
    isPublic: true,
    notes: note || null,
    updatedAt: new Date().toISOString(),
  };

  if (automation.eventId) {
    const { error } = await admin
      .from("Event")
      .update(eventPayload)
      .eq("id", automation.eventId)
      .eq("communityId", automation.communityId);
    if (error) console.error("[Automations PATCH] event update error", error);
    return automation.eventId;
  }

  const { data: event, error } = await admin
    .from("Event")
    .insert({
      id: crypto.randomUUID(),
      communityId: automation.communityId,
      ...eventPayload,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[Automations PATCH] event insert error", error);
    return null;
  }

  return event?.id ?? null;
}

async function getAuthorizedAutomation(automationId: string, userId: string) {
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("communityId").eq("id", userId).single();
  if (!profile?.communityId) return null;

  const { data: automation } = await admin
    .from("Automation")
    .select("*")
    .eq("id", automationId)
    .eq("communityId", profile.communityId)
    .single();
  return automation;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const automation = await getAuthorizedAutomation(id, user.id);
  if (!automation) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = (await request.json()) as Record<string, unknown>;
  const admin = createAdminClient();

  const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (name.length < 2) return NextResponse.json({ error: "Nom trop court" }, { status: 400 });
    updateData.name = name;
  }
  if (body.description !== undefined) updateData.description = String(body.description).trim() || null;
  if (body.trigger !== undefined) {
    if (!TRIGGERS.has(body.trigger as never)) return NextResponse.json({ error: "Déclencheur invalide" }, { status: 400 });
    updateData.trigger = body.trigger;
  }
  if (body.eventId !== undefined) updateData.eventId = typeof body.eventId === "string" && body.eventId ? body.eventId : null;
  if (body.triggerConfig !== undefined && typeof body.triggerConfig === "object") {
    const incoming = body.triggerConfig as Record<string, unknown>;
    const existingConfig = (automation.triggerConfig ?? {}) as Record<string, unknown>;
    // Preserve shabbatPoster for WEEKLY_SHABBAT — the generic form must not overwrite it
    if (automation.trigger === "WEEKLY_SHABBAT") {
      updateData.triggerConfig = {
        ...incoming,
        shabbatPoster: existingConfig.shabbatPoster ?? incoming.shabbatPoster,
      };
    } else if (existingConfig.eventReminderCampaign) {
      // Campagne J-10/J-5 : le formulaire générique ne doit jamais écraser
      // la configuration dédiée gérée par /dashboard/event-reminders-auto.
      updateData.triggerConfig = {
        ...incoming,
        eventReminderCampaign: existingConfig.eventReminderCampaign,
      };
    } else {
      updateData.triggerConfig = incoming;
    }
  }
  if (body.actions !== undefined && Array.isArray(body.actions)) updateData.actions = body.actions;
  if (body.nextRunAt !== undefined) updateData.nextRunAt = typeof body.nextRunAt === "string" && body.nextRunAt ? body.nextRunAt : null;
  if (body.nextRunAt !== undefined || body.name !== undefined || body.triggerConfig !== undefined) {
    updateData.eventId = await upsertCalendarEventForAutomation(admin, automation, body);
  }
  if (body.contentType !== undefined || body.channels !== undefined || body.requiresValidation !== undefined) {
    const contentType = CONTENT_TYPES.has(body.contentType as never) ? body.contentType : "GENERAL";
    const channels = Array.isArray(body.channels)
      ? body.channels.filter((channel) => CHANNELS.has(channel as never))
      : [];
    updateData.actions = [
      { type: "GENERATE_CONTENT", contentType, channels },
      { type: "CREATE_PUBLICATION", requiresValidation: body.requiresValidation === undefined ? true : Boolean(body.requiresValidation) },
    ];
  }
  if (body.isActive === false) updateData.status = "PAUSED";
  else if (body.isActive === true) updateData.status = "ACTIVE";

  const { data: updated, error } = await admin.from("Automation").update(updateData).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const automation = await getAuthorizedAutomation(id, user.id);
  if (!automation) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const admin = createAdminClient();
  await admin.from("Automation").delete().eq("id", id);

  if (automation.eventId) {
    const { count: remainingAutomationsForEvent } = await admin
      .from("Automation")
      .select("id", { count: "exact", head: true })
      .eq("eventId", automation.eventId)
      .eq("communityId", automation.communityId);

    if ((remainingAutomationsForEvent ?? 0) === 0) {
      await admin
        .from("Event")
        .update({ status: "ARCHIVED", updatedAt: new Date().toISOString() })
        .eq("id", automation.eventId)
        .eq("communityId", automation.communityId);
    }
  }

  return NextResponse.json({ success: true });
}
