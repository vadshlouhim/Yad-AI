import {
  isAllowedRecapDay,
  nextAllowedRecapDate,
  computeRecapRunAt,
  dateISOInTz,
  DEFAULT_TIMEZONE,
} from "./event-recap";

export const MONTHLY_PROGRAM_RECAP_AUTOMATION_NAME = "Programme & récap du mois";

export const DEFAULT_MONTHLY_TIME = "10:00";
export const MAX_PROGRAM_EVENTS = 10;
export const MAX_RECAP_PHOTOS = 10;

export const MONTHLY_CHANNELS = ["INSTAGRAM", "FACEBOOK", "WHATSAPP", "EMAIL"] as const;
export type MonthlyChannel = (typeof MONTHLY_CHANNELS)[number];

export type MonthlyRunType = "program" | "recap";
export type MonthlyStatus = "active" | "paused";

export type MonthlySettings = {
  status: MonthlyStatus;
  timezone: string;
  programNotificationDay: number; // 1..28 (jour du mois)
  programNotificationTime: string; // "HH:MM"
  recapNotificationDay: number; // 0 = dernier jour du mois, sinon 1..28
  recapNotificationTime: string;
  selectedProgramBackgroundId: string | null;
  selectedRecapBackgroundId: string | null;
  channels: MonthlyChannel[];
};

export type MonthlyHistoryEntry = {
  status: "NOTIFIED" | "PUBLISHED" | "IGNORED";
  notifiedOn?: string; // "YYYY-MM-DD"
  publishedAt?: string; // ISO
  draftId?: string;
};
export type MonthlyHistory = Record<string, MonthlyHistoryEntry>; // clé "YYYY-MM"

export const DEFAULT_MONTHLY_SETTINGS: MonthlySettings = {
  status: "active",
  timezone: DEFAULT_TIMEZONE,
  programNotificationDay: 1,
  programNotificationTime: DEFAULT_MONTHLY_TIME,
  recapNotificationDay: 0,
  recapNotificationTime: DEFAULT_MONTHLY_TIME,
  selectedProgramBackgroundId: null,
  selectedRecapBackgroundId: null,
  channels: ["INSTAGRAM", "FACEBOOK", "WHATSAPP", "EMAIL"],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
function pad(n: number) {
  return String(n).padStart(2, "0");
}
function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

export function monthKey(year: number, monthIndex: number): string {
  return `${year}-${pad(monthIndex + 1)}`;
}

/** Date de base "YYYY-MM-DD" d'une occurrence (avant report Chabbat/Yom Tov). */
function baseOccurrenceDate(settings: MonthlySettings, type: MonthlyRunType, year: number, monthIndex: number): string {
  const last = lastDayOfMonth(year, monthIndex);
  let day: number;
  if (type === "program") {
    day = Math.min(Math.max(settings.programNotificationDay, 1), last);
  } else {
    day = settings.recapNotificationDay <= 0 ? last : Math.min(settings.recapNotificationDay, last);
  }
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

export type MonthlyOccurrence = { type: MonthlyRunType; year: number; monthIndex: number; runAt: Date; key: string };

/** Occurrence (date/heure UTC) reportée au prochain jour autorisé. */
function occurrence(settings: MonthlySettings, type: MonthlyRunType, year: number, monthIndex: number, timezone: string): MonthlyOccurrence {
  const base = baseOccurrenceDate(settings, type, year, monthIndex);
  const shifted = nextAllowedRecapDate(base, timezone);
  const time = type === "program" ? settings.programNotificationTime : settings.recapNotificationTime;
  return {
    type,
    year,
    monthIndex,
    key: monthKey(year, monthIndex),
    runAt: computeRecapRunAt({ date: shifted, time, timezone }),
  };
}

/** Toutes les occurrences sur 3 mois (mois précédent → mois suivant), triées. */
function occurrencesAround(settings: MonthlySettings, from: Date, timezone: string): MonthlyOccurrence[] {
  const todayISO = dateISOInTz(from, timezone);
  const [y, m] = todayISO.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, 1));
  const result: MonthlyOccurrence[] = [];
  for (let offset = -1; offset <= 2; offset += 1) {
    const d = new Date(base);
    d.setUTCMonth(d.getUTCMonth() + offset);
    const year = d.getUTCFullYear();
    const monthIndex = d.getUTCMonth();
    result.push(occurrence(settings, "program", year, monthIndex, timezone));
    result.push(occurrence(settings, "recap", year, monthIndex, timezone));
  }
  return result.sort((a, b) => a.runAt.getTime() - b.runAt.getTime());
}

/** Prochaine occurrence strictement après `from`. */
export function getNextMonthlyRun(settings: MonthlySettings, from = new Date(), timezone = DEFAULT_TIMEZONE): MonthlyOccurrence | null {
  return occurrencesAround(settings, from, timezone).find((o) => o.runAt.getTime() > from.getTime()) ?? null;
}

/** Occurrence due maintenant (atteinte, pas encore traitée), aujourd'hui jour autorisé. */
export function getDueMonthly(
  settings: MonthlySettings,
  now: Date,
  programHistory: MonthlyHistory,
  recapHistory: MonthlyHistory,
  timezone = DEFAULT_TIMEZONE
): MonthlyOccurrence | null {
  const todayISO = dateISOInTz(now, timezone);
  if (!isAllowedRecapDay(todayISO, timezone)) return null;
  const due = occurrencesAround(settings, now, timezone)
    .filter((o) => o.runAt.getTime() <= now.getTime())
    .sort((a, b) => b.runAt.getTime() - a.runAt.getTime()); // plus récente d'abord
  for (const occ of due) {
    const history = occ.type === "program" ? programHistory : recapHistory;
    const entry = history[occ.key];
    if (entry && (entry.status === "PUBLISHED" || entry.status === "IGNORED")) continue;
    if (entry && entry.status === "NOTIFIED" && entry.notifiedOn === todayISO) continue;
    // Évite de notifier une occurrence trop ancienne (plus de 7 jours).
    if (now.getTime() - occ.runAt.getTime() > 7 * 24 * 60 * 60 * 1000) continue;
    return occ;
  }
  return null;
}

export function getMonthlySettings(triggerConfig: unknown): MonthlySettings | null {
  if (!isRecord(triggerConfig)) return null;
  const value = triggerConfig.monthlyProgramRecapSettings;
  if (!isRecord(value)) return null;
  return value as unknown as MonthlySettings;
}
export function getProgramHistory(triggerConfig: unknown): MonthlyHistory {
  if (!isRecord(triggerConfig)) return {};
  const value = triggerConfig.programHistory;
  return isRecord(value) ? (value as MonthlyHistory) : {};
}
export function getRecapHistory(triggerConfig: unknown): MonthlyHistory {
  if (!isRecord(triggerConfig)) return {};
  const value = triggerConfig.recapHistory;
  return isRecord(value) ? (value as MonthlyHistory) : {};
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 1))
  );
}

export function defaultProgramCaption(params: { city?: string | null; communityName?: string | null }): string {
  const city = params.city?.trim();
  if (city) return `Découvrez les événements à venir ce mois-ci avec le Beth Habad de ${city}.`;
  const name = params.communityName?.trim();
  return name ? `Découvrez les événements à venir ce mois-ci avec ${name}.` : "Découvrez les événements à venir ce mois-ci.";
}
export function defaultRecapCaption(params: { city?: string | null; communityName?: string | null }): string {
  const city = params.city?.trim();
  if (city) return `Retour en images sur les événements de ce mois avec le Beth Habad de ${city}.`;
  const name = params.communityName?.trim();
  return name ? `Retour en images sur les événements de ce mois avec ${name}.` : "Retour en images sur les événements de ce mois.";
}
