export const SUPPORTED_LOCALES = ["fr", "he"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fr";
export const LOCALE_COOKIE_NAME = "NEXT_LOCALE";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
export const LOCALE_SOURCE_COOKIE_NAME = "locale_source";
export const LOCALE_SOURCE_AUTO = "auto";
export const LOCALE_SOURCE_MANUAL = "manual";
export const LOCALE_PENDING_COOKIE_NAME = "NEXT_LOCALE_PENDING";
export const LOCALE_PENDING_COOKIE_MAX_AGE = 60 * 60 * 24;

export function isSupportedLocale(value: unknown): value is Locale {
  return typeof value === "string" && SUPPORTED_LOCALES.includes(value as Locale);
}

export function getLocaleDirection(locale: Locale): "ltr" | "rtl" {
  return locale === "he" ? "rtl" : "ltr";
}
