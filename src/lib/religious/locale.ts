import { HDate, HebrewDateEvent, Locale, getSedra } from "@hebcal/core";
import type { OutputLocale } from "@/lib/ai/output-locale";

function hdate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new HDate(new Date(year, month - 1, day, 12));
}

export function localizedHebrewDateForDate(date: string, locale: OutputLocale, frenchFallback = "") {
  const value = hdate(date);
  if (locale === "he") return value.renderGematriya(true);
  if (locale === "fr") return frenchFallback || new HebrewDateEvent(value).render("fr");
  return new HebrewDateEvent(value).render("en");
}

export function localizedHebrewDate(fridayDate: string, locale: OutputLocale, frenchFallback = "") {
  const friday = hdate(fridayDate);
  const saturday = new HDate(friday.abs() + 1);
  if (locale === "he") return saturday.renderGematriya(true);
  if (locale === "fr") return frenchFallback || new HebrewDateEvent(saturday).render("fr");
  return new HebrewDateEvent(saturday).render("en");
}

export function localizedParasha(fridayDate: string, locale: OutputLocale, frenchFallback = "", israel = false) {
  const friday = hdate(fridayDate);
  const saturday = new HDate(friday.abs() + 1);
  const names = getSedra(saturday.getFullYear(), israel).lookup(saturday).parsha;
  if (locale === "he") return names.map((name) => Locale.gettext(name, "he")).join("־");
  if (locale === "fr") return frenchFallback || names.join("-");
  return names.map((name) => Locale.gettext(name, "en")).join("-");
}

export function localizedHolidayName(name: string, nameHebrew: string, locale: OutputLocale) {
  return locale === "he" ? nameHebrew || name : name;
}

export const RELIGIOUS_COPY = {
  fr: {
    parasha: "Paracha",
    hebrewDate: "Date hébraïque",
    entry: "Entrée de Chabbat",
    candleLighting: "Allumage des bougies",
    exit: "Sortie de Chabbat",
    havdalah: "Havdala",
    holidayEve: "Veille de fête",
    holidayExit: "Sortie de fête",
    unavailable: "À vérifier",
  },
  he: {
    parasha: "פרשת השבוע",
    hebrewDate: "תאריך עברי",
    entry: "כניסת שבת",
    candleLighting: "הדלקת נרות",
    exit: "יציאת שבת",
    havdalah: "הבדלה",
    holidayEve: "ערב חג",
    holidayExit: "מוצאי חג",
    unavailable: "יש לבדוק",
  },
  en: {
    parasha: "Parasha",
    hebrewDate: "Hebrew date",
    entry: "Shabbat begins",
    candleLighting: "Candle lighting",
    exit: "Shabbat ends",
    havdalah: "Havdalah",
    holidayEve: "Holiday begins",
    holidayExit: "Holiday ends",
    unavailable: "To be confirmed",
  },
} as const;
