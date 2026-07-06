import { addDays, differenceInCalendarDays, startOfDay, subDays } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

export const JEWISH_HOLIDAYS_AUTOMATION_NAME = "Fetes juives et Hassidiques";
export const DEFAULT_HOLIDAY_NOTIFICATION_DAYS = 20;
export const DEFAULT_HOLIDAY_NOTIFICATION_TIME = "10:00";

export type HolidayCategory = "JEWISH_HOLIDAY" | "HASSIDIC_DATE";

export type HolidayCalendarRow = {
  id: string;
  entry_type: string;
  gregorian_date: string;
  hebrew_date: string | null;
  holiday_name: string | null;
  holiday_name_hebrew: string | null;
  country: string | null;
  city: string | null;
  calendar_year: number;
  source_provider: string | null;
  source_url: string | null;
  created_at: string;
};

export type HolidayItem = {
  id: string;
  officialName: string;
  nameHebrew: string | null;
  category: HolidayCategory;
  categoryLabel: string;
  country: string | null;
  startDate: string;
  endDate: string;
  firstEveningDate: string;
  dateLabel: string;
  hebrewDate: string | null;
  sourceProvider: string | null;
  sourceUrl: string | null;
  lastSyncedAt: string;
  rowIds: string[];
};

export type HolidayTemplateLike = {
  name: string;
  description: string | null;
  subCategory: string | null;
  tags: string[];
};

export const HOLIDAY_TEMPLATE_RELATIONS: Record<string, { subCategories: string[]; tags: string[] }> = {
  chavouot: { subCategories: ["chavouot"], tags: ["chavouot", "shavuot"] },
  hanoucca: { subCategories: ["hanoucca"], tags: ["hanoucca", "hanouka", "chanukah"] },
  pessah: { subCategories: ["pessah"], tags: ["pessah", "pesach", "pessa'h"] },
  pourim: { subCategories: ["pourim"], tags: ["pourim"] },
  tichri: { subCategories: ["tichri"], tags: ["roch hachana", "yom kippour", "soukkot", "simhat torah", "chemini atzeret"] },
  "19_kislev": { subCategories: ["19_kislev"], tags: ["19 kislev", "youd teth kislev", "roch hachana de la hassidout"] },
  "10_chevat": { subCategories: ["10_chevat"], tags: ["10 chevat", "youd chevat"] },
  "11_nissan": { subCategories: ["11_nissan"], tags: ["11 nissan", "youd alef nissan"] },
  "3_tamouz": { subCategories: ["3_tamouz"], tags: ["3 tamouz", "guimel tamouz"] },
  elloul: { subCategories: ["elloul"], tags: ["hai eloul", "eloul"] },
  "jeunes_et_fetes_diverses": { subCategories: ["jeunes_et_fetes_diverses"], tags: ["tisha beav", "tichah beav", "ticha beav", "9 av", "tzom tammouz"] },
};

export function normalizeHolidayText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .replace(/[^a-z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function getHolidayRelationKey(name: string | null | undefined) {
  const normalized = normalizeHolidayText(name);
  if (/\b(chavouot|shavuot)\b/.test(normalized)) return "chavouot";
  if (/\b(hanoucca|hanouka|chanukah)\b/.test(normalized)) return "hanoucca";
  if (/\b(pessah|pesach|pessa h)\b/.test(normalized)) return "pessah";
  if (/\bpourim\b/.test(normalized)) return "pourim";
  if (/\b(roch hachanah|roch hachana|yom kippour|soukkot|chemini atzeret|simhat torah|tichri)\b/.test(normalized)) return "tichri";
  if (/\b(19 kislev|youd teth kislev)\b/.test(normalized)) return "19_kislev";
  if (/\b(10 chevat|youd chevat)\b/.test(normalized)) return "10_chevat";
  if (/\b(11 nissan|youd alef nissan)\b/.test(normalized)) return "11_nissan";
  if (/\b(3 tamouz|guimel tamouz)\b/.test(normalized)) return "3_tamouz";
  if (/\b(hai eloul|eloul)\b/.test(normalized)) return "elloul";
  if (/\b(tisha beav|tichah beav|ticha beav|tich ah beav|9 av|tzom tammouz|tammouz)\b/.test(normalized)) return "jeunes_et_fetes_diverses";
  return normalized.replace(/\s+/g, "_") || "holiday";
}

export function getHolidayCategory(row: Pick<HolidayCalendarRow, "entry_type" | "holiday_name">): HolidayCategory {
  if (row.entry_type === "HASSIDIC_DATE") return "HASSIDIC_DATE";
  return "JEWISH_HOLIDAY";
}

export function getHolidayCategoryLabel(category: HolidayCategory) {
  return category === "HASSIDIC_DATE" ? "Date hassidique" : "Fete juive";
}

function groupingName(value: string) {
  return normalizeHolidayText(value)
    .replace(/\berev\b/g, "")
    .replace(/\b(ii|iii|iv|v|vi|vii|viii|ix|x)\b/g, "")
    .replace(/\b[0-9]{1,4}\b/g, "")
    .replace(/\b(h m|bougie|candle|candles)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildHolidayItems(rows: HolidayCalendarRow[], now = new Date()): HolidayItem[] {
  const today = startOfDay(now);
  const sorted = rows
    .filter((row) => row.holiday_name && new Date(`${row.gregorian_date}T00:00:00`) >= today)
    .sort((a, b) => a.gregorian_date.localeCompare(b.gregorian_date));

  const items: HolidayItem[] = [];
  let current: HolidayCalendarRow[] = [];
  let currentKey = "";

  for (const row of sorted) {
    const rowKey = groupingName(row.holiday_name ?? "");
    const previous = current[current.length - 1];
    const consecutive = previous
      ? differenceInCalendarDays(new Date(`${row.gregorian_date}T00:00:00`), new Date(`${previous.gregorian_date}T00:00:00`)) <= 1
      : true;

    if (current.length > 0 && (rowKey !== currentKey || !consecutive)) {
      items.push(rowsToHolidayItem(current));
      current = [];
    }

    current.push(row);
    currentKey = rowKey;
  }

  if (current.length > 0) items.push(rowsToHolidayItem(current));
  return items;
}

function rowsToHolidayItem(rows: HolidayCalendarRow[]): HolidayItem {
  const first = rows[0];
  const last = rows[rows.length - 1];
  const category = getHolidayCategory(first);
  const startDate = first.gregorian_date;
  const endDate = last.gregorian_date;

  return {
    id: first.id,
    officialName: first.holiday_name ?? "Fete juive",
    nameHebrew: first.holiday_name_hebrew,
    category,
    categoryLabel: getHolidayCategoryLabel(category),
    country: first.country,
    startDate,
    endDate,
    firstEveningDate: startDate,
    dateLabel: startDate === endDate ? formatDate(startDate) : `${formatDate(startDate)} - ${formatDate(endDate)}`,
    hebrewDate: first.hebrew_date,
    sourceProvider: first.source_provider,
    sourceUrl: first.source_url,
    lastSyncedAt: rows.reduce((latest, row) => row.created_at > latest ? row.created_at : latest, first.created_at),
    rowIds: rows.map((row) => row.id),
  };
}

export function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function getDaysUntil(date: string, from = new Date()) {
  return Math.max(0, differenceInCalendarDays(new Date(`${date}T00:00:00`), startOfDay(from)));
}

export function getNotificationDate(firstEveningDate: string, daysBefore = DEFAULT_HOLIDAY_NOTIFICATION_DAYS) {
  return subDays(new Date(`${firstEveningDate}T12:00:00`), Math.max(0, daysBefore)).toISOString().slice(0, 10);
}

export function getNotificationDateTime({
  firstEveningDate,
  daysBefore = DEFAULT_HOLIDAY_NOTIFICATION_DAYS,
  timezone = "Europe/Paris",
  time = DEFAULT_HOLIDAY_NOTIFICATION_TIME,
}: {
  firstEveningDate: string;
  daysBefore?: number;
  timezone?: string | null;
  time?: string;
}) {
  const [hoursRaw, minutesRaw] = time.split(":").map(Number);
  const hours = Number.isFinite(hoursRaw) ? hoursRaw : 10;
  const minutes = Number.isFinite(minutesRaw) ? minutesRaw : 0;
  const date = subDays(new Date(`${firstEveningDate}T12:00:00`), Math.max(0, daysBefore));
  const zoned = toZonedTime(date, timezone || "Europe/Paris");
  zoned.setHours(hours, minutes, 0, 0);
  return fromZonedTime(zoned, timezone || "Europe/Paris");
}

export function templateMatchesHoliday<T extends HolidayTemplateLike>(template: T, holiday: HolidayItem) {
  const relation = HOLIDAY_TEMPLATE_RELATIONS[getHolidayRelationKey(holiday.officialName)];
  if (!relation) return false;

  const subCategory = normalizeHolidayText(template.subCategory);
  if (relation.subCategories.some((item) => normalizeHolidayText(item) === subCategory)) return true;

  const haystack = normalizeHolidayText([template.name, template.description ?? "", ...(template.tags ?? [])].join(" "));
  return relation.tags.some((tag) => haystack.includes(normalizeHolidayText(tag)));
}

export function getNextAnnualHoliday(items: HolidayItem[], now = new Date()) {
  const today = startOfDay(now);
  return items.find((item) => new Date(`${item.startDate}T00:00:00`) >= today) ?? null;
}

export function addOneYear(date: string) {
  const next = addDays(new Date(`${date}T12:00:00`), 365);
  return next.toISOString().slice(0, 10);
}
