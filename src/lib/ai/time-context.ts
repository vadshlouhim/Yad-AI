import type { GenerationShabbatTimes } from "./prompts";
import type { JewishHoliday } from "@/lib/automation/hebcal";
import { HDate } from "@hebcal/core";

function formatInTimezone(date: Date, timezone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: timezone,
    ...options,
  }).format(date);
}

function getLocalDateForTimezone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return new Date(year, month - 1, day, 12, 0, 0);
}

function formatHoliday(holiday: JewishHoliday) {
  return `${holiday.name} : ${holiday.date}${holiday.hebrewDate ? `, ${holiday.hebrewDate}` : ""}${holiday.nameHebrew ? ` (${holiday.nameHebrew})` : ""}`;
}

export function buildTemporalSystemContext(params: {
  timezone?: string | null;
  city?: string | null;
  now?: Date;
  shabbatTimes?: GenerationShabbatTimes | null;
  nextHoliday?: JewishHoliday | null;
  upcomingHolidays?: JewishHoliday[];
}) {
  const timezone = params.timezone || "Europe/Paris";
  const now = params.now ?? new Date();
  const localCalendarDate = getLocalDateForTimezone(now, timezone);
  const hebrewDate = new HDate(localCalendarDate);
  const upcomingHolidays = (params.upcomingHolidays ?? []).slice(0, 8);
  const localDate = formatInTimezone(now, timezone, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const localTime = formatInTimezone(now, timezone, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const isoDate = formatInTimezone(now, timezone, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const shortDate = formatInTimezone(now, timezone, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return `CONTEXTE TEMPOREL ACTUEL :
- Date et heure de référence obligatoires : ${localDate} à ${localTime}
- Date courte : ${shortDate}
- Date ISO serveur : ${now.toISOString()}
- Date locale (${timezone}) : ${isoDate}
- Fuseau horaire de la communauté : ${timezone}
${params.city ? `- Ville de référence : ${params.city}` : ""}

CALENDRIER HÉBRAÏQUE :
- Date hébraïque du jour : ${hebrewDate.render("fr")}
- Date hébraïque en hébreu : ${hebrewDate.renderGematriya()}
${params.shabbatTimes ? `- Prochain Chabbat connu : ${params.shabbatTimes.date}${params.shabbatTimes.hebrewDate ? `, ${params.shabbatTimes.hebrewDate}` : ""}${params.shabbatTimes.parasha ? `, ${params.shabbatTimes.parasha}` : ""}
- Allumage des bougies : ${params.shabbatTimes.entry || "Non précisé"}
- Havdala : ${params.shabbatTimes.exit || "Non précisée"}` : "- Prochain Chabbat : non chargé dans ce contexte"}
${params.nextHoliday ? `- Prochaine fête juive connue : ${params.nextHoliday.name}, ${params.nextHoliday.date}${params.nextHoliday.hebrewDate ? `, ${params.nextHoliday.hebrewDate}` : ""}` : "- Prochaine fête juive : non chargée dans ce contexte"}
${upcomingHolidays.length > 0 ? `- Fêtes juives à venir connues :
${upcomingHolidays.map((holiday) => `  - ${formatHoliday(holiday)}`).join("\n")}` : "- Fêtes juives à venir : non chargées dans ce contexte"}

RÈGLES TEMPORELLES STRICTES :
1. Avant toute réponse, interprète "aujourd'hui", "demain", "hier", "cette semaine", "vendredi", "prochain Chabbat", "J-1", "J-5" et "jour J" à partir de cette date et de ce fuseau.
2. Ne suppose jamais une autre date que celle indiquée ci-dessus.
3. Pour les horaires de Chabbat, fêtes, rappels et automatisations, utilise le prochain événement pertinent à partir de cette date.
4. Utilise la date hébraïque et les fêtes à venir pour adapter les contenus communautaires quand c'est pertinent.
5. Si une date fournie par l'utilisateur contredit ce contexte, clarifie avec des dates absolues.`;
}
