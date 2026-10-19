import { HDate, HebrewDateEvent, Locale, getSedra } from "@hebcal/core";
import type { OutputLocale } from "@/lib/ai/output-locale";

function hdate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new HDate(new Date(year, month - 1, day, 12));
}

export function localizedHebrewDate(fridayDate: string, locale: OutputLocale, frenchFallback = "") {
  const friday = hdate(fridayDate);
  const saturday = new HDate(friday.abs() + 1);
  if (locale === "he") return new HebrewDateEvent(saturday).render("he");
  return frenchFallback || new HebrewDateEvent(saturday).render("fr");
}

export function localizedParasha(fridayDate: string, locale: OutputLocale, frenchFallback = "", israel = false) {
  const friday = hdate(fridayDate);
  const saturday = new HDate(friday.abs() + 1);
  const names = getSedra(saturday.getFullYear(), israel).lookup(saturday).parsha;
  if (locale === "he") return names.map((name) => Locale.gettext(name, "he")).join("־");
  return frenchFallback || names.join("-");
}

export const RELIGIOUS_COPY = {
  fr: { parasha: "Paracha", hebrewDate: "Date hébraïque", entry: "Entrée", exit: "Sortie", unavailable: "À vérifier", source: "Horaires de Chabbat fournis par Chabad.org/ShabbatTimes" },
  he: { parasha: "פרשת השבוע", hebrewDate: "תאריך עברי", entry: "כניסת שבת", exit: "צאת שבת", unavailable: "יש לבדוק", source: "זמני שבת באדיבות Chabad.org/ShabbatTimes" },
} as const;
