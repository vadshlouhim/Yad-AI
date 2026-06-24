import { fromZonedTime, toZonedTime } from "date-fns-tz";

export const EVENT_REMINDERS_AUTOMATION_NAME = "Automatisation J-10 / J-5";

export const DEFAULT_REMINDER_TIME = "10:00";
export const DEFAULT_TIMEZONE = "Europe/Paris";

// Décalages par défaut, en jours avant l'événement. 0 = Jour J.
export const DEFAULT_REMINDER_OFFSETS = [10, 5, 3, 1, 0] as const;

export const REMINDER_CHANNELS = ["INSTAGRAM", "FACEBOOK", "WHATSAPP", "EMAIL"] as const;
export type ReminderChannel = (typeof REMINDER_CHANNELS)[number];

export type ReminderStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "PENDING_VALIDATION"
  | "PUBLISHED"
  | "CANCELLED"
  | "ERROR";

export type ScheduleMode = "direct" | "notification";

export type EventReminder = {
  id: string;
  /** Décalage en jours avant l'événement (null si date exacte). */
  offsetDays: number | null;
  /** Date exacte de publication "YYYY-MM-DD" (prioritaire sur offsetDays). */
  exactDate: string | null;
  /** Date de publication calculée "YYYY-MM-DD". */
  date: string;
  /** Heure de publication "HH:MM" (heure locale Europe/Paris). */
  time: string;
  /** Libellé court affiché : J-10, J-5, J-3, Demain, Jour J, ou personnalisé. */
  label: string;
  channels: ReminderChannel[];
  status: ReminderStatus;
  /** URL de l'affiche déclinée pour ce rappel (étape 2 — déclinaison IA). */
  visualUrl: string | null;
  /** Identifiant de l'entrée Agenda IA (Event) créée à la validation. */
  agendaItemId: string | null;
  /** Identifiant du draft / publication générée au déclenchement. */
  publishedDraftId: string | null;
};

export type EventReminderCampaign = {
  eventId: string | null;
  eventName: string;
  /** Date de l'événement "YYYY-MM-DD". */
  eventDate: string;
  /** Heure de l'événement "HH:MM". */
  eventTime: string | null;
  eventLocation: string | null;
  eventContact: string | null;
  eventRegistrationUrl: string | null;
  mainVisualUrl: string | null;
  sourceType: "existing_event" | "new_event";
  scheduleMode: ScheduleMode;
  channels: ReminderChannel[];
  reminders: EventReminder[];
  /** true une fois que l'utilisateur a validé la campagne (entrées Agenda créées). */
  validated: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

/** Libellé court d'un rappel à partir de son décalage en jours. */
export function reminderLabel(offsetDays: number | null, exactDate: string | null): string {
  if (offsetDays === null) return exactDate ? "Rappel" : "Rappel";
  if (offsetDays === 0) return "Jour J";
  if (offsetDays === 1) return "Demain";
  return `J-${offsetDays}`;
}

/**
 * Calcule la date/heure de publication d'un rappel en UTC (pour nextRunAt).
 * Le calcul se fait toujours en heure Europe/Paris, jamais en UTC local.
 */
export function computeReminderRunAt(params: {
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM"
  timezone?: string | null;
}): Date {
  const timezone = params.timezone || DEFAULT_TIMEZONE;
  const [h, m] = params.time.split(":").map((part) => Number(part));
  const hours = Number.isFinite(h) ? Math.min(Math.max(h, 0), 23) : 10;
  const minutes = Number.isFinite(m) ? Math.min(Math.max(m, 0), 59) : 0;
  // Construit la date dans le fuseau cible puis convertit en UTC.
  const zoned = toZonedTime(new Date(`${params.date}T00:00:00Z`), timezone);
  zoned.setHours(hours, minutes, 0, 0);
  return fromZonedTime(zoned, timezone);
}

/** Soustrait `offsetDays` jours calendaires à une date "YYYY-MM-DD". */
export function subtractDaysISO(eventDate: string, offsetDays: number): string {
  const d = new Date(`${eventDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - offsetDays);
  return d.toISOString().slice(0, 10);
}

/** Date du jour "YYYY-MM-DD" en heure Europe/Paris. */
export function todayISO(now: Date, timezone = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Un rappel est-il déjà passé (sa date de publication est < aujourd'hui) ? */
export function isReminderPast(reminder: { date: string }, now: Date, timezone = DEFAULT_TIMEZONE): boolean {
  return reminder.date < todayISO(now, timezone);
}

let counter = 0;
function reminderId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  counter += 1;
  return `rem_${Date.now()}_${counter}`;
}

/**
 * Construit les rappels par défaut (J-10, J-5, J-3, Demain, Jour J) pour un
 * événement, en retirant automatiquement ceux déjà passés.
 */
export function buildDefaultReminders(params: {
  eventDate: string;
  channels: ReminderChannel[];
  now: Date;
  timezone?: string | null;
}): EventReminder[] {
  const { eventDate, channels, now } = params;
  const timezone = params.timezone || DEFAULT_TIMEZONE;

  return DEFAULT_REMINDER_OFFSETS.map((offsetDays) => {
    const date = subtractDaysISO(eventDate, offsetDays);
    return {
      id: reminderId(),
      offsetDays,
      exactDate: null,
      date,
      time: DEFAULT_REMINDER_TIME,
      label: reminderLabel(offsetDays, null),
      channels: [...channels],
      status: "DRAFT" as ReminderStatus,
      visualUrl: null,
      agendaItemId: null,
      publishedDraftId: null,
    };
  }).filter((reminder) => !isReminderPast(reminder, now, timezone));
}

/** Recalcule la date de chaque rappel à partir de la date d'événement. */
export function recomputeReminderDates(
  reminders: EventReminder[],
  eventDate: string,
  now: Date,
  timezone = DEFAULT_TIMEZONE
): EventReminder[] {
  return reminders
    .map((reminder) => {
      if (reminder.exactDate) {
        return { ...reminder, date: reminder.exactDate, label: reminder.label || "Rappel" };
      }
      if (reminder.offsetDays === null) return reminder;
      const date = subtractDaysISO(eventDate, reminder.offsetDays);
      return { ...reminder, date, label: reminderLabel(reminder.offsetDays, null) };
    })
    .filter((reminder) => !isReminderPast(reminder, now, timezone));
}

/** Trie les rappels par date/heure de publication croissante. */
export function sortReminders(reminders: EventReminder[]): EventReminder[] {
  return [...reminders].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.time < b.time ? -1 : a.time > b.time ? 1 : 0;
  });
}

/** Renvoie le prochain rappel non encore publié/annulé et sa date UTC. */
export function getNextPendingReminder(
  campaign: EventReminderCampaign,
  timezone = DEFAULT_TIMEZONE
): { reminder: EventReminder; runAt: Date } | null {
  const pending = sortReminders(
    campaign.reminders.filter((r) => r.status !== "PUBLISHED" && r.status !== "CANCELLED")
  );
  const next = pending[0];
  if (!next) return null;
  return { reminder: next, runAt: computeReminderRunAt({ date: next.date, time: next.time, timezone }) };
}

/** Trouve le rappel à déclencher maintenant (date/heure atteinte, non publié). */
export function getDueReminder(
  campaign: EventReminderCampaign,
  now: Date,
  timezone = DEFAULT_TIMEZONE
): EventReminder | null {
  const due = sortReminders(
    campaign.reminders.filter((r) => {
      if (r.status === "PUBLISHED" || r.status === "CANCELLED") return false;
      const runAt = computeReminderRunAt({ date: r.date, time: r.time, timezone });
      return now >= runAt;
    })
  );
  return due[0] ?? null;
}

/** Extrait la config campagne depuis triggerConfig (ou null). */
export function getCampaignFromTriggerConfig(
  triggerConfig: unknown
): EventReminderCampaign | null {
  if (!isRecord(triggerConfig)) return null;
  const value = triggerConfig.eventReminderCampaign;
  if (!isRecord(value)) return null;
  return value as unknown as EventReminderCampaign;
}
