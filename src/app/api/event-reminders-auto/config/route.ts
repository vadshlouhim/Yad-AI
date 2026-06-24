import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  EVENT_REMINDERS_AUTOMATION_NAME,
  REMINDER_CHANNELS,
  DEFAULT_REMINDER_TIME,
  buildDefaultReminders,
  recomputeReminderDates,
  sortReminders,
  reminderLabel,
  computeReminderRunAt,
  getNextPendingReminder,
  type EventReminder,
  type EventReminderCampaign,
  type ReminderChannel,
  type ScheduleMode,
} from "@/lib/automation/event-reminders";
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
  const time = typeof value === "string" ? value.trim() : DEFAULT_REMINDER_TIME;
  return /^\d{2}:\d{2}$/.test(time) ? time : DEFAULT_REMINDER_TIME;
}

function normalizeDate(value: unknown): string | null {
  const date = stringOrEmpty(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function normalizeChannels(value: unknown): ReminderChannel[] {
  if (!Array.isArray(value)) return ["INSTAGRAM", "FACEBOOK", "WHATSAPP"];
  const valid = value.filter((c): c is ReminderChannel =>
    (REMINDER_CHANNELS as readonly string[]).includes(c as string)
  );
  return valid.length > 0 ? valid : ["INSTAGRAM", "FACEBOOK", "WHATSAPP"];
}

function normalizeScheduleMode(value: unknown): ScheduleMode {
  return value === "direct" ? "direct" : "notification";
}

function buildActions(channels: ReminderChannel[], scheduleMode: ScheduleMode): Json {
  const requiresValidation = scheduleMode !== "direct";
  return [
    { type: "GENERATE_CONTENT", contentType: "EVENT_REMINDER", channels, requiresValidation },
    { type: "CREATE_PUBLICATION", requiresValidation },
  ] as unknown as Json;
}

function sanitizeReminder(value: unknown): EventReminder | null {
  if (!isRecord(value)) return null;
  const exactDate = normalizeDate(value.exactDate);
  const rawOffset = value.offsetDays;
  const offsetDays =
    exactDate !== null
      ? null
      : typeof rawOffset === "number" && Number.isInteger(rawOffset) && rawOffset >= 0
      ? rawOffset
      : Number.isInteger(Number(rawOffset)) && Number(rawOffset) >= 0
      ? Number(rawOffset)
      : null;
  const date = normalizeDate(value.date) ?? exactDate;
  if (!date && offsetDays === null) return null;

  return {
    id: stringOrEmpty(value.id) || crypto.randomUUID(),
    offsetDays,
    exactDate,
    date: date ?? "",
    time: normalizeTime(value.time),
    label: stringOrEmpty(value.label) || reminderLabel(offsetDays, exactDate),
    channels: normalizeChannels(value.channels),
    status: ["DRAFT", "SCHEDULED", "PENDING_VALIDATION", "PUBLISHED", "CANCELLED", "ERROR"].includes(
      stringOrEmpty(value.status)
    )
      ? (stringOrEmpty(value.status) as EventReminder["status"])
      : "DRAFT",
    visualUrl: stringOrEmpty(value.visualUrl) || null,
    agendaItemId: stringOrEmpty(value.agendaItemId) || null,
    publishedDraftId: stringOrEmpty(value.publishedDraftId) || null,
  };
}

function sanitizeCampaign(value: unknown, now: Date): EventReminderCampaign | null {
  if (!isRecord(value)) return null;
  const eventDate = normalizeDate(value.eventDate);
  if (!eventDate) return null;
  const channels = normalizeChannels(value.channels);
  const scheduleMode = normalizeScheduleMode(value.scheduleMode);

  const remindersInput = Array.isArray(value.reminders) ? value.reminders : [];
  let reminders = remindersInput
    .map((r) => sanitizeReminder(r))
    .filter((r): r is EventReminder => r !== null);
  // Recalcule les dates et retire les rappels déjà passés.
  reminders = sortReminders(recomputeReminderDates(reminders, eventDate, now));

  return {
    eventId: stringOrEmpty(value.eventId) || null,
    eventName: stringOrEmpty(value.eventName) || "Événement",
    eventDate,
    eventTime: normalizeTime(value.eventTime) || null,
    eventLocation: stringOrEmpty(value.eventLocation) || null,
    eventContact: stringOrEmpty(value.eventContact) || null,
    eventRegistrationUrl: stringOrEmpty(value.eventRegistrationUrl) || null,
    mainVisualUrl: stringOrEmpty(value.mainVisualUrl) || null,
    sourceType: value.sourceType === "new_event" ? "new_event" : "existing_event",
    scheduleMode,
    channels,
    reminders,
    validated: value.validated === true,
  };
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

/** Trouve l'automatisation-campagne d'une communauté pour un événement donné. */
async function findCampaignAutomation(
  admin: Admin,
  communityId: string,
  eventId: string | null
): Promise<AutomationRow | null> {
  const { data } = await admin
    .from("Automation")
    .select("*")
    .eq("communityId", communityId)
    .eq("trigger", "CUSTOM_SCHEDULE")
    .order("updatedAt", { ascending: false })
    .limit(50);

  const rows = (data ?? []) as AutomationRow[];
  return (
    rows.find((row) => {
      const cfg = row.triggerConfig as Record<string, unknown> | null;
      const campaign = cfg && isRecord(cfg.eventReminderCampaign) ? (cfg.eventReminderCampaign as Record<string, unknown>) : null;
      if (!campaign) return false;
      if (eventId) return campaign.eventId === eventId;
      return true;
    }) ?? null
  );
}

async function getTimezone(admin: Admin, communityId: string) {
  const { data } = await admin.from("Community").select("timezone").eq("id", communityId).single();
  return data?.timezone ?? "Europe/Paris";
}

/** Crée/maj une entrée Agenda IA (Event) par rappel et renvoie les rappels enrichis. */
async function syncAgendaEntries(
  admin: Admin,
  communityId: string,
  campaign: EventReminderCampaign,
  timezone: string
): Promise<EventReminder[]> {
  const updated: EventReminder[] = [];
  for (const reminder of campaign.reminders) {
    const runAt = computeReminderRunAt({ date: reminder.date, time: reminder.time, timezone });
    const title = `${campaign.eventName} — ${reminder.label}`;
    const payload = {
      title,
      description: null,
      startDate: runAt.toISOString(),
      endDate: null,
      category: "OTHER" as const,
      status: "SCHEDULED" as const,
      isPublic: true,
      notes: `Rappel automatique ${reminder.label} pour « ${campaign.eventName} » (${reminder.channels.join(", ")}).`,
      updatedAt: new Date().toISOString(),
    };

    if (reminder.agendaItemId) {
      await admin.from("Event").update(payload as never).eq("id", reminder.agendaItemId).eq("communityId", communityId);
      updated.push(reminder);
    } else {
      const { data: event } = await admin
        .from("Event")
        .insert({ id: crypto.randomUUID(), communityId, ...(payload as object) } as never)
        .select("id")
        .single();
      updated.push({ ...reminder, agendaItemId: (event as { id?: string } | null)?.id ?? null, status: "SCHEDULED" });
    }
  }
  return updated;
}

async function upsertCampaignAutomation(
  admin: Admin,
  communityId: string,
  existing: AutomationRow | null,
  campaign: EventReminderCampaign,
  state: { isActive: boolean; status: "ACTIVE" | "PAUSED" | "DRAFT"; nextRunAt: string | null }
) {
  const baseConfig = (existing?.triggerConfig ?? {}) as Record<string, unknown>;
  const triggerConfig = {
    ...baseConfig,
    repeat: "campaign",
    eventTitle: campaign.eventName,
    eventReminderCampaign: campaign,
  } as unknown as Json;

  const payload = {
    name: `${EVENT_REMINDERS_AUTOMATION_NAME} — ${campaign.eventName}`,
    description: "Programme automatiquement les rappels J-10, J-5, J-3, Demain et Jour J avant un événement.",
    trigger: "CUSTOM_SCHEDULE" as const,
    triggerConfig,
    actions: buildActions(campaign.channels, campaign.scheduleMode),
    eventId: campaign.eventId,
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
    .insert({ id: crypto.randomUUID(), communityId, ...payload })
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

    // ── check-duplicate : une campagne existe-t-elle déjà pour cet événement ? ──
    if (mode === "check-duplicate") {
      const eventId = stringOrEmpty(body.eventId) || null;
      const existing = await findCampaignAutomation(admin, communityId, eventId);
      return NextResponse.json({ exists: Boolean(existing), automation: existing });
    }

    // ── generate-plan : construit J-10/J-5/J-3/Demain/Jour J pour une date ──
    if (mode === "generate-plan") {
      const eventDate = normalizeDate(body.eventDate);
      if (!eventDate) return NextResponse.json({ error: "Date d'événement invalide." }, { status: 400 });
      const channels = normalizeChannels(body.channels);
      const timezone = await getTimezone(admin, communityId);
      const reminders = buildDefaultReminders({ eventDate, channels, now, timezone });
      const removed = reminders.length < 5;
      return NextResponse.json({ reminders, removedPastReminders: removed });
    }

    // ── pause : désactive la campagne ──
    if (mode === "pause") {
      const eventId = stringOrEmpty(body.eventId) || null;
      const existing = await findCampaignAutomation(admin, communityId, eventId);
      if (!existing) return NextResponse.json({ error: "Aucune campagne à suspendre." }, { status: 404 });
      const { data, error } = await admin
        .from("Automation")
        .update({ isActive: false, status: "PAUSED", updatedAt: new Date().toISOString() })
        .eq("id", existing.id)
        .eq("communityId", communityId)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json(data);
    }

    // ── save-config / validate-campaign / activate : nécessitent une campagne ──
    const campaign = sanitizeCampaign(body.campaign, now);
    if (!campaign) return NextResponse.json({ error: "Configuration de campagne invalide." }, { status: 400 });

    const timezone = await getTimezone(admin, communityId);
    const existing = await findCampaignAutomation(admin, communityId, campaign.eventId);

    if (mode === "save-config") {
      const automation = await upsertCampaignAutomation(admin, communityId, existing, campaign, {
        isActive: false,
        status: existing?.status === "ACTIVE" ? "ACTIVE" : "DRAFT",
        nextRunAt: existing?.nextRunAt ?? null,
      });
      return NextResponse.json(automation);
    }

    if (mode === "validate-campaign" || mode === "activate") {
      // 1. Crée/maj les entrées Agenda IA (une par rappel).
      const remindersWithAgenda = await syncAgendaEntries(admin, communityId, campaign, timezone);
      const validatedCampaign: EventReminderCampaign = {
        ...campaign,
        reminders: remindersWithAgenda,
        validated: true,
      };
      // 2. nextRunAt = prochain rappel en attente.
      const next = getNextPendingReminder(validatedCampaign, timezone);
      const automation = await upsertCampaignAutomation(admin, communityId, existing, validatedCampaign, {
        isActive: Boolean(next),
        status: next ? "ACTIVE" : "DRAFT",
        nextRunAt: next?.runAt.toISOString() ?? null,
      });
      return NextResponse.json(automation);
    }

    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  } catch (error) {
    console.error("[Event Reminders Auto Config]", error);
    return NextResponse.json({ error: "Enregistrement impossible" }, { status: 500 });
  }
}
