import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { EventsClient } from "@/components/events/events-client";
import { getShabbatTimes, getJewishHolidays } from "@/lib/automation/hebcal";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Agenda intelligent — Shalom IA" };

const EVENT_STATUSES = ["DRAFT", "READY", "SCHEDULED", "PUBLISHED", "COMPLETED", "ARCHIVED"];

type ShabbatScheduleItem = {
  gregorian_date: string;
  hebrew_date?: string | null;
  parasha?: string | null;
  shabbat_entry_time?: string | null;
  shabbat_exit_time?: string | null;
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string; q?: string; view?: string; period?: string }>;
}) {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const params = await searchParams;
  const admin = createAdminClient();
  const now = new Date();

  // Requête événements
  let query = admin
    .from("Event")
    .select("id, title, startDate, endDate, location, category, status, isRecurring, coverImageUrl, contentDrafts:ContentDraft(id), publications:Publication(id)")
    .eq("communityId", communityId)
    .order("startDate", { ascending: true })
    .limit(500);

  if (params.status) query = query.eq("status", params.status);
  else query = query.neq("status", "ARCHIVED");
  if (params.category) query = query.eq("category", params.category);
  if (params.q) query = query.ilike("title", `%${params.q}%`);

  // Récupérer communauté + events + Chabbat (BDD ou API)
  const [{ data: community }, { data: events }, statusCounts] = await Promise.all([
    admin.from("Community").select("name, city, timezone").eq("id", communityId).single(),
    query,
    Promise.all(
      EVENT_STATUSES.map(async (status) => {
        const { count } = await admin
          .from("Event")
          .select("*", { count: "exact", head: true })
          .eq("communityId", communityId)
          .eq("status", status);
        return [status, count ?? 0] as [string, number];
      })
    ),
  ]);

  const city = community?.city ?? "Paris";
  const timezone = community?.timezone ?? "Europe/Paris";
  const calendarYears = [now.getFullYear(), now.getFullYear() + 1];

  // Données Chabbat depuis la BDD
  const shabbatRows = await (async () => {
    const rows: ShabbatScheduleItem[] = [];
    for (const year of calendarYears) {
      const primaryToken = city.split(/[\s,'-]+/).find((t) => t.trim().length >= 3)?.trim() ?? city;
      const { data } = await admin
        .from("FranceCityShabbatSchedule")
        .select("shabbat_schedule")
        .eq("year", year)
        .ilike("city_name", `%${primaryToken}%`)
        .limit(1)
        .maybeSingle();
      if (data?.shabbat_schedule && Array.isArray(data.shabbat_schedule)) {
        rows.push(...(data.shabbat_schedule as ShabbatScheduleItem[]));
      }
    }
    return rows;
  })();

  // Prochains Chabbats (8 max)
  let shabbatItems = shabbatRows
    .filter((s) => new Date(`${s.gregorian_date}T00:00:00`) >= startOfDay(now))
    .sort((a, b) => a.gregorian_date.localeCompare(b.gregorian_date))
    .slice(0, 8)
    .map((s) => ({
      date: s.gregorian_date,
      hebrewDate: s.hebrew_date ?? null,
      parasha: s.parasha ?? null,
      entry: s.shabbat_entry_time ?? null,
      exit: s.shabbat_exit_time ?? null,
    }));

  // Fallback API si pas de BDD
  if (!shabbatItems.length) {
    const live = await getShabbatTimes({ city, timezone });
    if (live) {
      shabbatItems = [{
        date: live.date,
        hebrewDate: live.hebrewDate ?? null,
        parasha: live.parasha ?? null,
        entry: live.entry ?? null,
        exit: live.exit ?? null,
      }];
    }
  }

  // Fêtes depuis la BDD
  const { data: holidayRows } = await admin
    .from("HebrewCalendarReference")
    .select("gregorian_date, hebrew_date, holiday_name, holiday_name_hebrew")
    .eq("entry_type", "HOLIDAY")
    .in("calendar_year", calendarYears)
    .gte("gregorian_date", now.toISOString().slice(0, 10))
    .order("gregorian_date", { ascending: true })
    .limit(20);

  let holidayItems = (holidayRows ?? []).map((h) => ({
    date: h.gregorian_date,
    name: h.holiday_name ?? "Fête juive",
    nameHebrew: h.holiday_name_hebrew ?? null,
    hebrewDate: h.hebrew_date ?? null,
  }));

  if (!holidayItems.length) {
    const [curr, next] = await Promise.all([
      getJewishHolidays({ year: now.getFullYear() }),
      getJewishHolidays({ year: now.getFullYear() + 1 }),
    ]);
    holidayItems = [...curr, ...next]
      .filter((h) => new Date(`${h.date}T00:00:00`) >= startOfDay(now))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 20)
      .map((h) => ({
        date: h.date,
        name: h.name,
        nameHebrew: h.nameHebrew ?? null,
        hebrewDate: h.hebrewDate ?? null,
      }));
  }

  const statusCounts2 = Object.fromEntries(statusCounts);
  const normalizedEvents = (events ?? []).map((event) => ({
    id: event.id,
    title: event.title,
    startDate: event.startDate,
    endDate: event.endDate,
    location: event.location,
    category: event.category,
    status: event.status,
    isRecurring: event.isRecurring,
    coverImageUrl: event.coverImageUrl,
    _count: {
      contentDrafts: Array.isArray(event.contentDrafts) ? event.contentDrafts.length : 0,
      publications: Array.isArray(event.publications) ? event.publications.length : 0,
    },
  }));

  return (
    <EventsClient
      events={normalizedEvents}
      statusCounts={statusCounts2}
      shabbatItems={shabbatItems}
      holidayItems={holidayItems}
    />
  );
}
