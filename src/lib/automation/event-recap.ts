import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { HebrewCalendar, HDate, flags } from "@hebcal/core";

export const POST_EVENT_RECAP_AUTOMATION_NAME = "Récap automatique après événement";

export const DEFAULT_RECAP_TIME = "10:00";
export const DEFAULT_TIMEZONE = "Europe/Paris";

export const RECAP_CHANNELS = ["INSTAGRAM", "FACEBOOK", "WHATSAPP"] as const;
export type RecapChannel = (typeof RECAP_CHANNELS)[number];

export type RecapSettingsStatus = "active" | "paused";

export type EventRecapSettings = {
  status: RecapSettingsStatus;
  notificationTime: string; // "HH:MM" (heure locale Europe/Paris)
  timezone: string;
  channels: RecapChannel[];
};

export type RecapEventStatus = "READY" | "NOTIFIED" | "POSTPONED" | "PUBLISHED" | "IGNORED";

export type RecapHistoryEntry = {
  status: RecapEventStatus;
  notifiedOn?: string; // "YYYY-MM-DD"
  postponedUntil?: string; // "YYYY-MM-DD"
  publishedAt?: string; // ISO
  draftId?: string;
};

export type RecapHistory = Record<string, RecapHistoryEntry>;

export const DEFAULT_RECAP_SETTINGS: EventRecapSettings = {
  status: "active",
  notificationTime: DEFAULT_RECAP_TIME,
  timezone: DEFAULT_TIMEZONE,
  channels: ["INSTAGRAM", "FACEBOOK", "WHATSAPP"],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

/** Date "YYYY-MM-DD" dans le fuseau donné. */
export function dateISOInTz(date: Date, timezone = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function addDaysISO(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Le jour est-il Chabbat (samedi) dans le fuseau donné ? */
export function isShabbat(dateISO: string, timezone = DEFAULT_TIMEZONE): boolean {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "long" }).format(
    new Date(`${dateISO}T12:00:00Z`)
  );
  return weekday === "Saturday";
}

/** Le jour est-il un Yom Tov (chag où la mélakha est interdite) ? */
export function isYomTov(dateISO: string): boolean {
  try {
    const [y, m, d] = dateISO.split("-").map(Number);
    const hd = new HDate(new Date(y, m - 1, d));
    const events = HebrewCalendar.getHolidaysOnDate(hd, false) ?? [];
    return events.some((ev) => (ev.getFlags() & flags.CHAG) !== 0);
  } catch {
    return false;
  }
}

/** Jour autorisé pour notifier/publier (ni Chabbat ni Yom Tov). */
export function isAllowedRecapDay(dateISO: string, timezone = DEFAULT_TIMEZONE): boolean {
  return !isShabbat(dateISO, timezone) && !isYomTov(dateISO);
}

/** Prochain jour autorisé à partir d'une date (incluse). */
export function nextAllowedRecapDate(fromISO: string, timezone = DEFAULT_TIMEZONE): string {
  let date = fromISO;
  for (let i = 0; i < 21; i += 1) {
    if (isAllowedRecapDay(date, timezone)) return date;
    date = addDaysISO(date, 1);
  }
  return date;
}

/** Convertit une date + heure locale en instant UTC. */
export function computeRecapRunAt(params: { date: string; time: string; timezone?: string | null }): Date {
  const timezone = params.timezone || DEFAULT_TIMEZONE;
  const [h, m] = params.time.split(":").map((part) => Number(part));
  const hours = Number.isFinite(h) ? Math.min(Math.max(h, 0), 23) : 10;
  const minutes = Number.isFinite(m) ? Math.min(Math.max(m, 0), 59) : 0;
  const zoned = toZonedTime(new Date(`${params.date}T00:00:00Z`), timezone);
  zoned.setHours(hours, minutes, 0, 0);
  return fromZonedTime(zoned, timezone);
}

/** Prochaine exécution quotidienne du moteur de récap (jour suivant à l'heure choisie). */
export function nextDailyRunAt(settings: EventRecapSettings, from = new Date()): Date {
  const timezone = settings.timezone || DEFAULT_TIMEZONE;
  const todayISO = dateISOInTz(from, timezone);
  const todayRun = computeRecapRunAt({ date: todayISO, time: settings.notificationTime, timezone });
  if (from < todayRun) return todayRun;
  return computeRecapRunAt({ date: addDaysISO(todayISO, 1), time: settings.notificationTime, timezone });
}

export function getRecapSettingsFromTriggerConfig(triggerConfig: unknown): EventRecapSettings | null {
  if (!isRecord(triggerConfig)) return null;
  const value = triggerConfig.eventRecapSettings;
  if (!isRecord(value)) return null;
  return {
    ...(value as unknown as EventRecapSettings),
    notificationTime: DEFAULT_RECAP_TIME,
  };
}

export function getRecapHistory(triggerConfig: unknown): RecapHistory {
  if (!isRecord(triggerConfig)) return {};
  const value = triggerConfig.recapHistory;
  return isRecord(value) ? (value as RecapHistory) : {};
}
