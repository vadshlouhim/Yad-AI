import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getHolidayTimes, getJewishHolidays, getShabbatTimes } from "@/lib/automation/hebcal";

export const metadata: Metadata = { title: "Calendrier hébraïque — EasyCom IA" };

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
      <div className="overflow-hidden rounded-3xl border border-violet-300/70 bg-gradient-to-br from-violet-950 via-violet-900 to-indigo-900 p-6 text-white shadow-[0_24px_56px_rgba(76,29,149,0.28)]">
        <div className="mb-4 h-1.5 w-10 rounded-full bg-violet-300" />
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-100/80">
          Ressource communautaire
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Calendrier hébraïque
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-violet-100/90">
          Vue rapide du prochain Chabbat et des prochaines fêtes pour {community?.name ?? "ta communauté"}.
        </p>
      </div>

      {shabbat && (
        <Card className="overflow-hidden rounded-3xl border-violet-200 bg-white shadow-[0_18px_42px_rgba(124,58,237,0.12)]">
          <CardHeader className="border-b border-violet-100 bg-gradient-to-r from-violet-50 via-white to-fuchsia-50">
            <div className="h-1.5 w-10 rounded-full bg-violet-500" />
            <CardTitle className="mt-3 text-2xl text-slate-950">Prochain Chabbat</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-500">Date</p>
              <p className="mt-1 text-sm font-bold text-slate-950">{formatDate(shabbat.date)}</p>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-500">Date hebraique</p>
              <p className="mt-1 text-sm font-bold text-slate-950">{formatField(shabbat.hebrewDate)}</p>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-500">Paracha</p>
              <p className="mt-1 text-sm font-bold text-slate-950">{formatField(shabbat.parasha)}</p>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-500">Entree</p>
              <p className="mt-1 text-sm font-bold text-slate-950">{formatField(shabbat.entry || shabbat.candleLighting)}</p>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-500">Sortie</p>
              <p className="mt-1 text-sm font-bold text-slate-950">{formatField(shabbat.exit || shabbat.havdalah)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {upcomingShabbatSchedule.length > 0 && (
        <div className="space-y-4">
          <div>
            <div className="mb-3 h-1.5 w-10 rounded-full bg-violet-500" />
            <h2 className="text-2xl font-bold text-slate-950">Horaires de Chabbat</h2>
            <p className="mt-1 text-sm text-slate-500">
              Les prochains horaires d&apos;entrée et de sortie pour {shabbat?.cityName ?? community?.city ?? "ta ville"}.
            </p>
          </div>

          <details className="group overflow-hidden rounded-3xl border border-violet-200 bg-white shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 bg-gradient-to-r from-violet-50 via-white to-fuchsia-50 px-6 py-5">
              <div>
                <p className="text-base font-bold text-slate-950">Voir les prochains Chabbat</p>
                <p className="mt-1 text-sm text-slate-500">
                  {upcomingShabbatSchedule.length} dates disponibles
                </p>
              </div>
              <span className="rounded-full border border-violet-200 bg-white px-3 py-1 text-sm font-bold text-violet-700 transition group-open:rotate-180">
                ˅
              </span>
            </summary>

            <div className="grid gap-4 border-t border-violet-100 p-6 md:grid-cols-2 xl:grid-cols-4">
              {upcomingShabbatSchedule.map((entry) => (
                <Card key={entry.gregorian_date} className="rounded-2xl border-violet-100 bg-white shadow-sm transition hover:border-violet-300 hover:shadow-md">
                  <CardContent className="space-y-4 p-5">
                    <div>
                      <p className="text-base font-bold text-slate-950">{formatDate(entry.gregorian_date)}</p>
                      {entry.parasha && (
                        <p className="mt-1 text-sm font-semibold text-violet-700">{entry.parasha}</p>
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
          <div className="mb-3 h-1.5 w-10 rounded-full bg-violet-500" />
          <h2 className="text-2xl font-bold text-slate-950">Prochaines fetes</h2>
          <p className="mt-1 text-sm text-slate-500">
            Les 12 prochaines dates importantes du calendrier hebraique.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {upcomingHolidays.map((holiday) => (
            <Card key={`${holiday.date}-${holiday.name}`} className="rounded-2xl border-violet-100 bg-white shadow-sm transition hover:border-violet-300 hover:shadow-md">
              <CardContent className="space-y-4 p-5">
                <div>
                  <p className="text-lg font-bold text-slate-950">{holiday.name}</p>
                  {holiday.nameHebrew && (
                    <p className="mt-1 text-sm font-semibold text-violet-700">{holiday.nameHebrew}</p>
                  )}
                </div>

                <div className="space-y-2 rounded-2xl border border-violet-100 bg-violet-50/60 p-4 text-sm text-slate-600">
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
