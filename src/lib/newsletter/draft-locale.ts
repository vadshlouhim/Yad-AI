import { parseOutputLocale, type OutputLocale } from "@/lib/ai/output-locale";

export const NEWSLETTER_DRAFT_VERSION = 3 as const;

/**
 * Versions 1 and 2 were written before the output locale was an explicit,
 * reliable draft choice. Their editorial content is therefore French.
 */
export function resolveNewsletterDraftLocale(version: unknown, value: unknown, newDraftDefault: OutputLocale): OutputLocale {
  return version === NEWSLETTER_DRAFT_VERSION ? parseOutputLocale(value, newDraftDefault) : "fr";
}
