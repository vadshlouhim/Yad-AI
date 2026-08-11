import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicationsFromDraft, publishToAllChannels } from "@/lib/publishing/publisher";
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
  getCampaignFromTriggerConfig,
  type EventReminder,
  type EventReminderCampaign,
  type ReminderChannel,
  type ScheduleMode,
} from "@/lib/automation/event-reminders";
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
  return value === "automatic" ? "automatic" : "notification";
}

function buildActions(channels: ReminderChannel[], scheduleMode: ScheduleMode = "notification"): Json {
  const requiresValidation = scheduleMode !== "automatic";
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

function dateInTimezone(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
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

async function publishReminder(
  admin: Admin,
  communityId: string,
  existing: AutomationRow | null,
  campaign: EventReminderCampaign,
  body: Record<string, unknown>
) {
  const reminderId = stringOrEmpty(body.reminderId);
  const reminder = campaign.reminders.find((item) => item.id === reminderId) ?? campaign.reminders[0];
  if (!reminder) {
    return NextResponse.json({ error: "Rappel introuvable." }, { status: 404 });
  }

  const caption = stringOrEmpty(body.caption);
  const imageUrl = stringOrEmpty(body.imageUrl) || reminder.visualUrl || campaign.mainVisualUrl || null;
  if (!caption && !imageUrl) {
    return NextResponse.json({ error: "Ajoutez un message ou une image avant de publier." }, { status: 400 });
  }

  const { data: socialChannels } = await admin
    .from("Channel")
    .select("id,type")
    .eq("communityId", communityId)
    .in("type", ["INSTAGRAM", "FACEBOOK"] as never[])
    .eq("isActive", true)
    .eq("isConnected", true);

  const channels = ((socialChannels ?? []) as SocialChannelRow[]).filter((channel) =>
    ["INSTAGRAM", "FACEBOOK"].includes(channel.type)
  );
  if (channels.length === 0) {
    return NextResponse.json(
      { error: "Aucun canal Instagram ou Facebook actif. Configurez vos réseaux dans Paramètres > Canaux." },
      { status: 409 }
    );
  }

  const draftId = crypto.randomUUID();
  const nowIso = new Date().toISOString();
  await admin.from("ContentDraft").insert({
    id: draftId,
    communityId,
    title: `${campaign.eventName} - ${reminder.label}`,
    body: caption || `${campaign.eventName} - ${reminder.label}`,
    imageUrl,
    contentType: "EVENT_POST" as never,
    status: "APPROVED",
    aiGenerated: true,
    aiPromptUsed: "event-reminders-auto-publish-reminder",
    createdAt: nowIso,
    updatedAt: nowIso,
  } as never);

  const channelIds = channels.map((channel) => channel.id);
  await createPublicationsFromDraft({ draftId, communityId, channelIds });
  const results = await publishToAllChannels(draftId, channelIds);

  const updatedCampaign: EventReminderCampaign = {
    ...campaign,
    reminders: campaign.reminders.map((item) =>
      item.id === reminder.id ? { ...item, status: "PUBLISHED", publishedDraftId: draftId, visualUrl: imageUrl } : item
    ),
  };
  const timezone = await getTimezone(admin, communityId);
  const next = getNextPendingReminder(updatedCampaign, timezone);
  await upsertCampaignAutomation(admin, communityId, existing, updatedCampaign, {
    isActive: Boolean(next),
    status: next ? "ACTIVE" : "DRAFT",
    nextRunAt: next?.runAt.toISOString() ?? null,
  });

  const links = channels.map((channel) => ({
    channel: channel.type === "INSTAGRAM" ? "Instagram" : "Facebook",
    url: results[channel.id]?.externalUrl ?? null,
    success: results[channel.id]?.success === true,
    error: results[channel.id]?.error,
  }));

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

    if (mode === "configure") {
      const eventInput = isRecord(body.event) ? body.event : {};
      const eventIdInput = stringOrEmpty(eventInput.id) || null;
      const requestedOffsets = Array.isArray(body.offsets)
        ? [...new Set(body.offsets.map(Number).filter((value) => [10, 5, 3, 1, 0].includes(value)))]
        : [];
      if (requestedOffsets.length === 0) {
        return NextResponse.json({ error: "Sélectionnez au moins un rappel." }, { status: 400 });
      }

      const requestedChannels = Array.isArray(body.channels)
        ? [...new Set(body.channels.filter((value): value is "FACEBOOK" | "INSTAGRAM" => value === "FACEBOOK" || value === "INSTAGRAM"))]
        : [];
      if (requestedChannels.length === 0) {
        return NextResponse.json({ error: "Sélectionnez au moins un réseau." }, { status: 400 });
      }

      const timezone = await getTimezone(admin, communityId);
      let eventRecord: {
        id: string;
        title: string;
        startDate: string;
        location: string | null;
        coverImageUrl: string | null;
        registrationUrl: string | null;
      } | null = null;

      if (eventIdInput) {
        const { data } = await admin
          .from("Event")
          .select("id,title,startDate,location,coverImageUrl,registrationUrl")
          .eq("id", eventIdInput)
          .eq("communityId", communityId)
          .maybeSingle();
        eventRecord = data;
        if (!eventRecord) return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });
      }

      const eventDate = eventRecord ? dateInTimezone(eventRecord.startDate, timezone) : normalizeDate(eventInput.date);
      const eventTitle = eventRecord?.title ?? stringOrEmpty(eventInput.title);
      const eventTime = eventRecord
        ? new Intl.DateTimeFormat("fr-FR", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hour12: false })
            .format(new Date(eventRecord.startDate))
            .replace("h", ":")
        : normalizeTime(eventInput.time);
      const eventLocation = (eventRecord?.location ?? stringOrEmpty(eventInput.location)) || null;
      const eventPosterUrl = (eventRecord?.coverImageUrl ?? stringOrEmpty(eventInput.coverImageUrl)) || null;
      if (!eventDate || !eventTitle) {
        return NextResponse.json({ error: "Renseignez le nom et la date de l’événement." }, { status: 400 });
      }

      const { data: connectedRows } = await admin
        .from("Channel")
        .select("type")
        .eq("communityId", communityId)
        .in("type", ["FACEBOOK", "INSTAGRAM"] as never[])
        .eq("isActive", true)
        .eq("isConnected", true);
      const connected = new Set((connectedRows ?? []).map((row) => row.type));
      const disconnected = requestedChannels.filter((channel) => !connected.has(channel));
      if (disconnected.length > 0) {
        return NextResponse.json({ error: `Connectez d’abord ${disconnected.join(" et ")}.` }, { status: 409 });
      }

      let instagramSkipped = false;
      let effectiveChannels: ReminderChannel[] = [...requestedChannels];
      if (effectiveChannels.includes("INSTAGRAM") && !eventPosterUrl) {
        instagramSkipped = true;
        effectiveChannels = effectiveChannels.filter((channel) => channel !== "INSTAGRAM");
        if (!effectiveChannels.includes("FACEBOOK") && connected.has("FACEBOOK")) effectiveChannels.push("FACEBOOK");
      }
      if (effectiveChannels.length === 0) {
        return NextResponse.json({ error: "Ajoutez une affiche pour Instagram ou connectez Facebook." }, { status: 409 });
      }

      const reminders = buildDefaultReminders({ eventDate, channels: effectiveChannels, now, timezone })
        .filter((reminder) => reminder.offsetDays !== null && requestedOffsets.includes(reminder.offsetDays));
      if (reminders.length === 0) {
        return NextResponse.json({ error: "Tous les rappels sélectionnés sont déjà passés." }, { status: 400 });
      }

      if (!eventRecord) {
        const startDate = computeReminderRunAt({ date: eventDate, time: eventTime, timezone }).toISOString();
        const { data, error } = await admin
          .from("Event")
          .insert({
            id: crypto.randomUUID(),
            communityId,
            title: eventTitle,
            startDate,
            location: eventLocation,
            coverImageUrl: eventPosterUrl,
            category: "OTHER",
            status: "SCHEDULED",
            isPublic: true,
            updatedAt: new Date().toISOString(),
          })
          .select("id,title,startDate,location,coverImageUrl,registrationUrl")
          .single();
        if (error) throw error;
        eventRecord = data;
      }

      const campaign: EventReminderCampaign = {
        eventId: eventRecord.id,
        eventName: eventTitle,
        eventDate,
        eventTime,
        eventLocation,
        eventContact: null,
        eventRegistrationUrl: eventRecord.registrationUrl,
        mainVisualUrl: eventPosterUrl,
        sourceType: eventIdInput ? "existing_event" : "new_event",
        scheduleMode: normalizeScheduleMode(body.scheduleMode),
        channels: effectiveChannels,
        reminders,
        validated: true,
      };
      const existing = await findCampaignAutomation(admin, communityId, campaign.eventId);
      const previousCampaign = existing ? getCampaignFromTriggerConfig(existing.triggerConfig) : null;
      if (previousCampaign) {
        const selectedOffsetKeys = new Set(campaign.reminders.map((reminder) => reminder.offsetDays));
        const removedAgendaIds = previousCampaign.reminders
          .filter((reminder) => !selectedOffsetKeys.has(reminder.offsetDays))
          .map((reminder) => reminder.agendaItemId)
          .filter((id): id is string => Boolean(id));
        if (removedAgendaIds.length > 0) {
          await admin.from("Event").update({ status: "ARCHIVED", updatedAt: new Date().toISOString() }).in("id", removedAgendaIds).eq("communityId", communityId);
        }
        campaign.reminders = campaign.reminders.map((reminder) => {
          const previous = previousCampaign.reminders.find((item) => item.offsetDays === reminder.offsetDays);
          return previous
            ? { ...reminder, agendaItemId: previous.agendaItemId, publishedDraftId: previous.publishedDraftId, status: previous.status }
            : reminder;
        });
      }
      campaign.reminders = await syncAgendaEntries(admin, communityId, campaign, timezone);
      const next = getNextPendingReminder(campaign, timezone);
      const automation = await upsertCampaignAutomation(admin, communityId, existing, campaign, {
        isActive: Boolean(next),
        status: next ? "ACTIVE" : "DRAFT",
        nextRunAt: next?.runAt.toISOString() ?? null,
      });
      return NextResponse.json({ automation, instagramSkipped });
    }

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

    if (mode === "publish-reminder") {
      return publishReminder(admin, communityId, existing, campaign, body);
    }

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
