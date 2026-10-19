export const OUTPUT_LOCALES = ["fr", "he"] as const;

export type OutputLocale = (typeof OUTPUT_LOCALES)[number];

export function parseOutputLocale(value: unknown, fallback: OutputLocale = "fr"): OutputLocale {
  return value === "he" || value === "fr" ? value : fallback;
}

export function outputLanguageDirective(locale: OutputLocale) {
  return locale === "he"
    ? "Rédige tout le contenu éditorial en hébreu naturel, moderne et respectueux. N'utilise le français que pour un nom propre ou une donnée fournie qui doit rester inchangée. Renvoie uniquement du texte en écriture hébraïque quand une traduction est possible."
    : "Rédige tout le contenu éditorial en français naturel, chaleureux et sobre. Conserve tels quels les noms propres et les données fournies.";
}

export function outputIntlLocale(locale: OutputLocale) {
  return locale === "he" ? "he-IL" : "fr-FR";
}
