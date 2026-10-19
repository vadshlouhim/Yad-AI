import { DEFAULT_LOCALE, SUPPORTED_LOCALES, isSupportedLocale, type Locale } from "@/i18n/config";

export const OUTPUT_LOCALES = SUPPORTED_LOCALES;
export type OutputLocale = Locale;

const LANGUAGE_DIRECTIVES: Record<string, string> = {
  fr: "Rédige tout le contenu éditorial en français naturel, chaleureux et sobre. Conserve tels quels les noms propres et les données fournies.",
  he: "Rédige tout le contenu éditorial en hébreu naturel, moderne et respectueux. N'utilise le français que pour un nom propre ou une donnée fournie qui doit rester inchangée. Renvoie uniquement du texte en écriture hébraïque quand une traduction est possible.",
  en: "Write all editorial content in natural, warm and concise English. Keep proper nouns and supplied data unchanged.",
};

const INTL_LOCALES: Record<string, string> = { fr: "fr-FR", he: "he-IL", en: "en-GB" };

export function parseOutputLocale(value: unknown, fallback: OutputLocale = "fr"): OutputLocale {
  return isSupportedLocale(value) ? value : fallback;
}

export function outputLanguageDirective(locale: OutputLocale) {
  return LANGUAGE_DIRECTIVES[locale] ?? LANGUAGE_DIRECTIVES[DEFAULT_LOCALE];
}

export function outputIntlLocale(locale: OutputLocale) {
  return INTL_LOCALES[locale] ?? INTL_LOCALES[DEFAULT_LOCALE];
}
