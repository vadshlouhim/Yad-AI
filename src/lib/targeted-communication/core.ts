import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

export const TARGETED_VARIABLES = ["{Prénom}", "{Nom}", "{Événement}", "{Date}", "{Heure}", "{Adresse}", "{Lien}"] as const;

export function normalizeTargetedPhone(value: unknown) {
  const raw = String(value ?? "").trim();
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (raw.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("0")) return `+33${digits.slice(1)}`;
  return `+${digits}`;
}

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

export function createPreferenceToken() {
  return randomBytes(32).toString("base64url");
}

export function hashPreferenceToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function computeNextTargetedRun(params: {
  weekday: number;
  sendTime: string;
  timezone: string;
  after?: Date;
}) {
  const after = params.after ?? new Date();
  const local = toZonedTime(after, params.timezone);
  const [hour, minute] = params.sendTime.split(":").map(Number);
  const candidate = new Date(local);
  candidate.setHours(hour, minute, 0, 0);
  const days = (params.weekday - candidate.getDay() + 7) % 7;
  candidate.setDate(candidate.getDate() + days);
  if (fromZonedTime(candidate, params.timezone) <= after) candidate.setDate(candidate.getDate() + 7);
  return fromZonedTime(candidate, params.timezone);
}

export function formatTargetedMessage(params: {
  template: string;
  firstName?: string | null;
  lastName?: string | null;
  eventName?: string | null;
  scheduledFor: Date;
  timezone: string;
  eventTime?: string | null;
  address?: string | null;
  link?: string | null;
}) {
  const replacements: Record<string, string> = {
    "{Prénom}": params.firstName?.trim() || "",
    "{Nom}": params.lastName?.trim() || "",
    "{Événement}": params.eventName?.trim() || "",
    "{Date}": formatInTimeZone(params.scheduledFor, params.timezone, "dd/MM/yyyy"),
    "{Heure}": params.eventTime?.trim() || "",
    "{Adresse}": params.address?.trim() || "",
    "{Lien}": params.link?.trim() || "",
  };
  return Object.entries(replacements).reduce((message, [variable, value]) => message.split(variable).join(value), params.template);
}

export async function getSchoolHolidayState(date: Date, zone: string) {
  const dateISO = date.toISOString().slice(0, 10);
  const where = `start_date <= date'${dateISO}' AND end_date >= date'${dateISO}' AND zones = 'Zone ${zone}'`;
  const url = new URL("https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-calendrier-scolaire/records");
  url.searchParams.set("limit", "1");
  url.searchParams.set("where", where);

  try {
    const response = await fetch(url, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(8_000) });
    if (!response.ok) return { holiday: false, reliable: false };
    const payload = await response.json() as { total_count?: number; results?: unknown[] };
    return { holiday: (payload.total_count ?? payload.results?.length ?? 0) > 0, reliable: true };
  } catch {
    return { holiday: false, reliable: false };
  }
}

