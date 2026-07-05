"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { HDate } from "@hebcal/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  EVENT_CATEGORY_LABELS,
  EVENT_CATEGORY_COLORS,
  EVENT_STATUS_LABELS,
  cn,
} from "@/lib/utils";
import {
  Search, CalendarDays, MapPin,
  FileText, Send, MoreHorizontal, Trash2, Clock, LayoutList,
  ChevronLeft, ChevronRight, Zap,
} from "lucide-react";

interface Event {
  id: string;
  title: string;
  startDate: Date | string;
  endDate: Date | string | null;
  location: string | null;
  category: string;
  status: string;
  isRecurring: boolean;
  coverImageUrl: string | null;
  _count?: { contentDrafts: number; publications: number };
}

export interface ShabbatItem {
  date: string;
  hebrewDate: string | null;
  parasha: string | null;
  entry: string | null;
  exit: string | null;
}

export interface HolidayItem {
  date: string;
  name: string;
  nameHebrew: string | null;
  hebrewDate: string | null;
}

export interface AutomationItem {
  id: string;
  name: string;
  trigger: string;
  nextRunAt: string | null;
  repeat: string;
  days: string[];
  time: string | null;
  dayOfMonth: number | null;
  endDate: string | null;
  channels: string[];
}

interface AutomationOccurrence {
  id: string;
  name: string;
  time: string;
  channels: string[];
}

interface Props {
  events: Event[];
  statusCounts: Record<string, number>;
  shabbatItems?: ShabbatItem[];
  holidayItems?: HolidayItem[];
  automations?: AutomationItem[];
  isBethHabad?: boolean;
  timezone?: string;
}

type ViewMode = "calendar" | "list";
type CalendarPeriod = "day" | "week" | "month" | "year";

const STATUS_FILTERS = [{ value: "", label: "Tous" }];

const STATUS_BADGE_VARIANT: Record<string, "draft" | "ready" | "scheduled" | "published" | "archived"> = {
  DRAFT: "draft",
  READY: "ready",
  SCHEDULED: "scheduled",
  PUBLISHED: "published",
  COMPLETED: "published",
  ARCHIVED: "archived",
};

const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const MONTH_FORMATTER = new Intl.DateTimeFormat("fr-FR", { month: "short" });
const DAY_SHORT_FORMATTER = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });
const MONTH_LONG_FORMATTER = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
const MONTH_NAME_FORMATTER = new Intl.DateTimeFormat("fr-FR", { month: "long" });

const WEEK_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const PERIODS: Array<{ value: CalendarPeriod; label: string }> = [
  { value: "day", label: "Jour" },
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
  { value: "year", label: "Année" },
];

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function dayKey(value: Date | string) {
  const date = toDate(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function todayKey() {
  return dayKey(new Date());
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function addYears(date: Date, years: number) {
  return new Date(date.getFullYear() + years, 0, 1);
}

function startOfWeek(date: Date) {
  const base = startOfDay(date);
  const day = base.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addDays(base, mondayOffset);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1);
}

function isSamePeriod(date: Date, anchor: Date, period: CalendarPeriod) {
  if (period === "day") return dayKey(date) === dayKey(anchor);
  if (period === "week") {
    const start = startOfWeek(anchor);
    const end = addDays(start, 7);
    return date >= start && date < end;
  }
  if (period === "month") {
    return date.getFullYear() === anchor.getFullYear() && date.getMonth() === anchor.getMonth();
  }
  return date.getFullYear() === anchor.getFullYear();
}

function calendarTitle(anchor: Date, period: CalendarPeriod) {
  if (period === "day") return formatFrenchDate(anchor);
  if (period === "week") {
    const start = startOfWeek(anchor);
    const end = addDays(start, 6);
    return `${start.getDate()} ${MONTH_NAME_FORMATTER.format(start)} - ${end.getDate()} ${MONTH_NAME_FORMATTER.format(end)} ${end.getFullYear()}`;
  }
  if (period === "month") return MONTH_LONG_FORMATTER.format(anchor);
  return String(anchor.getFullYear());
}

function moveAnchor(anchor: Date, period: CalendarPeriod, direction: -1 | 1) {
  if (period === "day") return addDays(anchor, direction);
  if (period === "week") return addDays(anchor, direction * 7);
  if (period === "month") return addMonths(anchor, direction);
  return addYears(anchor, direction);
}

function formatFrenchDate(value: Date | string) {
  return DATE_FORMATTER.format(toDate(value));
}

function formatHebrewDate(value: Date | string) {
  return new HDate(toDate(value)).renderGematriya();
}

function formatDayNumber(value: Date | string) {
  return String(toDate(value).getDate()).padStart(2, "0");
}

function formatMonth(value: Date | string) {
  return MONTH_FORMATTER.format(toDate(value)).replace(".", "");
}

function formatTime(value: Date | string, timezone = "Europe/Paris") {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(toDate(value));
}

function groupEventsByDay(events: Event[]) {
  const groups = new Map<string, Event[]>();
  for (const event of events) {
    const key = dayKey(event.startDate);
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, items]) => ({
      key,
      date: items[0].startDate,
      events: items.sort((left, right) => toDate(left.startDate).getTime() - toDate(right.startDate).getTime()),
    }));
}

function eventsForDate(events: Event[], date: Date) {
  const key = dayKey(date);
  return events
    .filter((event) => dayKey(event.startDate) === key)
    .sort((left, right) => toDate(left.startDate).getTime() - toDate(right.startDate).getTime());
}

function buildMonthDays(anchor: Date) {
  const monthStart = startOfMonth(anchor);
  const gridStart = startOfWeek(monthStart);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

function buildYearMonths(anchor: Date) {
  return Array.from({ length: 12 }, (_, month) => new Date(anchor.getFullYear(), month, 1));
}

const WEEKDAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

// Fenêtre de dates affichée selon la période courante (pour projeter les automatisations).
function visibleRange(anchor: Date, period: CalendarPeriod): [Date, Date] {
  if (period === "day") return [startOfDay(anchor), startOfDay(anchor)];
  if (period === "week") {
    const start = startOfWeek(anchor);
    return [start, addDays(start, 6)];
  }
  if (period === "month") {
    const days = buildMonthDays(anchor);
    return [days[0], days[days.length - 1]];
  }
  return [startOfYear(anchor), new Date(anchor.getFullYear(), 11, 31)];
}

// L'automatisation tombe-t-elle ce jour précis ? (mêmes règles que le moteur d'exécution)
function automationOccursOn(automation: AutomationItem, date: Date) {
  if (!automation.nextRunAt) return false;
  const base = toDate(automation.nextRunAt);
  if (Number.isNaN(base.getTime())) return false;
  const day = startOfDay(date);
  if (day < startOfDay(base)) return false;
  if (automation.endDate) {
    const end = toDate(automation.endDate);
    if (!Number.isNaN(end.getTime()) && day > startOfDay(end)) return false;
  }
  switch (automation.repeat) {
    case "daily":
      return true;
    case "weekly":
    case "custom":
      return automation.days.length > 0
        ? automation.days.includes(WEEKDAY_NAMES[day.getDay()])
        : day.getDay() === base.getDay();
    case "monthly":
      return day.getDate() === (automation.dayOfMonth ?? base.getDate());
    default:
      return dayKey(date) === dayKey(base);
  }
}

function automationTime(automation: AutomationItem, timezone: string) {
  if (automation.time && /^\d{1,2}:\d{2}$/.test(automation.time)) return automation.time;
  if (automation.nextRunAt) return formatTime(automation.nextRunAt, timezone);
  return "";
}

// Construit l'index date → occurrences d'automatisations sur la fenêtre visible.
function buildAutomationIndex(
  automations: AutomationItem[],
  anchor: Date,
  period: CalendarPeriod,
  timezone: string
) {
  const map = new Map<string, AutomationOccurrence[]>();
  if (automations.length === 0) return map;
  const [rangeStart, rangeEnd] = visibleRange(anchor, period);
  for (let cursor = new Date(rangeStart); cursor <= rangeEnd; cursor = addDays(cursor, 1)) {
    const key = dayKey(cursor);
    for (const automation of automations) {
      if (!automationOccursOn(automation, cursor)) continue;
      const occurrence: AutomationOccurrence = {
        id: automation.id,
        name: automation.name,
        time: automationTime(automation, timezone),
        channels: automation.channels,
      };
      map.set(key, [...(map.get(key) ?? []), occurrence]);
    }
  }
  for (const [, items] of map) {
    items.sort((left, right) => left.time.localeCompare(right.time));
  }
  return map;
}

export function EventsClient({
  events,
  statusCounts,
  shabbatItems = [],
  holidayItems = [],
  automations = [],
  isBethHabad = false,
  timezone = "Europe/Paris",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showShabbat, setShowShabbat] = useState(false);
  const [showHolidays, setShowHolidays] = useState(false);
  const [showAutomations, setShowAutomations] = useState(true);
  const hasSupplementaryCalendarData = isBethHabad && (shabbatItems.length > 0 || holidayItems.length > 0);
  const hasAutomations = automations.length > 0;

  // Index par date pour lookup rapide dans le calendrier
  const shabbatByDate = useMemo(() => {
    const map = new Map<string, ShabbatItem>();
    shabbatItems.forEach((s) => map.set(s.date, s));
    return map;
  }, [shabbatItems]);

  const holidayByDate = useMemo(() => {
    const map = new Map<string, HolidayItem[]>();
    holidayItems.forEach((h) => {
      map.set(h.date, [...(map.get(h.date) ?? []), h]);
    });
    return map;
  }, [holidayItems]);

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const activeStatus = searchParams.get("status") ?? "";
  const viewMode: ViewMode = searchParams.get("view") === "calendar" ? "calendar" : "list";
  const activePeriod = PERIODS.some((period) => period.value === searchParams.get("period"))
    ? (searchParams.get("period") as CalendarPeriod)
    : "week";
  const [anchorDate, setAnchorDate] = useState(() => {
    const today = new Date();
    if (activePeriod === "month") return startOfMonth(today);
    if (activePeriod === "year") return startOfYear(today);
    return startOfDay(today);
  });
  const totalAll = Object.entries(statusCounts).reduce(
    (total, [status, count]) => total + (status === "ARCHIVED" ? 0 : count),
    0
  );
  const groupedEvents = useMemo(() => groupEventsByDay(events), [events]);
  const todaysEvents = useMemo(() => eventsForDate(events, new Date()), [events]);
  const periodEvents = useMemo(
    () => events.filter((event) => isSamePeriod(toDate(event.startDate), anchorDate, activePeriod)),
    [events, anchorDate, activePeriod]
  );
  const automationByDate = useMemo(
    () => (showAutomations ? buildAutomationIndex(automations, anchorDate, activePeriod, timezone) : new Map<string, AutomationOccurrence[]>()),
    [automations, anchorDate, activePeriod, timezone, showAutomations]
  );
  const todaysAutomations = useMemo(
    () => (showAutomations ? automations.filter((automation) => automationOccursOn(automation, new Date())) : []),
    [automations, showAutomations]
  );

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  function updatePeriod(period: CalendarPeriod) {
    updateFilter("period", period);
    const today = new Date();
    if (period === "month") setAnchorDate(startOfMonth(today));
    else if (period === "year") setAnchorDate(startOfYear(today));
    else setAnchorDate(startOfDay(today));
  }

  function goToday() {
    const today = new Date();
    if (activePeriod === "month") setAnchorDate(startOfMonth(today));
    else if (activePeriod === "year") setAnchorDate(startOfYear(today));
    else setAnchorDate(startOfDay(today));
  }

  async function deleteEvent(event: Event) {
    const confirmed = window.confirm(`Supprimer "${event.title}" de l'agenda ?`);
    if (!confirmed) return;

    setDeletingId(event.id);
    try {
      const res = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Erreur lors de la suppression");
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Erreur lors de la suppression");
    } finally {
      setDeletingId(null);
    }
  }

  function toggleShabbat() {
    if (viewMode !== "calendar") {
      updateFilter("view", "calendar");
    }
    setShowShabbat((value) => !value);
  }

  function toggleHolidays() {
    if (viewMode !== "calendar") {
      updateFilter("view", "calendar");
    }
    setShowHolidays((value) => !value);
  }

  function toggleAutomations() {
    if (viewMode !== "calendar") {
      updateFilter("view", "calendar");
    }
    setShowAutomations((value) => !value);
  }

  const shouldRenderCalendar =
    viewMode === "calendar" &&
    (events.length > 0 ||
      (hasAutomations && showAutomations) ||
      (hasSupplementaryCalendarData && (showShabbat || showHolidays)));

  return (
    <div className="min-w-0 space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-[#421388]/60 bg-gradient-to-br from-[#421388] via-[#34106f] to-[#1b0738] p-4 text-white shadow-lg shadow-[#421388]/25 sm:p-5">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.13)_0%,transparent_34%,transparent_66%,rgba(196,181,253,0.16)_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/80 to-transparent" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 h-1.5 w-10 rounded-full bg-violet-200" />
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-[1.7rem]">Mon Agenda IA</h1>
            <p className="mt-1 text-sm text-violet-100/85">
              {totalAll} élément{totalAll !== 1 ? "s" : ""} planifié{totalAll !== 1 ? "s" : ""}
              {hasAutomations && (
                <> · {automations.length} automatisation{automations.length !== 1 ? "s" : ""} active{automations.length !== 1 ? "s" : ""}</>
              )}
            </p>
          </div>
          <div className="flex justify-end sm:min-w-28" aria-hidden="true">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-[1.6rem] border border-white/15 bg-white/10 shadow-2xl shadow-[#1b0738]/40 backdrop-blur animate-install-float sm:h-24 sm:w-24">
              <div className="absolute inset-2 rounded-[1.15rem] border border-violet-200/25 bg-[#421388]/45" />
              <div className="absolute -right-1.5 -top-1.5 flex h-8 w-8 items-center justify-center rounded-xl border border-violet-100/50 bg-violet-100 text-[10px] font-black text-[#421388] shadow-lg shadow-[#1b0738]/25 animate-install-pulse">
                IA
              </div>
              <div className="relative text-5xl drop-shadow-[0_12px_20px_rgba(27,7,56,0.45)] sm:text-6xl">
                🗓️
              </div>
              <span className="absolute bottom-4 left-4 size-2 rounded-full bg-violet-200 shadow-[0_0_18px_rgba(221,214,254,0.95)] animate-pulse" />
              <span className="absolute right-7 top-8 size-1.5 rounded-full bg-white/90 shadow-[0_0_14px_rgba(255,255,255,0.8)] animate-ping" />
            </div>
          </div>
        </div>

        {(isBethHabad || hasAutomations) && <div className="relative mt-4 flex flex-wrap gap-3 border-t border-violet-200/25 pt-3">
          <p className="w-full text-xs font-semibold uppercase tracking-wide text-violet-100/80">Afficher dans l&apos;agenda :</p>
          {hasAutomations && (
            <button
              type="button"
              onClick={toggleAutomations}
              className={cn(
                "flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5",
                showAutomations
                  ? "border-violet-200 bg-violet-50 text-[#421388] shadow-sm shadow-[#421388]/20"
                  : "border-white/25 bg-white/10 text-white hover:border-violet-200 hover:bg-white/15 hover:text-violet-100"
              )}
            >
              <span className={cn(
                "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                showAutomations ? "border-[#421388] bg-[#421388]" : "border-white/50"
              )}>
                {showAutomations && <span className="text-white text-[10px] leading-none">✓</span>}
              </span>
              <Zap className="size-3.5" />
              Automatisations
            </button>
          )}
          {isBethHabad && <button
            type="button"
            onClick={toggleShabbat}
            className={cn(
              "flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5",
              showShabbat
                ? "border-amber-400 bg-amber-50 text-amber-700"
                : "border-white/25 bg-white/10 text-white hover:border-amber-300 hover:bg-white/15 hover:text-amber-100"
            )}
          >
            <span className={cn(
              "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
              showShabbat ? "border-amber-500 bg-amber-500" : "border-slate-300"
            )}>
              {showShabbat && <span className="text-white text-[10px] leading-none">✓</span>}
            </span>
            Horaires de Chabbat
          </button>}

          {isBethHabad && <button
            type="button"
            onClick={toggleHolidays}
            className={cn(
              "flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5",
              showHolidays
                ? "border-violet-300 bg-violet-50 text-[#421388]"
                : "border-white/25 bg-white/10 text-white hover:border-violet-200 hover:bg-white/15 hover:text-violet-100"
            )}
          >
            <span className={cn(
              "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
              showHolidays ? "border-[#421388] bg-[#421388]" : "border-slate-300"
            )}>
              {showHolidays && <span className="text-white text-[10px] leading-none">✓</span>}
            </span>
            Fêtes juives
          </button>}
        </div>}
      </div>

      <Card className="rounded-2xl border-[#421388]/15 bg-white shadow-sm shadow-[#421388]/5 transition-shadow duration-300 hover:shadow-md hover:shadow-[#421388]/10 max-md:border-[#421388]/20 max-md:bg-gradient-to-br max-md:from-white max-md:via-violet-50/50 max-md:to-fuchsia-50/40">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {STATUS_FILTERS.map((filter) => {
                const count = filter.value ? (statusCounts[filter.value] ?? 0) : totalAll;
                const isActive = activeStatus === filter.value;
                return (
                  <button
                    key={filter.value}
                    onClick={() => updateFilter("status", filter.value)}
                    className={cn(
                      "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5",
                      isActive
                        ? "bg-[#421388] text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-[#421388]/20 hover:bg-violet-50/50 hover:text-[#421388]"
                    )}
                  >
                    {filter.label}
                    <span className={cn(
                      "rounded-full px-1.5 py-0.5 text-xs",
                      isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row xl:items-center">
              <div className="flex rounded-xl border border-[#421388]/15 bg-violet-50/60 p-1 max-md:border-[#421388]/15 max-md:bg-white/80">
                {[
                  { value: "calendar", label: "Calendrier", icon: CalendarDays },
                  { value: "list", label: "Liste", icon: LayoutList },
                ].map((view) => {
                  const Icon = view.icon;
                  const isActive = viewMode === view.value;
                  return (
                    <button
                      key={view.value}
                      type="button"
                      onClick={() => updateFilter("view", view.value)}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 sm:flex-none",
                        isActive ? "bg-white text-[#421388] shadow-sm" : "text-slate-500 hover:text-[#421388]"
                      )}
                    >
                      <Icon className="size-4" />
                      {view.label}
                    </button>
                  );
                })}
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && updateFilter("q", search)}
                  placeholder="Rechercher dans l&apos;agenda..."
                  className="w-full rounded-xl border border-[#421388]/15 bg-violet-50/50 py-2.5 pl-9 pr-4 text-sm transition-colors focus:border-[#421388] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#421388]/20 max-md:border-[#421388]/15 max-md:bg-white"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {events.length === 0 && !shouldRenderCalendar ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center max-md:border-cyan-200 max-md:bg-gradient-to-br max-md:from-white max-md:via-sky-50/60 max-md:to-emerald-50/60">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 max-md:bg-gradient-to-br max-md:from-[#1E88E5] max-md:to-[#00A7A0] max-md:shadow-[0_10px_24px_rgba(30,136,229,0.22)]">
            <CalendarDays className="size-7 text-slate-400 max-md:text-white" />
          </div>
          <div>
            <p className="font-semibold text-slate-700">Aucune date dans l&apos;agenda</p>
          <p className="mt-1 text-sm text-slate-400">Aucune date n&apos;est prévue pour le moment.</p>
        </div>
      </div>
      ) : (
        shouldRenderCalendar ? (
          <CalendarView
            events={events}
            periodEvents={periodEvents}
            todaysEvents={todaysEvents}
            period={activePeriod}
            anchorDate={anchorDate}
            dayShabbatItem={showShabbat ? shabbatByDate.get(dayKey(anchorDate)) : undefined}
            dayHolidayItems={showHolidays ? holidayByDate.get(dayKey(anchorDate)) : undefined}
            shabbatByDate={showShabbat ? shabbatByDate : undefined}
            holidayByDate={showHolidays ? holidayByDate : undefined}
            automationByDate={automationByDate}
            todaysAutomations={todaysAutomations}
            onPeriodChange={updatePeriod}
            onToday={goToday}
            onPrevious={() => setAnchorDate((date) => moveAnchor(date, activePeriod, -1))}
            onNext={() => setAnchorDate((date) => moveAnchor(date, activePeriod, 1))}
            onDelete={deleteEvent}
            deletingId={deletingId}
            isPending={isPending}
            isBethHabad={isBethHabad}
            timezone={timezone}
          />
        ) : (
          <ListView
            groupedEvents={groupedEvents}
            onDelete={deleteEvent}
            deletingId={deletingId}
            isPending={isPending}
            isBethHabad={isBethHabad}
            timezone={timezone}
          />
        )
      )}
    </div>
  );
}

function CalendarView({
  events,
  periodEvents,
  todaysEvents,
  period,
  anchorDate,
  dayShabbatItem,
  dayHolidayItems,
  shabbatByDate,
  holidayByDate,
  automationByDate,
  todaysAutomations,
  onPeriodChange,
  onToday,
  onPrevious,
  onNext,
  onDelete,
  deletingId,
  isPending,
  isBethHabad,
  timezone,
}: {
  events: Event[];
  periodEvents: Event[];
  todaysEvents: Event[];
  period: CalendarPeriod;
  anchorDate: Date;
  dayShabbatItem?: ShabbatItem;
  dayHolidayItems?: HolidayItem[];
  shabbatByDate?: Map<string, ShabbatItem>;
  holidayByDate?: Map<string, HolidayItem[]>;
  automationByDate: Map<string, AutomationOccurrence[]>;
  todaysAutomations: AutomationItem[];
  onPeriodChange: (period: CalendarPeriod) => void;
  onToday: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onDelete: (event: Event) => void;
  deletingId: string | null;
  isPending: boolean;
  isBethHabad: boolean;
  timezone: string;
}) {
  return (
    <div className="min-w-0 space-y-4">
      <Card className="rounded-2xl border-[#421388]/15 bg-gradient-to-br from-white via-violet-50 to-fuchsia-50 shadow-sm shadow-[#421388]/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-[#421388]/10">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#421388]">Aujourd&apos;hui</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <div className="flex h-14 w-14 flex-col items-center justify-center rounded-2xl bg-[#421388] text-white shadow-sm shadow-[#421388]/20">
                  <span className="text-[11px] font-semibold uppercase">{formatMonth(new Date())}</span>
                  <span className="text-xl font-bold leading-none">{formatDayNumber(new Date())}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold capitalize text-slate-950">{formatFrenchDate(new Date())}</p>
                  {isBethHabad && <p className="mt-1 text-sm font-medium text-[#421388] hebrew">{formatHebrewDate(new Date())}</p>}
                </div>
              </div>
            </div>
            <div className="min-w-0 rounded-2xl border border-white/80 bg-white/80 p-3 shadow-sm lg:w-96">
              <p className="text-xs font-semibold text-slate-500">
                {todaysEvents.length} événement{todaysEvents.length !== 1 ? "s" : ""}
                {todaysAutomations.length > 0 && (
                  <span className="text-cyan-600"> · {todaysAutomations.length} automatisation{todaysAutomations.length !== 1 ? "s" : ""}</span>
                )}
                {" "}aujourd&apos;hui
              </p>
              <div className="mt-2 space-y-1.5">
                {todaysEvents.slice(0, 3).map((event) => (
                  <MiniCalendarEvent key={event.id} event={event} timezone={timezone} />
                ))}
                {todaysAutomations.slice(0, 3).map((automation) => (
                  <Link
                    key={automation.id}
                    href="/dashboard/automations"
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-cyan-700 hover:bg-cyan-50"
                  >
                    <span className="flex w-11 shrink-0 items-center gap-1 font-semibold">
                      <Zap className="size-3" />
                      {automationTime(automation, timezone)}
                    </span>
                    <span className="truncate">{automation.name}</span>
                  </Link>
                ))}
                {todaysEvents.length === 0 && todaysAutomations.length === 0 && (
                  <p className="text-sm text-slate-400">Rien de prévu aujourd&apos;hui.</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon-sm" onClick={onPrevious} aria-label="Période précédente">
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={onToday}>
                Aujourd&apos;hui
              </Button>
              <Button variant="outline" size="icon-sm" onClick={onNext} aria-label="Période suivante">
                <ChevronRight className="size-4" />
              </Button>
              <h2 className="ml-2 text-base font-bold capitalize text-slate-950 sm:text-lg">
                {calendarTitle(anchorDate, period)}
              </h2>
            </div>

            <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              {PERIODS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onPeriodChange(item.value)}
                  className={cn(
                    "flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-all sm:flex-none",
                    period === item.value ? "bg-white text-[#421388] shadow-sm" : "text-slate-500 hover:text-[#421388]"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {period === "day" && (
            <DayCalendar
              events={periodEvents}
              anchorDate={anchorDate}
              shabbatItem={isBethHabad ? dayShabbatItem : undefined}
              holidayItems={isBethHabad ? dayHolidayItems : undefined}
              dayAutomations={automationByDate.get(dayKey(anchorDate))}
              onDelete={onDelete}
              deletingId={deletingId}
              isPending={isPending}
              isBethHabad={isBethHabad}
              timezone={timezone}
            />
          )}
          {period === "week" && (
            <WeekCalendar events={events} anchorDate={anchorDate} shabbatByDate={isBethHabad ? shabbatByDate : undefined} holidayByDate={isBethHabad ? holidayByDate : undefined} automationByDate={automationByDate} isBethHabad={isBethHabad} timezone={timezone} />
          )}
          {period === "month" && (
            <MonthCalendar events={events} anchorDate={anchorDate} shabbatByDate={isBethHabad ? shabbatByDate : undefined} holidayByDate={isBethHabad ? holidayByDate : undefined} automationByDate={automationByDate} isBethHabad={isBethHabad} timezone={timezone} />
          )}
          {period === "year" && (
            <YearCalendar events={events} anchorDate={anchorDate} automationByDate={automationByDate} timezone={timezone} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ListView({
  groupedEvents,
  onDelete,
  deletingId,
  isPending,
  isBethHabad,
  timezone,
}: {
  groupedEvents: ReturnType<typeof groupEventsByDay>;
  onDelete: (event: Event) => void;
  deletingId: string | null;
  isPending: boolean;
  isBethHabad: boolean;
  timezone: string;
}) {
  return (
    <div className="space-y-5">
      {groupedEvents.map((group) => (
        <section key={group.key} className="grid gap-3 lg:grid-cols-[13rem_1fr]">
          <div className="rounded-3xl border border-[#421388]/15 border-l-4 border-l-[#421388] bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-4 shadow-sm shadow-[#421388]/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-[#421388]/10 lg:sticky lg:top-4 lg:self-start">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#421388] text-white shadow-sm shadow-[#421388]/20">
                <span className="text-xs font-semibold uppercase">{formatMonth(group.date)}</span>
                <span className="text-2xl font-bold leading-none">{formatDayNumber(group.date)}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold capitalize text-slate-950">{formatFrenchDate(group.date)}</p>
                {isBethHabad && <p className="mt-1 text-sm font-medium text-[#421388] hebrew">{formatHebrewDate(group.date)}</p>}
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {group.events.length} rendez-vous ce jour
            </p>
          </div>

          <div className="space-y-3">
            {group.events.map((event) => (
              <AgendaEventCard
                key={event.id}
                event={event}
                onDelete={onDelete}
                deleting={deletingId === event.id || isPending}
                isBethHabad={isBethHabad}
                timezone={timezone}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function DayCalendar({
  events,
  anchorDate,
  shabbatItem,
  holidayItems,
  dayAutomations,
  onDelete,
  deletingId,
  isPending,
  isBethHabad,
  timezone,
}: {
  events: Event[];
  anchorDate: Date;
  shabbatItem?: ShabbatItem;
  holidayItems?: HolidayItem[];
  dayAutomations?: AutomationOccurrence[];
  onDelete: (event: Event) => void;
  deletingId: string | null;
  isPending: boolean;
  isBethHabad: boolean;
  timezone: string;
}) {
  const isToday = dayKey(anchorDate) === todayKey();

  return (
    <div className="p-4">
      <div className={cn(
        "mb-4 rounded-2xl border p-4",
        isToday ? "border-[#421388]/20 bg-violet-50" : "border-slate-200 bg-slate-50"
      )}>
        <p className="text-sm font-semibold capitalize text-slate-950">{formatFrenchDate(anchorDate)}</p>
        {isBethHabad && <p className="mt-1 text-sm font-medium text-[#421388] hebrew">{formatHebrewDate(anchorDate)}</p>}
        {(shabbatItem || (holidayItems?.length ?? 0) > 0 || (dayAutomations?.length ?? 0) > 0) && (
          <div className="mt-3 space-y-2">
            {dayAutomations?.map((automation, index) => (
              <Link
                key={`${automation.id}-${index}`}
                href="/dashboard/automations"
                className="flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 transition-colors hover:bg-cyan-100"
              >
                <Zap className="size-4 shrink-0 text-cyan-600" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-cyan-700">{automation.name}</p>
                  <p className="text-xs text-cyan-600">
                    Publication automatique{automation.time ? ` à ${automation.time}` : ""}
                    {automation.channels.length > 0 ? ` · ${automation.channels.join(", ")}` : ""}
                  </p>
                </div>
              </Link>
            ))}
            {shabbatItem && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-sm font-semibold text-amber-700">Horaires de Chabbat</p>
                {shabbatItem.parasha && <p className="text-xs text-amber-600">{shabbatItem.parasha}</p>}
                <p className="text-xs text-amber-600">Entrée {shabbatItem.entry ?? "-"} · Sortie {shabbatItem.exit ?? "-"}</p>
              </div>
            )}
            {holidayItems?.map((holiday) => (
              <div key={`${holiday.date}-${holiday.name}`} className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
                <p className="text-sm font-semibold text-blue-700">{holiday.name}</p>
                {holiday.nameHebrew && <p className="text-xs text-blue-500 hebrew">{holiday.nameHebrew}</p>}
                {holiday.hebrewDate && <p className="text-xs text-blue-600">{holiday.hebrewDate}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
      {events.length > 0 ? (
        <div className="space-y-3">
          {events.map((event) => (
            <AgendaEventCard
              key={event.id}
              event={event}
              onDelete={onDelete}
              deleting={deletingId === event.id || isPending}
              compact
              isBethHabad={isBethHabad}
              timezone={timezone}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
          <p className="text-sm font-semibold text-slate-600">Aucun événement ce jour</p>
          <p className="mt-1 text-xs text-slate-400">Créez une automatisation pour ajouter une date.</p>
        </div>
      )}
    </div>
  );
}

function WeekCalendar({ events, anchorDate, shabbatByDate, holidayByDate, automationByDate, isBethHabad, timezone }: { events: Event[]; anchorDate: Date; shabbatByDate?: Map<string, ShabbatItem>; holidayByDate?: Map<string, HolidayItem[]>; automationByDate: Map<string, AutomationOccurrence[]>; isBethHabad: boolean; timezone: string }) {
  const weekStart = startOfWeek(anchorDate);
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[760px] grid-cols-7 divide-x divide-slate-200">
        {days.map((day) => {
          const key = dayKey(day);
          const dayEvents = eventsForDate(events, day);
          const shabbat = shabbatByDate?.get(key);
          const holidays = holidayByDate?.get(key);
          const dayAutomations = automationByDate.get(key);
          const isToday = key === todayKey();
          return (
            <div key={key} className={cn("min-h-[34rem] bg-white", isToday && "bg-violet-50/60")}>
              <div className={cn(
                "sticky top-0 z-10 border-b border-slate-200 bg-white/95 p-3 backdrop-blur",
                isToday && "bg-violet-50/95"
              )}>
                <p className="text-xs font-semibold uppercase text-slate-500">{DAY_SHORT_FORMATTER.format(day)}</p>
                <p className={cn("mt-1 text-2xl font-bold", isToday ? "text-[#421388]" : "text-slate-950")}>
                  {day.getDate()}
                </p>
                {isBethHabad && <p className="mt-1 truncate text-xs font-medium text-[#421388] hebrew">{formatHebrewDate(day)}</p>}
              </div>
              <div className="space-y-2 p-2">
                {shabbat && (
                  <div className="rounded-md bg-amber-50 border border-amber-200 px-2 py-1">
                    <p className="text-[11px] font-semibold text-amber-700">Chabbat</p>
                    {shabbat.parasha && <p className="text-[10px] text-amber-600">{shabbat.parasha}</p>}
                    <p className="text-[10px] text-amber-600">Entrée {shabbat.entry ?? "-"} · Sortie {shabbat.exit ?? "-"}</p>
                  </div>
                )}
                {holidays?.map((h) => (
                  <div key={h.name} className="rounded-md bg-blue-50 border border-blue-200 px-2 py-1">
                    <p className="text-[11px] font-semibold text-blue-700">{h.name}</p>
                    {h.nameHebrew && <p className="text-[10px] text-blue-500 hebrew">{h.nameHebrew}</p>}
                  </div>
                ))}
                {dayAutomations?.map((automation, index) => (
                  <AutomationPill key={`${automation.id}-${index}`} automation={automation} />
                ))}
                {dayEvents.map((event) => (
                  <CalendarEventPill key={event.id} event={event} timezone={timezone} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthCalendar({ events, anchorDate, shabbatByDate, holidayByDate, automationByDate, isBethHabad, timezone }: { events: Event[]; anchorDate: Date; shabbatByDate?: Map<string, ShabbatItem>; holidayByDate?: Map<string, HolidayItem[]>; automationByDate: Map<string, AutomationOccurrence[]>; isBethHabad: boolean; timezone: string }) {
  const days = buildMonthDays(anchorDate);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {WEEK_DAYS.map((day) => (
            <div key={day} className="px-3 py-2 text-center text-xs font-semibold uppercase text-slate-500">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = dayKey(day);
            const dayEvents = eventsForDate(events, day);
            const shabbat = shabbatByDate?.get(key);
            const holidays = holidayByDate?.get(key);
            const dayAutomations = automationByDate.get(key) ?? [];
            const isToday = key === todayKey();
            const isOutsideMonth = day.getMonth() !== anchorDate.getMonth();
            return (
              <div
                key={key}
                className={cn(
                  "min-h-32 border-b border-r border-slate-200 p-2",
                  isOutsideMonth ? "bg-slate-50/70 text-slate-400" : "bg-white",
                  isToday && "bg-violet-50"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                    isToday ? "bg-[#421388] text-white" : "text-slate-700"
                  )}>
                    {day.getDate()}
                  </span>
                  {isBethHabad && <span className="truncate text-[11px] font-medium text-[#421388] hebrew">{formatHebrewDate(day)}</span>}
                </div>
                <div className="mt-1 space-y-1">
                  {shabbat && (
                    <div className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5">
                      <p className="text-[10px] font-semibold text-amber-700 truncate">{shabbat.entry ?? "Chabbat"}</p>
                    </div>
                  )}
                  {holidays?.map((h) => (
                    <div key={h.name} className="rounded bg-blue-50 border border-blue-200 px-1.5 py-0.5">
                      <p className="text-[10px] font-semibold text-blue-700 truncate">{h.name}</p>
                    </div>
                  ))}
                  {dayAutomations.slice(0, 2).map((automation, index) => (
                    <AutomationPill key={`${automation.id}-${index}`} automation={automation} compact />
                  ))}
                  {dayAutomations.length > 2 && (
                    <p className="text-[10px] font-semibold text-cyan-600">+{dayAutomations.length - 2} automatisation{dayAutomations.length - 2 > 1 ? "s" : ""}</p>
                  )}
                  {dayEvents.slice(0, 3).map((event) => (
                    <CalendarEventPill key={event.id} event={event} compact timezone={timezone} />
                  ))}
                  {dayEvents.length > 3 && (
                    <p className="text-[11px] font-semibold text-slate-500">+{dayEvents.length - 3} autre{dayEvents.length - 3 > 1 ? "s" : ""}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function YearCalendar({ events, anchorDate, automationByDate, timezone }: { events: Event[]; anchorDate: Date; automationByDate: Map<string, AutomationOccurrence[]>; timezone: string }) {
  const automationCountByMonth = useMemo(() => {
    const counts = new Array(12).fill(0);
    for (const [key, items] of automationByDate) {
      const month = Number(key.slice(5, 7)) - 1;
      if (month >= 0 && month < 12) counts[month] += items.length;
    }
    return counts;
  }, [automationByDate]);

  return (
    <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
      {buildYearMonths(anchorDate).map((month) => {
        const monthEvents = events.filter((event) => isSamePeriod(toDate(event.startDate), month, "month"));
        const monthAutomationCount = automationCountByMonth[month.getMonth()];
        const isCurrentMonth = new Date().getFullYear() === month.getFullYear() && new Date().getMonth() === month.getMonth();
        return (
          <div key={month.toISOString()} className={cn(
            "rounded-2xl border p-4",
            isCurrentMonth ? "border-[#421388]/20 bg-violet-50" : "border-slate-200 bg-white"
          )}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold capitalize text-slate-950">{MONTH_NAME_FORMATTER.format(month)}</h3>
              <div className="flex items-center gap-1.5">
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500 shadow-sm">
                  {monthEvents.length}
                </span>
                {monthAutomationCount > 0 && (
                  <span className="flex items-center gap-0.5 rounded-full bg-cyan-50 px-2 py-0.5 text-xs font-semibold text-cyan-700 shadow-sm">
                    <Zap className="size-3" />
                    {monthAutomationCount}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              {monthEvents.slice(0, 4).map((event) => (
                <MiniCalendarEvent key={event.id} event={event} timezone={timezone} />
              ))}
              {monthEvents.length === 0 && monthAutomationCount === 0 && (
                <p className="text-sm text-slate-400">Aucun événement</p>
              )}
              {monthEvents.length === 0 && monthAutomationCount > 0 && (
                <p className="text-sm text-cyan-600">{monthAutomationCount} publication{monthAutomationCount > 1 ? "s" : ""} automatique{monthAutomationCount > 1 ? "s" : ""}</p>
              )}
              {monthEvents.length > 4 && (
                <p className="text-xs font-semibold text-slate-500">+{monthEvents.length - 4} événement{monthEvents.length - 4 > 1 ? "s" : ""}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AutomationPill({ automation, compact = false }: { automation: AutomationOccurrence; compact?: boolean }) {
  return (
    <Link
      href="/dashboard/automations"
      title={`Automatisation : ${automation.name}`}
      className={cn(
        "flex items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-1 text-cyan-700 shadow-sm transition-colors hover:bg-cyan-100",
        compact && "px-1.5 py-0.5"
      )}
    >
      <Zap className={cn("shrink-0", compact ? "size-3" : "size-3.5")} />
      <span className={cn("block truncate font-semibold", compact ? "text-[10px]" : "text-[11px]")}>
        {automation.time ? `${automation.time} · ` : ""}{automation.name}
      </span>
    </Link>
  );
}

function CalendarEventPill({ event, compact = false, timezone }: { event: Event; compact?: boolean; timezone: string }) {
  return (
    <div
      className={cn(
        "block rounded-lg border border-[#421388]/20 bg-[#421388] px-2 py-1.5 text-white shadow-sm shadow-[#421388]/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#35106f]",
        compact && "px-1.5 py-1"
      )}
    >
      <span className="block truncate text-[11px] font-semibold">
        {formatTime(event.startDate, timezone)} · {event.title}
      </span>
      {!compact && event.location && (
        <span className="mt-0.5 block truncate text-[11px] text-violet-100">{event.location}</span>
      )}
    </div>
  );
}

function MiniCalendarEvent({ event, timezone }: { event: Event; timezone: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-600 transition-colors hover:bg-violet-50">
      <span className="w-11 shrink-0 font-semibold text-[#421388]">{formatTime(event.startDate, timezone)}</span>
      <span className="truncate">{event.title}</span>
    </div>
  );
}

function AgendaEventCard({
  event,
  onDelete,
  deleting,
  compact = false,
  isBethHabad = false,
  timezone,
}: {
  event: Event;
  onDelete: (event: Event) => void;
  deleting: boolean;
  compact?: boolean;
  isBethHabad?: boolean;
  timezone: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const draftCount = event._count?.contentDrafts ?? 0;
  const publicationCount = event._count?.publications ?? 0;

  return (
    <Card className="overflow-hidden rounded-2xl border-[#421388]/15 bg-white shadow-sm shadow-[#421388]/5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#421388]/25 hover:shadow-md hover:shadow-[#421388]/10 max-md:border-[#421388]/20 max-md:bg-gradient-to-br max-md:from-white max-md:via-violet-50/55 max-md:to-fuchsia-50/45">
      <CardContent className="p-0">
        <div className="flex">
          <div className="w-1.5 flex-shrink-0 bg-[#421388]" />
          <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 md:flex-row md:items-start">
          <div className={cn(
            "flex w-full shrink-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 md:w-36 md:flex-col md:items-start max-md:border-cyan-100 max-md:bg-white/80",
            compact && "md:w-48 md:flex-row md:items-center"
          )}>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <Clock className="size-4 text-[#421388] max-md:text-[#421388]" />
              {formatTime(event.startDate, timezone)}
            </div>
            {event.endDate && (
              <p className="text-xs text-slate-500">Fin {formatTime(event.endDate, timezone)}</p>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-base font-semibold text-slate-950">
                  {event.title}
                </div>
                {event.isRecurring && (
                  <span className="ml-2 text-xs font-normal text-slate-400">récurrent</span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Badge variant={STATUS_BADGE_VARIANT[event.status] ?? "draft"} className="text-[11px] max-md:ring-1 max-md:ring-white/80">
                  {EVENT_STATUS_LABELS[event.status] ?? event.status}
                </Badge>
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Actions événement"
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                      <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg max-md:border-cyan-100 max-md:bg-white/95">
                        <button
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                          disabled={deleting}
                          onClick={() => {
                            setMenuOpen(false);
                            onDelete(event);
                          }}
                        >
                          <Trash2 className="size-4" /> {deleting ? "Suppression..." : "Supprimer"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 max-md:text-slate-600">
              <span className="flex items-center gap-1">
                <CalendarDays className="size-3" />
                <span className="capitalize">{formatFrenchDate(event.startDate)}</span>
              </span>
              {isBethHabad && <span className="font-medium text-[#421388] hebrew">{formatHebrewDate(event.startDate)}</span>}
              {event.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" />
                  {event.location}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                EVENT_CATEGORY_COLORS[event.category] ?? "border-slate-200 bg-slate-100 text-slate-600"
              )}>
                {EVENT_CATEGORY_LABELS[event.category] ?? event.category}
              </span>

              {draftCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-slate-500 max-md:text-[#421388]">
                  <FileText className="size-3" />
                  {draftCount} contenu{draftCount > 1 ? "s" : ""}
                </span>
              )}
              {publicationCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-slate-500 max-md:text-[#421388]">
                  <Send className="size-3" />
                  {publicationCount} publication{publicationCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
