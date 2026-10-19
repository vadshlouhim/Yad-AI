import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getHolidayTimes, getJewishHolidays, getUpcomingShabbatTimes } from "@/lib/automation/hebcal";
import { getLocale, getTranslations } from "next-intl/server";
import type { OutputLocale } from "@/lib/ai/output-locale";
import { localizedHebrewDateForDate } from "@/lib/religious/locale";

export async function generateMetadata() {
  const t = await getTranslations("hebrewCalendar");
  return { title: `${t("title")} — EasyCom IA` };
}

function isErevHoliday(name: string, hebrewName: string | null) {
  const normalized = `${name} ${hebrewName ?? ""}`.toLowerCase();
  return normalized.includes("erev") || normalized.includes("ערב");
}

export default async function HebrewCalendarPage() {
  const locale = (await getLocale()) as OutputLocale;
  const t = await getTranslations("hebrewCalendar");
  const { profile } = await requireAuth();
  const admin = createAdminClient();
  const now = new Date();
  const { data: community } = await admin.from("Community").select("name, city, country, timezone").eq("id", profile.communityId!).single();
  const city = community?.city ?? "Paris";
  const timezone = community?.timezone ?? "Europe/Paris";
  const years = [now.getFullYear(), now.getFullYear() + 1];
  const [{ data: rows }, shabbats] = await Promise.all([
    admin.from("HebrewCalendarReference").select("gregorian_date, hebrew_date, holiday_name, holiday_name_hebrew").eq("entry_type", "HOLIDAY").in("calendar_year", years).gte("gregorian_date", now.toISOString().slice(0, 10)).order("gregorian_date", { ascending: true }).limit(12),
    getUpcomingShabbatTimes({ city, country: community?.country ?? undefined, timezone, count: 8, outputLocale: locale }),
  ]);
  let holidays = (rows ?? []).map((row) => ({ date: row.gregorian_date, hebrewDate: localizedHebrewDateForDate(row.gregorian_date, locale, row.hebrew_date ?? ""), name: locale === "he" ? row.holiday_name_hebrew || row.holiday_name || t("holiday") : row.holiday_name || t("holiday"), nameHebrew: row.holiday_name_hebrew, isErev: isErevHoliday(row.holiday_name ?? "", row.holiday_name_hebrew) }));
  if (!holidays.length) {
    const fromApi = (await Promise.all(years.map((year) => getJewishHolidays({ year, outputLocale: locale })))).flat();
    holidays = fromApi.filter((holiday) => new Date(`${holiday.date}T12:00:00`) >= now).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 12).map((holiday) => ({ date: holiday.date, hebrewDate: holiday.hebrewDate, name: holiday.name, nameHebrew: holiday.nameHebrew, isErev: isErevHoliday(holiday.name, holiday.nameHebrew) }));
  }
  const holidayCards = await Promise.all(holidays.map(async (holiday) => ({ ...holiday, times: await getHolidayTimes({ city, country: community?.country ?? undefined, timezone, date: holiday.date, outputLocale: locale }) })));
  const date = (value: string) => new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
  const field = (value: string | null | undefined) => value?.trim() || "—";
  const next = shabbats[0];
  return (
    <div dir={locale === "he" ? "rtl" : "ltr"} className="container mx-auto max-w-6xl space-y-8 px-4 py-6 text-start sm:px-6 lg:px-0">
      <div className="overflow-hidden rounded-3xl border border-violet-300/70 bg-gradient-to-br from-violet-950 via-violet-900 to-indigo-900 p-6 text-white shadow-[0_24px_56px_rgba(76,29,149,0.28)]"><div className="mb-4 h-1.5 w-10 rounded-full bg-violet-300" /><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-100/80">{t("eyebrow")}</p><h1 className="mt-2 text-3xl font-bold tracking-tight">{t("title")}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-violet-100/90">{t("description", { community: community?.name ?? t("yourCommunity") })}</p></div>
      {next && <Card className="overflow-hidden rounded-3xl border-violet-200 bg-white shadow-[0_18px_42px_rgba(124,58,237,0.12)]"><CardHeader className="border-b border-violet-100 bg-gradient-to-r from-violet-50 via-white to-fuchsia-50"><div className="h-1.5 w-10 rounded-full bg-violet-500" /><CardTitle className="mt-3 text-2xl">{t("nextShabbat")}</CardTitle></CardHeader><CardContent className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-5">{[[t("date"), date(next.date)], [t("hebrewDate"), field(next.hebrewDate)], [t("parasha"), field(next.parasha)], [t("candleLighting"), field(next.entry)], [t("havdalah"), field(next.exit)]].map(([label, value], index) => <div key={label} className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-violet-500">{label}</p><p dir={index > 2 ? "ltr" : locale === "he" ? "rtl" : "ltr"} className="mt-1 text-sm font-bold text-slate-950">{value}</p></div>)}</CardContent></Card>}
      <section className="space-y-4"><div><div className="mb-3 h-1.5 w-10 rounded-full bg-violet-500" /><h2 className="text-2xl font-bold text-slate-950">{t("shabbatTimes")}</h2><p className="mt-1 text-sm text-slate-500">{t("shabbatDescription", { city })}</p></div><details className="group overflow-hidden rounded-3xl border border-violet-200 bg-white shadow-sm"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 bg-gradient-to-r from-violet-50 via-white to-fuchsia-50 px-6 py-5"><div><p className="font-bold text-slate-950">{t("showUpcoming")}</p><p className="mt-1 text-sm text-slate-500">{t("availableDates", { count: shabbats.length })}</p></div><span className="rounded-full border border-violet-200 bg-white px-3 py-1 text-violet-700 transition group-open:rotate-180">⌄</span></summary><div className="grid gap-4 border-t border-violet-100 p-6 md:grid-cols-2 xl:grid-cols-4">{shabbats.map((item) => <Card key={item.date} className="rounded-2xl border-violet-100"><CardContent className="space-y-3 p-5"><p className="font-bold text-slate-950">{date(item.date)}</p><p className="font-semibold text-violet-700">{item.parasha}</p><p>{t("hebrewDate")}: <bdi dir={locale === "he" ? "rtl" : "ltr"}>{item.hebrewDate}</bdi></p><p>{t("candleLighting")}: <b dir="ltr">{field(item.entry)}</b></p><p>{t("havdalah")}: <b dir="ltr">{field(item.exit)}</b></p></CardContent></Card>)}</div></details></section>
      <section className="space-y-4"><div><div className="mb-3 h-1.5 w-10 rounded-full bg-violet-500" /><h2 className="text-2xl font-bold text-slate-950">{t("upcomingHolidays")}</h2><p className="mt-1 text-sm text-slate-500">{t("holidayDescription")}</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{holidayCards.map((holiday) => <Card key={`${holiday.date}-${holiday.name}`} className="rounded-2xl border-violet-100"><CardContent className="space-y-4 p-5"><div><p className="text-lg font-bold text-slate-950">{holiday.name}</p>{locale === "fr" && holiday.nameHebrew && <p className="mt-1 font-semibold text-violet-700">{holiday.nameHebrew}</p>}</div><div className="space-y-2 rounded-2xl border border-violet-100 bg-violet-50/60 p-4 text-sm"><p>{t("date")}: {date(holiday.date)}</p>{holiday.hebrewDate && <p>{t("hebrewDate")}: <bdi dir={locale === "he" ? "rtl" : "ltr"}>{holiday.hebrewDate}</bdi></p>}<p>{holiday.isErev ? t("holidayEve") : t("holidayExit")}: <b dir="ltr">{field(holiday.isErev ? holiday.times?.entry : holiday.times?.exit)}</b></p></div></CardContent></Card>)}</div></section>
    </div>
  );
}
