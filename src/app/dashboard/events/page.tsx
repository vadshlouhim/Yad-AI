import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { EventsClient } from "@/components/events/events-client";
import { getJewishHolidays, getUpcomingShabbatTimes } from "@/lib/automation/hebcal";
import { getAutomationConfigurationHref, getDedicatedAutomationConfigurationHref } from "@/lib/automation/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mon Agenda - EasyCom IA" };

const EVENT_STATUSES = ["DRAFT", "READY", "SCHEDULED", "PUBLISHED", "COMPLETED", "ARCHIVED"];

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

type AutomationActionRow = { type?: string; contentType?: string; channels?: string[] };

// Normalise une automatisation BDD en élément projetable dans le calendrier de l'agenda.
function normalizeAutomation(row: {
  id: string;
  name: string;
  trigger: string;
  triggerConfig: Record<string, unknown> | null;
  nextRunAt: string | null;
  actions: unknown;
}) {
  const config = (row.triggerConfig ?? {}) as Record<string, unknown>;
  const repeat = (() => {
    if (row.trigger === "DAILY") return "daily";
    if (row.trigger === "WEEKLY_SHABBAT") return "weekly";
    if (row.trigger === "CUSTOM_SCHEDULE") return String(config.repeat ?? "none");
    return "none";
  })();
  const days = Array.isArray(config.days) && config.days.length
    ? config.days.map((d) => String(d))
    : config.day
      ? [String(config.day)]
      : row.trigger === "WEEKLY_SHABBAT"
        ? ["friday"]
        : [];
  const generateAction = Array.isArray(row.actions)
    ? (row.actions as AutomationActionRow[]).find((a) => a?.type === "GENERATE_CONTENT")
    : undefined;
  return {
    id: row.id,
    name: row.name,
    trigger: row.trigger,
    nextRunAt: row.nextRunAt,
    repeat,
    days,
    time: typeof config.time === "string" ? config.time : null,
    dayOfMonth: typeof config.dayOfMonth === "number" ? config.dayOfMonth : null,
    endDate: typeof config.endDate === "string" ? config.endDate : null,
    channels: Array.isArray(generateAction?.channels) ? generateAction!.channels : [],
    triggerConfig: config,
  };
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string; q?: string; view?: string; period?: string }>;
}) {
  const { profile, supabaseUser } = await requireAuth();
  const communityId = profile.communityId!;
  const params = await searchParams;
  const admin = createAdminClient();
  const now = new Date();

  // Requête événements
  let query = admin
    .from("Event")
    .select("id, title, startDate, endDate, location, category, status, isRecurring, coverImageUrl, contentDrafts:ContentDraft(id), publications:Publication(id), automations:Automation(id, name, trigger, triggerConfig)")
    .eq("communityId", communityId)
    .order("startDate", { ascending: true })
    .limit(500);

  if (params.status) query = query.eq("status", params.status);
  else query = query.neq("status", "ARCHIVED");
  if (params.category) query = query.eq("category", params.category);
  if (params.q) query = query.ilike("title", `%${params.q}%`);

  // Récupérer communauté + events + Chabbat (BDD ou API)
  const [{ data: community }, { data: events }, { data: tasks }, statusCounts] = await Promise.all([
    admin.from("Community").select("name, city, timezone, communityType, religiousStream").eq("id", communityId).single(),
    query,
    admin
      .from("Task")
      .select("id, title, scheduledAt, recurrenceRule")
      .eq("communityId", communityId)
      .eq("userId", supabaseUser.id)
      .order("scheduledAt", { ascending: true })
      .limit(500),
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
  const timezone = community?.timezone && community.timezone !== "UTC" ? community.timezone : "Europe/Paris";
  const isBethHabad = community?.communityType === "SYNAGOGUE" || community?.religiousStream === "BETH_HABAD";

  const shabbatItems = isBethHabad
    ? (await getUpcomingShabbatTimes({ city, timezone, count: 8 })).map((item) => ({
        date: item.date,
        hebrewDate: item.hebrewDate || null,
        parasha: item.parasha || null,
        entry: item.entry || null,
        exit: item.exit || null,
      }))
    : [];

  // Fêtes depuis la BDD
  const { data: holidayRows } = isBethHabad ? await admin
    .from("HebrewCalendarReference")
    .select("gregorian_date, hebrew_date, holiday_name, holiday_name_hebrew")
    .eq("entry_type", "HOLIDAY")
    .in("calendar_year", [now.getFullYear(), now.getFullYear() + 1])
    .gte("gregorian_date", now.toISOString().slice(0, 10))
    .order("gregorian_date", { ascending: true })
    .limit(20) : { data: [] };

  let holidayItems = (holidayRows ?? []).map((h) => ({
    date: h.gregorian_date,
    name: h.holiday_name ?? "Fête juive",
    nameHebrew: h.holiday_name_hebrew ?? null,
    hebrewDate: h.hebrew_date ?? null,
  }));

  if (isBethHabad && !holidayItems.length) {
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

  // Automatisations actives → projetées comme occurrences dans le calendrier
  const { data: automationRows } = await admin
    .from("Automation")
    .select("id, name, trigger, triggerConfig, nextRunAt, actions")
    .eq("communityId", communityId)
    .eq("isActive", true)
    .order("nextRunAt", { ascending: true })
    .limit(200);

  const automationItems = (automationRows ?? [])
    .filter((row) => row.nextRunAt)
    .map((row) =>
      normalizeAutomation({
        id: row.id,
        name: row.name,
        trigger: row.trigger,
        triggerConfig: (row.triggerConfig ?? null) as Record<string, unknown> | null,
        nextRunAt: row.nextRunAt as string | null,
        actions: row.actions,
      })
    );

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
    automationHref: Array.isArray(event.automations) && event.automations[0]
      ? getAutomationConfigurationHref({
          id: event.automations[0].id,
          name: event.automations[0].name,
          trigger: event.automations[0].trigger,
          triggerConfig: event.automations[0].triggerConfig as Record<string, unknown> | null,
        })
      : getDedicatedAutomationConfigurationHref({ name: event.title, trigger: "MANUAL" }),
    _count: {
      contentDrafts: Array.isArray(event.contentDrafts) ? event.contentDrafts.length : 0,
      publications: Array.isArray(event.publications) ? event.publications.length : 0,
    },
  }));

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-0">
      <EventsClient
        events={normalizedEvents}
        tasks={(tasks ?? []).map((task) => ({
          id: task.id,
          title: task.title,
          scheduledAt: task.scheduledAt,
          recurrenceRule: task.recurrenceRule,
        }))}
        statusCounts={statusCounts2}
        shabbatItems={isBethHabad ? shabbatItems : []}
        holidayItems={isBethHabad ? holidayItems : []}
        automations={automationItems}
        isBethHabad={isBethHabad}
        timezone={timezone}
      />
    </div>
  );
}
