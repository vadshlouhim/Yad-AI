import { HDate, HebrewCalendar } from "@hebcal/core";

export type HebrewBirthday = {
  hebrewBirthDay: number;
  hebrewBirthMonth: number;
  hebrewBirthYear: number;
};

const MONTH_LABELS: Record<number, string> = {
  1: "Nissan",
  2: "Iyar",
  3: "Sivan",
  4: "Tamouz",
  5: "Av",
  6: "Eloul",
  7: "Tichri",
  8: "Hechvan",
  9: "Kislev",
  10: "Tévèt",
  11: "Chevat",
  12: "Adar",
  13: "Adar II",
};

export function getHebrewMonthLabel(month: number, year: number) {
  if (month === 12 && HDate.isLeapYear(year)) return "Adar I";
  return MONTH_LABELS[month] ?? "Mois inconnu";
}

export function getHebrewMonthsForYear(year: number) {
  const order = HDate.isLeapYear(year)
    ? [7, 8, 9, 10, 11, 12, 13, 1, 2, 3, 4, 5, 6]
    : [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6];
  return order.map((value) => ({ value, label: getHebrewMonthLabel(value, year) }));
}

export function validateHebrewBirthday(value: Partial<HebrewBirthday>): HebrewBirthday | null {
  const day = Number(value.hebrewBirthDay);
  const month = Number(value.hebrewBirthMonth);
  const year = Number(value.hebrewBirthYear);
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return null;
  if (year < 3761 || year > 9999 || month < 1 || month > HDate.monthsInYear(year)) return null;
  if (day < 1 || day > HDate.daysInMonth(month, year)) return null;
  return { hebrewBirthDay: day, hebrewBirthMonth: month, hebrewBirthYear: year };
}

function gregorianISO(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function hebrewBirthdayToGregorianISO(value: HebrewBirthday) {
  return gregorianISO(new HDate(value.hebrewBirthDay, value.hebrewBirthMonth, value.hebrewBirthYear).greg());
}

export function gregorianToHebrew(value: string | Date, afterSunset = false) {
  const date = typeof value === "string" ? new Date(`${value.slice(0, 10)}T12:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (afterSunset) date.setDate(date.getDate() + 1);
  const hebrew = new HDate(date);
  return {
    day: hebrew.getDate(),
    month: hebrew.getMonth(),
    year: hebrew.getFullYear(),
    label: `${hebrew.getDate()} ${getHebrewMonthLabel(hebrew.getMonth(), hebrew.getFullYear())} ${hebrew.getFullYear()}`,
  };
}

export type HebrewYahrzeit = {
  hebrewDeathDay: number;
  hebrewDeathMonth: number;
  hebrewDeathYear: number;
};

export function validateHebrewYahrzeit(value: Partial<HebrewYahrzeit>): HebrewYahrzeit | null {
  const birthday = validateHebrewBirthday({
    hebrewBirthDay: value.hebrewDeathDay,
    hebrewBirthMonth: value.hebrewDeathMonth,
    hebrewBirthYear: value.hebrewDeathYear,
  });
  return birthday ? {
    hebrewDeathDay: birthday.hebrewBirthDay,
    hebrewDeathMonth: birthday.hebrewBirthMonth,
    hebrewDeathYear: birthday.hebrewBirthYear,
  } : null;
}

export function getYahrzeitOccurrence(value: HebrewYahrzeit, hebrewYear: number) {
  const original = new HDate(value.hebrewDeathDay, value.hebrewDeathMonth, value.hebrewDeathYear);
  const occurrence = hebrewYear === value.hebrewDeathYear ? original : HebrewCalendar.getYahrzeit(hebrewYear, original);
  if (!occurrence) return null;
  return {
    hebrewDate: occurrence,
    gregorianDate: gregorianISO(occurrence.greg()),
    label: `${occurrence.getDate()} ${getHebrewMonthLabel(occurrence.getMonth(), occurrence.getFullYear())} ${occurrence.getFullYear()}`,
  };
}

export function getCurrentHebrewDate(timezone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value);
  return new HDate(new Date(part("year"), part("month") - 1, part("day"), 12));
}

export function getBirthdayOccurrence(value: HebrewBirthday, hebrewYear: number) {
  const original = new HDate(value.hebrewBirthDay, value.hebrewBirthMonth, value.hebrewBirthYear);
  const occurrence = hebrewYear === value.hebrewBirthYear
    ? original
    : HebrewCalendar.getBirthdayOrAnniversary(hebrewYear, original);
  if (!occurrence) return null;
  return {
    hebrewDate: occurrence,
    gregorianDate: gregorianISO(occurrence.greg()),
    label: `${occurrence.getDate()} ${getHebrewMonthLabel(occurrence.getMonth(), occurrence.getFullYear())} ${occurrence.getFullYear()}`,
  };
}

