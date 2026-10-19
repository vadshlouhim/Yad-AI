import { parseOutputLocale, type OutputLocale } from "@/lib/ai/output-locale";

export const NEWSLETTER_DRAFT_VERSION = 4 as const;

/**
 * Versions 1 through 3 predate locale-isolated drafts. Their editorial
 * content is therefore treated as French.
 */
export function resolveNewsletterDraftLocale(version: unknown, value: unknown, newDraftDefault: OutputLocale): OutputLocale {
  if (version === NEWSLETTER_DRAFT_VERSION) return parseOutputLocale(value, newDraftDefault);
  return "fr";
}
