import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getHolidayTimes, getJewishHolidays, getShabbatTimes } from "@/lib/automation/hebcal";

export const metadata: Metadata = { title: "Calendrier hébraïque — Yad.ia" };

type AdminClient = ReturnType<typeof createAdminClient>;

type ShabbatScheduleItem = {
  gregorian_date: string;
  hebrew_date?: string | null;
  parasha?: string | null;
  shabbat_entry_time?: string | null;
  shabbat_exit_time?: string | null;
};

type HolidayCardItem = {
  date: string;
  entry: string | null;
  exit: string | null;
  hebrewDate: string | null;
  isErev: boolean;
  name: string;
  nameHebrew: string | null;
};

type ShabbatCardItem = {
  candleLighting: string | null;
  cityName: string | null;
  date: string;
  entry: string | null;
  exit: string | null;
  havdalah: string | null;
  hebrewDate: string | null;
  parasha: string | null;
};

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatField(value: string | null | undefined) {
  return value && value.trim().length > 0 ? value : "—";
}

function normalizeCityName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getNextShabbatFromSchedule(schedule: ShabbatScheduleItem[], now: Date) {
  const today = startOfDay(now);
  return schedule.find((entry) => new Date(`${entry.gregorian_date}T00:00:00`) >= today) ?? null;
}

function isErevHoliday(name: string, hebrewName: string | null) {
  const normalizedName = normalizeCityName(name);
  const normalizedHebrewName = hebrewName ? normalizeCityName(hebrewName) : "";

  return (
    normalizedName.startsWith("erev ") ||
    normalizedName.includes(" erev ") ||
    normalizedHebrewName.startsWith("ערב") ||
    normalizedHebrewName.includes(" ערב")
  );
}

async function findCityScheduleForYear(admin: AdminClient, city: string | null | undefined, year: number) {
  if (city) {
    const exactMatch = await admin
      .from("FranceCityShabbatSchedule")
      .select("city_code, city_name, shabbat_schedule")
      .eq("year", year)
      .eq("city_name", city)
      .maybeSingle();

    if (exactMatch.data) {
      return exactMatch.data;
    }

    const primaryToken =
      city
        .split(/[\s,'-]+/)
        .find((token) => token.trim().length >= 3)
        ?.trim() ?? city;

    const closeMatches = await admin
      .from("FranceCityShabbatSchedule")
      .select("city_code, city_name, shabbat_schedule")
      .eq("year", year)
      .ilike("city_name", `%${primaryToken}%`)
      .limit(50);

    if (closeMatches.data?.length) {
      const normalizedCity = normalizeCityName(city);
      return (
        closeMatches.data.find((row) => normalizeCityName(row.city_name) === normalizedCity) ??
        closeMatches.data.find((row) => normalizeCityName(row.city_name).includes(normalizedCity)) ??
        closeMatches.data.find((row) => normalizedCity.includes(normalizeCityName(row.city_name))) ??
        closeMatches.data[0]
      );
    }
  }

  const parisFallback = await admin
    .from("FranceCityShabbatSchedule")
    .select("city_code, city_name, shabbat_schedule")
    .eq("year", year)
    .eq("city_code", "75056")
    .maybeSingle();

  return parisFallback.data ?? null;
}

export default async function HebrewCalendarPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const admin = createAdminClient();
  const now = new Date();

  const { data: community } = await admin
    .from("Community")
    .select("name, city, timezone")
    .eq("id", communityId)
    .single();

  const calendarYears = [now.getFullYear(), now.getFullYear() + 1];
  const [currentYearScheduleRow, nextYearScheduleRow, holidayRows] = await Promise.all([
    findCityScheduleForYear(admin, community?.city, calendarYears[0]),
    findCityScheduleForYear(admin, community?.city, calendarYears[1]),
    admin
      .from("HebrewCalendarReference")
      .select("gregorian_date, hebrew_date, holiday_name, holiday_name_hebrew")
      .eq("entry_type", "HOLIDAY")
      .in("calendar_year", calendarYears)
      .gte("gregorian_date", now.toISOString().slice(0, 10))
      .order("gregorian_date", { ascending: true })
      .limit(12),
  ]);

  const currentYearSchedule = Array.isArray(currentYearScheduleRow?.shabbat_schedule)
    ? (currentYearScheduleRow.shabbat_schedule as ShabbatScheduleItem[])
    : [];
  const nextYearSchedule = Array.isArray(nextYearScheduleRow?.shabbat_schedule)
    ? (nextYearScheduleRow.shabbat_schedule as ShabbatScheduleItem[])
    : [];
  const upcomingShabbatSchedule = [...currentYearSchedule, ...nextYearSchedule]
    .filter((entry) => new Date(`${entry.gregorian_date}T00:00:00`) >= startOfDay(now))
    .sort((left, right) => new Date(left.gregorian_date).getTime() - new Date(right.gregorian_date).getTime())
    .slice(0, 8);

  const nextShabbatFromDatabase =
    getNextShabbatFromSchedule(currentYearSchedule, now) ?? getNextShabbatFromSchedule(nextYearSchedule, now);

  let shabbat: ShabbatCardItem | null = nextShabbatFromDatabase
    ? {
        candleLighting: nextShabbatFromDatabase.shabbat_entry_time ?? null,
        cityName: currentYearScheduleRow?.city_name ?? nextYearScheduleRow?.city_name ?? community?.city ?? null,
        date: nextShabbatFromDatabase.gregorian_date,
        entry: nextShabbatFromDatabase.shabbat_entry_time ?? null,
        exit: nextShabbatFromDatabase.shabbat_exit_time ?? null,
        havdalah: nextShabbatFromDatabase.shabbat_exit_time ?? null,
        hebrewDate: nextShabbatFromDatabase.hebrew_date ?? null,
        parasha: nextShabbatFromDatabase.parasha ?? null,
      }
    : null;

  if (!shabbat) {
    const liveShabbat = await getShabbatTimes({
      city: community?.city ?? "Paris",
      timezone: community?.timezone ?? "Europe/Paris",
    });

    shabbat = liveShabbat
      ? {
          candleLighting: liveShabbat.candleLighting ?? liveShabbat.entry ?? null,
          cityName: community?.city ?? "Paris",
          date: liveShabbat.date,
          entry: liveShabbat.entry ?? null,
          exit: liveShabbat.exit ?? null,
          havdalah: liveShabbat.havdalah ?? liveShabbat.exit ?? null,
          hebrewDate: liveShabbat.hebrewDate ?? null,
          parasha: liveShabbat.parasha ?? null,
        }
      : null;
  }

  let upcomingHolidays: HolidayCardItem[] =
    holidayRows.data?.map((holiday) => ({
      date: holiday.gregorian_date,
      entry: null,
      exit: null,
      hebrewDate: holiday.hebrew_date,
      isErev: isErevHoliday(holiday.holiday_name ?? "Fête juive", holiday.holiday_name_hebrew),
      name: holiday.holiday_name ?? "Fête juive",
      nameHebrew: holiday.holiday_name_hebrew,
    })) ?? [];

  if (!upcomingHolidays.length) {
    const [currentYearHolidays, nextYearHolidays] = await Promise.all([
      getJewishHolidays({ year: now.getFullYear() }),
      getJewishHolidays({ year: now.getFullYear() + 1 }),
    ]);

    upcomingHolidays = [...currentYearHolidays, ...nextYearHolidays]
      .filter((holiday) => new Date(`${holiday.date}T00:00:00`) >= startOfDay(now))
      .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
      .slice(0, 12)
      .map((holiday) => ({
        date: holiday.date,
        entry: null,
        exit: null,
        hebrewDate: holiday.hebrewDate,
        isErev: isErevHoliday(holiday.name, holiday.nameHebrew),
        name: holiday.name,
        nameHebrew: holiday.nameHebrew,
      }));
  }

  upcomingHolidays = await Promise.all(
    upcomingHolidays.map(async (holiday) => {
      const times = await getHolidayTimes({
        city: community?.city ?? "Paris",
        timezone: community?.timezone ?? "Europe/Paris",
        date: holiday.date,
      });

      return {
        ...holiday,
        entry: times?.entry ?? holiday.entry,
        exit: holiday.isErev ? null : (times?.exit ?? holiday.exit),
      };
    })
  );

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-amber-50 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
          Ressource communautaire
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Calendrier hébraïque
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Vue rapide du prochain Chabbat et des prochaines fêtes pour {community?.name ?? "ta communauté"}.
        </p>
      </div>

      {shabbat && (
        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Prochain Chabbat</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Date</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(shabbat.date)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Date hébraïque</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{formatField(shabbat.hebrewDate)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Paracha</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{formatField(shabbat.parasha)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Entrée</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{formatField(shabbat.entry || shabbat.candleLighting)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Sortie</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{formatField(shabbat.exit || shabbat.havdalah)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {upcomingShabbatSchedule.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Horaires de Chabbat</h2>
            <p className="mt-1 text-sm text-slate-500">
              Les prochains horaires d&apos;entrée et de sortie pour {shabbat?.cityName ?? community?.city ?? "ta ville"}.
            </p>
          </div>

          <details className="group rounded-3xl border border-slate-200 bg-white shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5">
              <div>
                <p className="text-base font-semibold text-slate-900">Voir les prochains Chabbat</p>
                <p className="mt-1 text-sm text-slate-500">
                  {upcomingShabbatSchedule.length} dates disponibles
                </p>
              </div>
              <span className="text-sm font-medium text-amber-700 transition group-open:rotate-180">
                ˅
              </span>
            </summary>

            <div className="grid gap-4 border-t border-slate-200 p-6 md:grid-cols-2 xl:grid-cols-4">
              {upcomingShabbatSchedule.map((entry) => (
                <Card key={entry.gregorian_date} className="rounded-3xl border-slate-200 shadow-sm">
                  <CardContent className="space-y-4 p-5">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{formatDate(entry.gregorian_date)}</p>
                      {entry.parasha && (
                        <p className="mt-1 text-sm text-slate-500">{entry.parasha}</p>
                      )}
                    </div>

                    <div className="space-y-2 text-sm text-slate-600">
                      {entry.hebrew_date && (
                        <p>
                          <span className="font-medium text-slate-900">Date hébraïque :</span> {entry.hebrew_date}
                        </p>
                      )}
                      <p>
                        <span className="font-medium text-slate-900">Entrée :</span> {formatField(entry.shabbat_entry_time)}
                      </p>
                      <p>
                        <span className="font-medium text-slate-900">Sortie :</span> {formatField(entry.shabbat_exit_time)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </details>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Prochaines fêtes</h2>
          <p className="mt-1 text-sm text-slate-500">
            Les 12 prochaines dates importantes du calendrier hébraïque.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {upcomingHolidays.map((holiday) => (
            <Card key={`${holiday.date}-${holiday.name}`} className="rounded-3xl border-slate-200 shadow-sm">
              <CardContent className="space-y-4 p-5">
                <div>
                  <p className="text-lg font-semibold text-slate-900">{holiday.name}</p>
                  {holiday.nameHebrew && (
                    <p className="mt-1 text-sm text-slate-500">{holiday.nameHebrew}</p>
                  )}
                </div>

                <div className="space-y-2 text-sm text-slate-600">
                  <p>
                    <span className="font-medium text-slate-900">Date :</span> {formatDate(holiday.date)}
                  </p>
                  {holiday.hebrewDate && (
                    <p>
                      <span className="font-medium text-slate-900">Date hébraïque :</span> {holiday.hebrewDate}
                    </p>
                  )}
                  {holiday.isErev ? (
                    <p>
                      <span className="font-medium text-slate-900">Entrée :</span> {formatField(holiday.entry)}
                    </p>
                  ) : (
                    <p>
                      <span className="font-medium text-slate-900">Sortie :</span> {formatField(holiday.exit)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
