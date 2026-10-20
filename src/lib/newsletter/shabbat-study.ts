import type { OutputLocale } from "@/lib/ai/output-locale";
import { outputIntlLocale } from "@/lib/ai/output-locale";

export type NewsletterStudy = {
  date: string;
  dateLabel: string;
  text: string;
  sourceUrl: string;
  sourceLabel: string;
  unavailable?: boolean;
};

/** The newsletter stores Friday's candle-lighting date, not Saturday. */
export function newsletterShabbatDate(friday: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(friday)) throw new Error("Date du Chabbat invalide.");
  const date = new Date(`${friday}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== friday || date.getUTCDay() !== 5) {
    throw new Error("La date des horaires doit correspondre au vendredi.");
  }
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function newsletterStudyDateLabel(date: string, locale: OutputLocale = "fr"): string {
  return new Intl.DateTimeFormat(outputIntlLocale(locale), { dateStyle: "full", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

export function hebrewSeferHamitsvotUrl(dateISO: string) {
  const [year, month, day] = dateISO.split("-").map(Number);
  if (!year || !month || !day) throw new Error("Date d'étude invalide.");
  return `https://he.chabad.org/dailystudy/seferHamitzvos.asp?tdate=${month}%2F${day}%2F${year}`;
}

export function unavailableNewsletterStudy(dateISO: string, locale: OutputLocale): NewsletterStudy {
  return {
    date: dateISO,
    dateLabel: newsletterStudyDateLabel(dateISO, locale),
    text: "",
    sourceUrl: locale === "he" ? hebrewSeferHamitsvotUrl(dateISO) : "https://www.loubavitch.fr",
    sourceLabel: locale === "he" ? "מקור: he.chabad.org" : "Source : Beth Loubavitch — loubavitch.fr",
    unavailable: true,
  };
}
