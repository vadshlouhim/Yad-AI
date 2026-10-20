import { NEWSLETTER_RAV_WORD_LIMIT } from "./limits";
import { NEWSLETTER_ERROR_CODES, NewsletterError } from "./errors";

export const REVISION_FIELDS = ["title", "intro", "ravWord", "shabbatNote", "eventIntro", "parnessText", "kiddushText"] as const;
export type RevisionField = typeof REVISION_FIELDS[number];
export type NewsletterLayoutPreferences = {
  order?: string[];
  photoSide?: "auto" | "front" | "back";
  composition?: "auto" | "full" | "columns";
  fontSize?: number;
  density?: "auto" | "compact" | "tight";
  pageLimit?: 2 | 3;
  deferredMediaIds?: string[];
};
export const CAPTION_LIMIT = 180;

export function parseLayoutPreferences(raw: unknown): NewsletterLayoutPreferences {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const value = raw as Record<string, unknown>;
  return {
    ...(Array.isArray(value.order) ? { order: [...new Set(value.order.filter((id): id is string => typeof id === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(id)))].slice(0, 40) } : {}),
    ...(["auto", "front", "back"].includes(String(value.photoSide)) ? { photoSide: value.photoSide as "auto" | "front" | "back" } : {}),
    ...(["auto", "full", "columns"].includes(String(value.composition)) ? { composition: value.composition as "auto" | "full" | "columns" } : {}),
    ...(typeof value.fontSize === "number" && value.fontSize >= 9.5 && value.fontSize <= 12 && value.fontSize * 2 === Math.round(value.fontSize * 2) ? { fontSize: value.fontSize } : {}),
    ...(["auto", "compact", "tight"].includes(String(value.density)) ? { density: value.density as "auto" | "compact" | "tight" } : {}),
    ...(value.pageLimit === 2 || value.pageLimit === 3 ? { pageLimit: value.pageLimit } : {}),
    ...(Array.isArray(value.deferredMediaIds) ? { deferredMediaIds: [...new Set(value.deferredMediaIds.filter((id): id is string => typeof id === "string" && id.length <= 200))].slice(0, 20) } : {}),
  };
}

export type NewsletterRevision = { changes: Partial<Record<RevisionField, string>>; layout: NewsletterLayoutPreferences; summary: string };
/** Both server and browser enforce the explicitly selected edit scope. */
export function validateNewsletterRevision(raw: unknown, allowed: RevisionField[]): NewsletterRevision {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new NewsletterError(NEWSLETTER_ERROR_CODES.invalidAiResponse);
  const value = raw as Record<string, unknown>;
  const changes: NewsletterRevision["changes"] = {};
  if (value.changes !== undefined) {
    if (!value.changes || typeof value.changes !== "object" || Array.isArray(value.changes)) throw new NewsletterError(NEWSLETTER_ERROR_CODES.invalidAiResponse);
    for (const [key, text] of Object.entries(value.changes)) {
      if (!allowed.includes(key as RevisionField) || !REVISION_FIELDS.includes(key as RevisionField)) throw new NewsletterError(NEWSLETTER_ERROR_CODES.invalidAiResponse);
      const maxLength = key === "title" ? 100 : key === "ravWord" ? NEWSLETTER_RAV_WORD_LIMIT : 12000;
      if (typeof text !== "string" || !text.trim() || text.length > maxLength) throw new NewsletterError(NEWSLETTER_ERROR_CODES.invalidAiResponse);
      changes[key as RevisionField] = text;
    }
  }
  return { changes, layout: parseLayoutPreferences(value.layout), summary: typeof value.summary === "string" ? value.summary.slice(0, 600) : "Nouvelle composition préparée." };
}
