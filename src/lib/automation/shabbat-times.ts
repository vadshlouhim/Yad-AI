import { fromZonedTime, toZonedTime } from "date-fns-tz";

export type ShabbatTemplateMode = "simple" | "detailed";

export type ShabbatScheduleItem = {
  gregorian_date: string;
  hebrew_date?: string | null;
  parasha?: string | null;
  shabbat_entry_time?: string | null;
  shabbat_exit_time?: string | null;
};

export type ShabbatCardItem = {
  cityName: string | null;
  date: string;
  entry: string | null;
  exit: string | null;
  hebrewDate: string | null;
  parasha: string | null;
};

type TemplateLike = {
  name: string;
  description: string | null;
  subCategory: string | null;
  tags: string[];
};

type AdminClient = ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>;

type ScheduleRow = { city_code: string; city_name: string; shabbat_schedule: unknown };

const FRIDAY = 5;

export const SHABBAT_AUTOMATION_NAME = "Horaires de Chabbat";

export const SHABBAT_TEMPLATE_SOURCE_CONFIG: Record<
  ShabbatTemplateMode,
  {
    visibleLabel: string;
    technicalCategoryNames: string[];
  }
> = {
  simple: {
    visibleLabel: "Horaires simples",
    technicalCategoryNames: [
      "Horaires Chabbat simple",
      "Horaires de Chabbat simple",
      "Horaires Chabbat simples",
      "Horaires de Chabbat simples",
      "horaires_chabbat_simple",
      "horaires_de_chabbat_simple",
      "heures_de_chabbat",
    ],
  },
  detailed: {
    visibleLabel: "Avec les offices",
    technicalCategoryNames: [
      "Horaires Chabbat détaillés",
      "Horaires de Chabbat détaillés",
      "Horaires Chabbat detailles",
      "Horaires de Chabbat detailles",
      "horaires_chabbat_detailles",
      "horaires_de_chabbat_detailles",
      "horaires_chabbat_offices",
      "offices_chabbat",
    ],
  },
};

export function normalizeShabbatText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function templateMatchesShabbatMode(template: TemplateLike, mode: ShabbatTemplateMode) {
  const haystack = normalizeShabbatText([
    template.name,
    template.description ?? "",
    template.subCategory ?? "",
    ...(template.tags ?? []),
  ].join(" "));

  return SHABBAT_TEMPLATE_SOURCE_CONFIG[mode].technicalCategoryNames.some((name) =>
    haystack.includes(normalizeShabbatText(name))
  );
}

export function filterShabbatTemplatesByMode<T extends TemplateLike>(templates: T[], mode: ShabbatTemplateMode) {
  return templates.filter((template) => templateMatchesShabbatMode(template, mode));
}

export function normalizeCityName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getNextShabbatFromSchedule(schedule: ShabbatScheduleItem[], now: Date) {
  const today = startOfDay(now);
  return schedule.find((entry) => new Date(`${entry.gregorian_date}T00:00:00`) >= today) ?? null;
}

export async function findCityScheduleForYear(
  admin: AdminClient,
  city: string | null | undefined,
  year: number
) {
  const table = admin.from("FranceCityShabbatSchedule");

  if (city) {
    const exactMatch = (await ((table
      .select("city_code, city_name, shabbat_schedule")
      .eq("year", year)
      .eq("city_name", city)
      .maybeSingle()) as unknown as Promise<{ data: ScheduleRow | null }>)).data;

    if (exactMatch) {
      return exactMatch;
    }

    const primaryToken =
      city
        .split(/[\s,'-]+/)
        .find((token) => token.trim().length >= 3)
        ?.trim() ?? city;

    const closeMatches = (await ((table
      .select("city_code, city_name, shabbat_schedule")
      .eq("year", year)
      .ilike("city_name", `%${primaryToken}%`)
      .limit(50)) as unknown as Promise<{ data: ScheduleRow[] | null }>)).data;

    if (closeMatches?.length) {
      const normalizedCity = normalizeCityName(city);
      return (
        closeMatches.find((row) => normalizeCityName(row.city_name) === normalizedCity) ??
        closeMatches.find((row) => normalizeCityName(row.city_name).includes(normalizedCity)) ??
        closeMatches.find((row) => normalizedCity.includes(normalizeCityName(row.city_name))) ??
        closeMatches[0]
      );
    }
  }

  return (await ((table
    .select("city_code, city_name, shabbat_schedule")
    .eq("year", year)
    .eq("city_code", "75056")
    .maybeSingle()) as unknown as Promise<{ data: ScheduleRow | null }>)).data;
}

export function getNextWeeklyRunAt({
  dayOfWeek = FRIDAY,
  time = "10:00",
  timezone = "Europe/Paris",
  from = new Date(),
}: {
  dayOfWeek?: number;
  time?: string;
  timezone?: string | null;
  from?: Date;
}) {
  const [hoursValue, minutesValue] = time.split(":").map((part) => Number(part));
  const hours = Number.isFinite(hoursValue) ? Math.min(Math.max(hoursValue, 0), 23) : 10;
  const minutes = Number.isFinite(minutesValue) ? Math.min(Math.max(minutesValue, 0), 59) : 0;
  const safeTimezone = timezone || "Europe/Paris";
  const zonedNow = toZonedTime(from, safeTimezone);
  const candidate = new Date(zonedNow);

  candidate.setHours(hours, minutes, 0, 0);

  while (candidate.getDay() !== dayOfWeek || candidate <= zonedNow) {
    candidate.setDate(candidate.getDate() + 1);
  }

  return fromZonedTime(candidate, safeTimezone);
}
