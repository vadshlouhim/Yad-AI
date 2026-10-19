import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from "@/i18n/config";

export const TEMPLATE_LANGUAGES = ["fr", "he", "en"] as const;
export type TemplateLanguage = (typeof TEMPLATE_LANGUAGES)[number];

export const TEMPLATE_LANGUAGE_LABELS: Record<TemplateLanguage, string> = {
  fr: "Français",
  he: "עברית",
  en: "English",
};

export function normalizeTemplateLanguages(value: unknown): TemplateLanguage[] {
  if (!Array.isArray(value)) return [DEFAULT_LOCALE];
  const languages = [...new Set(value.filter((item): item is TemplateLanguage =>
    typeof item === "string" && TEMPLATE_LANGUAGES.includes(item as TemplateLanguage),
  ))];
  return languages.length > 0 ? languages : [DEFAULT_LOCALE];
}

export function parseTemplateLanguages(value: unknown): TemplateLanguage[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const languages = [...new Set(value.filter((item): item is TemplateLanguage =>
    typeof item === "string" && TEMPLATE_LANGUAGES.includes(item as TemplateLanguage),
  ))];
  return languages.length === value.length ? languages : null;
}

export function enabledTemplateLanguageOptions() {
  return TEMPLATE_LANGUAGES.filter((language) =>
    SUPPORTED_LOCALES.includes(language as Locale),
  );
}
