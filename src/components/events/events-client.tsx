"use client";

import { FormEvent, type ReactNode, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { HDate } from "@hebcal/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAutomationConfigurationHref } from "@/lib/automation/navigation";
import {
  EVENT_CATEGORY_LABELS,
  EVENT_CATEGORY_COLORS,
  EVENT_STATUS_LABELS,
  cn,
} from "@/lib/utils";
import {
  Search, CalendarDays, MapPin,
  FileText, Send, MoreHorizontal, Trash2, Clock, LayoutList,
  ChevronLeft, ChevronRight, Zap, Plus, X, CheckSquare, Repeat2,
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
  automationHref?: string | null;
}

export interface TaskItem {
  id: string;
  title: string;
  scheduledAt: Date | string;
  recurrenceRule: unknown;
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
  triggerConfig?: Record<string, unknown> | null;
}

interface AutomationOccurrence {
  id: string;
  name: string;
  time: string;
  channels: string[];
  trigger: string;
  triggerConfig?: Record<string, unknown> | null;
}

interface TaskOccurrence {
  id: string;
  taskId: string;
  title: string;
  scheduledAt: Date | string;
  time: string;
}

interface Props {
  events: Event[];
  tasks?: TaskItem[];
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
        trigger: automation.trigger,
        triggerConfig: automation.triggerConfig,
      };
      map.set(key, [...(map.get(key) ?? []), occurrence]);
    }
  }
  for (const [, items] of map) {
    items.sort((left, right) => left.time.localeCompare(right.time));
  }
  return map;
}

function recurrenceRule(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function taskOccursOn(task: TaskItem, date: Date) {
  const base = toDate(task.scheduledAt);
  if (Number.isNaN(base.getTime())) return false;
  const day = startOfDay(date);
  if (day < startOfDay(base)) return false;
  const rule = recurrenceRule(task.recurrenceRule);
  if (!rule) return dayKey(day) === dayKey(base);
  if (typeof rule.until === "string") {
    const until = toDate(rule.until);
    if (!Number.isNaN(until.getTime()) && day > startOfDay(until)) return false;
  }
  if (rule.frequency === "DAILY") return true;
  if (rule.frequency === "WEEKLY") {
    const weekdays = Array.isArray(rule.weekdays) ? rule.weekdays.filter((value): value is number => typeof value === "number") : [];
    return weekdays.length > 0 ? weekdays.includes(day.getDay()) : day.getDay() === base.getDay();
  }
  if (rule.frequency === "MONTHLY") return day.getDate() === base.getDate();
  return dayKey(day) === dayKey(base);
}

function buildTaskIndex(tasks: TaskItem[], rangeStart: Date, rangeEnd: Date, timezone: string) {
  const map = new Map<string, TaskOccurrence[]>();
  for (let cursor = startOfDay(rangeStart); cursor <= rangeEnd; cursor = addDays(cursor, 1)) {
    const key = dayKey(cursor);
    for (const task of tasks) {
      if (!taskOccursOn(task, cursor)) continue;
      const occurrence: TaskOccurrence = {
        id: `${task.id}-${key}`,
        taskId: task.id,
        title: task.title,
        scheduledAt: task.scheduledAt,
        time: formatTime(task.scheduledAt, timezone),
      };
      map.set(key, [...(map.get(key) ?? []), occurrence]);
    }
  }
  for (const [, items] of map) items.sort((left, right) => left.time.localeCompare(right.time));
  return map;
}

export function EventsClient({
  events,
  tasks = [],
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
  const showAutomations = searchParams.get("automations") !== "off";
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
  const isMobileViewport = typeof window !== "undefined" && window.innerWidth < 768;
  const viewModeParam = searchParams.get("view");
  const viewMode: ViewMode =
    viewModeParam === "calendar"
      ? "calendar"
      : viewModeParam === "list"
        ? "list"
        : isMobileViewport
          ? "calendar"
          : "list";
  const activePeriod = PERIODS.some((period) => period.value === searchParams.get("period"))
    ? (searchParams.get("period") as CalendarPeriod)
    : isMobileViewport
      ? "month"
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
  const taskByDate = useMemo(() => {
    const [rangeStart, rangeEnd] = visibleRange(anchorDate, activePeriod);
    return buildTaskIndex(tasks, rangeStart, rangeEnd, timezone);
  }, [tasks, anchorDate, activePeriod, timezone]);
  const listTaskByDate = useMemo(
    () => buildTaskIndex(tasks, startOfDay(new Date()), addDays(new Date(), 365), timezone),
    [tasks, timezone]
  );
  const listAutomationByDate = useMemo(
    () => showAutomations ? buildAutomationIndex(automations, new Date(), "year", timezone) : new Map<string, AutomationOccurrence[]>(),
    [automations, showAutomations, timezone]
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
    updateFilter("automations", showAutomations ? "off" : "");
  }

  const shouldRenderCalendar =
    viewMode === "calendar" &&
    (events.length > 0 ||
      (hasAutomations && showAutomations) ||
      (hasSupplementaryCalendarData && (showShabbat || showHolidays)));

  return (
    <div className="min-w-0 space-y-6">
      <div className="space-y-4 md:hidden">
        <MobileAgendaHero
          isBethHabad={isBethHabad}
          showShabbat={showShabbat}
          showHolidays={showHolidays}
          onToggleShabbat={toggleShabbat}
          onToggleHolidays={toggleHolidays}
        />

        <MobileAgendaControls
          search={search}
          setSearch={setSearch}
          onSearchSubmit={() => updateFilter("q", search)}
          viewMode={viewMode}
          onViewChange={(view) => updateFilter("view", view)}
          period={activePeriod}
          onPeriodChange={updatePeriod}
        />

        {events.length === 0 && !shouldRenderCalendar ? (
          <MobileAgendaEmpty />
        ) : shouldRenderCalendar ? (
          <MobileCalendarView
            events={events}
            period={activePeriod}
            anchorDate={anchorDate}
            shabbatByDate={showShabbat ? shabbatByDate : undefined}
            holidayByDate={showHolidays ? holidayByDate : undefined}
            automationByDate={automationByDate}
            taskByDate={taskByDate}
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
          <MobileListView
            groupedEvents={groupedEvents}
            taskByDate={listTaskByDate}
            automationByDate={listAutomationByDate}
            onDelete={deleteEvent}
            deletingId={deletingId}
            isPending={isPending}
            isBethHabad={isBethHabad}
            timezone={timezone}
          />
        )}
      </div>

      <div className="hidden space-y-6 md:block">
        <div className="relative overflow-hidden rounded-3xl border border-[#421388]/60 bg-gradient-to-br from-[#421388] via-[#34106f] to-[#1b0738] p-4 text-white shadow-lg shadow-[#421388]/25 sm:p-5">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.13)_0%,transparent_34%,transparent_66%,rgba(196,181,253,0.16)_100%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/80 to-transparent" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 h-1.5 w-10 rounded-full bg-violet-200" />
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-[1.7rem]">Mon Agenda</h1>
              <p className="mt-1 text-sm text-violet-100/85">
                Retrouvez au même endroit vos publications programmées, vos automatisations et vos tâches personnelles.
              </p>
              <div className="mt-4">
                <TaskCreateDialog />
              </div>
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

        <Card className="rounded-2xl border-[#421388]/15 bg-white shadow-sm shadow-[#421388]/5 transition-shadow duration-300 hover:shadow-md hover:shadow-[#421388]/10">
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
                <div className="flex rounded-xl border border-[#421388]/15 bg-violet-50/60 p-1">
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
                    className="w-full rounded-xl border border-[#421388]/15 bg-violet-50/50 py-2.5 pl-9 pr-4 text-sm transition-colors focus:border-[#421388] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#421388]/20"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {events.length === 0 && !shouldRenderCalendar ? (
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <CalendarDays className="size-7 text-slate-400" />
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
              taskByDate={taskByDate}
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
              taskByDate={listTaskByDate}
              automationByDate={listAutomationByDate}
              onDelete={deleteEvent}
              deletingId={deletingId}
              isPending={isPending}
              isBethHabad={isBethHabad}
              timezone={timezone}
            />
          )
        )}
      </div>
    </div>
  );
}

function MobileAgendaHero({
  isBethHabad,
  showShabbat,
  showHolidays,
  onToggleShabbat,
  onToggleHolidays,
}: {
  isBethHabad: boolean;
  showShabbat: boolean;
  showHolidays: boolean;
  onToggleShabbat: () => void;
  onToggleHolidays: () => void;
}) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_70%_10%,#6d2abd_0%,#421388_38%,#210763_100%)] px-5 pb-5 pt-5 text-white shadow-[0_20px_42px_rgba(43,8,104,0.24)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_34%,rgba(116,52,213,0.26),transparent_30%),radial-gradient(circle_at_88%_60%,rgba(93,45,171,0.32),transparent_28%)]" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.72rem] font-black uppercase tracking-[0.18em] text-white/70">Agenda IA</p>
          <h1 className="mt-2 text-[clamp(1.9rem,8.5vw,2.4rem)] font-black leading-none tracking-[-0.05em]">Mon agenda</h1>
          <p className="mt-2 max-w-[14rem] text-sm font-medium leading-6 text-white/80">
            Une vue claire de votre mois et de vos dates importantes.
          </p>
        </div>
        <div className="relative flex size-[4.15rem] shrink-0 items-center justify-center rounded-[1.35rem] border border-white/14 bg-white/10 shadow-[0_16px_30px_rgba(18,5,52,0.32)] backdrop-blur">
          <div className="absolute inset-[0.45rem] rounded-[1.15rem] border border-white/10 bg-white/5" />
          <span className="absolute -right-1.5 -top-1.5 rounded-xl bg-white px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.1em] text-[#421388] shadow-sm">
            IA
          </span>
          <CalendarDays className="relative size-7 text-white" />
        </div>
      </div>

      <div className="relative mt-4">
        <TaskCreateDialog triggerClassName="min-h-12 w-full rounded-[1.3rem] border-0 bg-white text-[#421388] shadow-[0_16px_28px_rgba(18,5,52,0.28)] hover:bg-violet-50 hover:text-[#35106f]" />
      </div>

      {isBethHabad && (
        <div className="relative mt-4 flex flex-wrap gap-2.5 border-t border-white/14 pt-4">
          {isBethHabad && (
            <ToggleChip active={showShabbat} onClick={onToggleShabbat} activeTone="amber">
              Horaires de Chabbat
            </ToggleChip>
          )}
          {isBethHabad && (
            <ToggleChip active={showHolidays} onClick={onToggleHolidays} activeTone="violet">
              Fêtes juives
            </ToggleChip>
          )}
        </div>
      )}
    </section>
  );
}

function MobileAgendaControls({
  search,
  setSearch,
  onSearchSubmit,
  viewMode,
  onViewChange,
  period,
  onPeriodChange,
}: {
  search: string;
  setSearch: (value: string) => void;
  onSearchSubmit: () => void;
  viewMode: ViewMode;
  onViewChange: (value: string) => void;
  period: CalendarPeriod;
  onPeriodChange: (period: CalendarPeriod) => void;
}) {
  return (
    <section className="rounded-[1.8rem] border border-[#421388]/10 bg-white px-4 py-4 shadow-[0_14px_28px_rgba(45,16,110,0.08)]">
      <div className="flex rounded-[1.1rem] bg-[#f6f0ff] p-1">
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
              onClick={() => onViewChange(view.value)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-[0.95rem] px-3 py-2.5 text-sm font-black transition",
                isActive ? "bg-white text-[#421388] shadow-sm" : "text-slate-500"
              )}
            >
              <Icon className="size-4" />
              {view.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PERIODS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onPeriodChange(item.value)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-black transition",
              period === item.value
                ? "bg-[#421388] text-white shadow-[0_10px_20px_rgba(66,19,136,0.2)]"
                : "border border-slate-200 bg-white text-slate-600"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="relative mt-3">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && onSearchSubmit()}
          placeholder="Rechercher dans l’agenda..."
          className="w-full rounded-[1.1rem] border border-[#421388]/12 bg-[#fffaf4] py-3 pl-9 pr-4 text-sm font-medium text-slate-800 outline-none transition focus:border-[#421388] focus:bg-white focus:ring-4 focus:ring-[#421388]/10"
        />
      </div>
    </section>
  );
}

function MobileAgendaEmpty() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[1.9rem] border border-cyan-100 bg-gradient-to-br from-white via-sky-50/60 to-emerald-50/60 px-5 py-14 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-[#1E88E5] to-[#00A7A0] shadow-[0_14px_28px_rgba(30,136,229,0.24)]">
        <CalendarDays className="size-8 text-white" />
      </div>
      <div>
        <p className="text-lg font-black text-slate-900">Aucune date dans l’agenda</p>
        <p className="mt-2 text-sm font-medium leading-6 text-slate-500">Ajoutez un événement, une tâche ou une automatisation pour commencer.</p>
      </div>
    </div>
  );
}

function MobileCalendarView({
  events,
  period,
  anchorDate,
  shabbatByDate,
  holidayByDate,
  automationByDate,
  taskByDate,
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
  period: CalendarPeriod;
  anchorDate: Date;
  shabbatByDate?: Map<string, ShabbatItem>;
  holidayByDate?: Map<string, HolidayItem[]>;
  automationByDate: Map<string, AutomationOccurrence[]>;
  taskByDate: Map<string, TaskOccurrence[]>;
  onToday: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onDelete: (event: Event) => void;
  deletingId: string | null;
  isPending: boolean;
  isBethHabad: boolean;
  timezone: string;
}) {
  const monthDays = useMemo(() => buildMonthDays(anchorDate), [anchorDate]);
  const [selectedDayKey, setSelectedDayKey] = useState(() => dayKey(new Date()));
  const defaultSelectedDayKey =
    new Date().getFullYear() === anchorDate.getFullYear() && new Date().getMonth() === anchorDate.getMonth()
      ? dayKey(new Date())
      : dayKey(startOfMonth(anchorDate));
  const activeSelectedDayKey =
    period === "month" && monthDays.some((day) => dayKey(day) === selectedDayKey)
      ? selectedDayKey
      : defaultSelectedDayKey;
  const [rangeStart, rangeEnd] = visibleRange(anchorDate, period);
  const snapshots =
    period === "year"
      ? []
      : (() => {
          const items: Array<{
            key: string;
            date: Date;
            dayEvents: Event[];
            dayTasks: TaskOccurrence[];
            dayAutomations: AutomationOccurrence[];
            shabbat?: ShabbatItem;
            holidays?: HolidayItem[];
          }> = [];
          for (let cursor = new Date(rangeStart); cursor <= rangeEnd; cursor = addDays(cursor, 1)) {
            const key = dayKey(cursor);
            const dayEvents = eventsForDate(events, cursor);
            const dayTasks = taskByDate.get(key) ?? [];
            const dayAutomations = automationByDate.get(key) ?? [];
            const shabbat = shabbatByDate?.get(key);
            const holidays = holidayByDate?.get(key);
            const shouldInclude =
              period === "day" ||
              period === "week" ||
              dayEvents.length > 0 ||
              dayTasks.length > 0 ||
              dayAutomations.length > 0 ||
              Boolean(shabbat) ||
              Boolean(holidays?.length);
            if (!shouldInclude) continue;
            items.push({ key, date: new Date(cursor), dayEvents, dayTasks, dayAutomations, shabbat, holidays });
          }
          return items;
        })();

  const yearMonths =
    period === "year"
      ? buildYearMonths(anchorDate).map((month) => {
          const monthEvents = events.filter((event) => isSamePeriod(toDate(event.startDate), month, "month"));
          const monthTasks = Array.from(taskByDate.entries()).filter(([key]) => Number(key.slice(5, 7)) - 1 === month.getMonth()).reduce((total, [, items]) => total + items.length, 0);
          const monthAutomations = Array.from(automationByDate.entries()).filter(([key]) => Number(key.slice(5, 7)) - 1 === month.getMonth()).reduce((total, [, items]) => total + items.length, 0);
          return { month, monthEvents, monthTasks, monthAutomations };
        })
      : [];

  return (
    <div className="space-y-4">
      <section className="rounded-[1.8rem] border border-[#421388]/10 bg-white px-4 py-4 shadow-[0_14px_28px_rgba(45,16,110,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.72rem] font-black uppercase tracking-[0.15em] text-[#421388]">Vue active</p>
            <h2 className="mt-1 truncate text-lg font-black capitalize text-slate-950">{calendarTitle(anchorDate, period)}</h2>
          </div>
          <button
            type="button"
            onClick={onToday}
            className="shrink-0 rounded-full bg-[#421388] px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-white shadow-[0_10px_18px_rgba(66,19,136,0.18)]"
          >
            Aujourd’hui
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={onPrevious}
            aria-label="Période précédente"
            className="flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="flex-1 rounded-[1rem] bg-[#fffaf4] px-4 py-3 text-center text-sm font-black text-slate-800">
            {period === "day"
              ? "Jour"
              : period === "week"
                ? "Semaine"
                : period === "month"
                  ? "Mois"
                  : "Année"}
          </div>
          <button
            type="button"
            onClick={onNext}
            aria-label="Période suivante"
            className="flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </section>

      {period === "month" ? (
        <>
          <section className="rounded-[1.8rem] border border-[#421388]/10 bg-white px-3 py-4 shadow-[0_14px_28px_rgba(45,16,110,0.08)]">
            <div className="mb-3 grid grid-cols-7 gap-1 px-1">
              {WEEK_DAYS.map((day) => (
                <div key={day} className="text-center text-[0.62rem] font-black uppercase tracking-[0.08em] text-slate-400">
                  {day.slice(0, 3)}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthDays.map((day) => {
                const key = dayKey(day);
                const dayEvents = eventsForDate(events, day);
                const dayTasks = taskByDate.get(key) ?? [];
                const dayAutomations = automationByDate.get(key) ?? [];
                const isSelected = key === activeSelectedDayKey;
                const isToday = key === todayKey();
                const isOutsideMonth = day.getMonth() !== anchorDate.getMonth();
                const totalItems = dayEvents.length + dayTasks.length + dayAutomations.length;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDayKey(key)}
                    className={cn(
                      "flex aspect-square flex-col items-center justify-center rounded-[1rem] transition",
                      isSelected
                        ? "bg-[#421388] text-white shadow-[0_12px_24px_rgba(66,19,136,0.22)]"
                        : isToday
                          ? "bg-violet-50 text-[#421388]"
                          : "text-slate-800",
                      isOutsideMonth && !isSelected && "text-slate-300"
                    )}
                  >
                    <span className={cn("text-sm font-black", isOutsideMonth && !isSelected && "opacity-80")}>
                      {day.getDate()}
                    </span>
                    <span className="mt-1 flex min-h-[0.4rem] items-center gap-1">
                      {totalItems > 0 && (
                        <>
                          <span className={cn("size-1.5 rounded-full", isSelected ? "bg-white" : "bg-[#421388]")} />
                          {totalItems > 2 && <span className={cn("size-1.5 rounded-full", isSelected ? "bg-white/70" : "bg-[#421388]/55")} />}
                        </>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {(() => {
            const selectedDate = new Date(`${activeSelectedDayKey}T12:00:00`);
            const selectedEvents = eventsForDate(events, selectedDate);
            const selectedTasks = taskByDate.get(activeSelectedDayKey) ?? [];
            const selectedAutomations = automationByDate.get(activeSelectedDayKey) ?? [];
            const selectedShabbat = shabbatByDate?.get(activeSelectedDayKey);
            const selectedHolidays = holidayByDate?.get(activeSelectedDayKey) ?? [];
            return (
              <section className="overflow-hidden rounded-[1.7rem] border border-[#421388]/10 bg-white shadow-[0_12px_24px_rgba(45,16,110,0.07)]">
                <div className="bg-gradient-to-r from-[#421388] via-[#5d1ba6] to-[#7a2ec9] px-4 py-4 text-white">
                  <p className="text-[0.72rem] font-black uppercase tracking-[0.14em] text-white/70">
                    {DAY_SHORT_FORMATTER.format(selectedDate)}
                  </p>
                  <p className="mt-1 text-lg font-black capitalize">{formatFrenchDate(selectedDate)}</p>
                  {isBethHabad && <p className="mt-1 text-xs font-semibold text-violet-100 hebrew">{formatHebrewDate(selectedDate)}</p>}
                </div>
                <div className="space-y-3 p-4">
                  {selectedAutomations.map((automation, index) => (
                    <AutomationPill key={`${automation.id}-${index}`} automation={automation} />
                  ))}
                  {selectedTasks.map((task) => <TaskCard key={task.id} task={task} />)}
                  {selectedShabbat && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <p className="text-sm font-black text-amber-700">Horaires de Chabbat</p>
                      {selectedShabbat.parasha && <p className="mt-1 text-xs font-semibold text-amber-600">{selectedShabbat.parasha}</p>}
                      <p className="mt-1 text-xs font-semibold text-amber-700">Entrée {selectedShabbat.entry ?? "-"} · Sortie {selectedShabbat.exit ?? "-"}</p>
                    </div>
                  )}
                  {selectedHolidays.map((holiday) => (
                    <div key={`${holiday.date}-${holiday.name}`} className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
                      <p className="text-sm font-black text-blue-700">{holiday.name}</p>
                      {holiday.nameHebrew && <p className="mt-1 text-xs font-semibold text-blue-500 hebrew">{holiday.nameHebrew}</p>}
                      {holiday.hebrewDate && <p className="mt-1 text-xs font-semibold text-blue-600">{holiday.hebrewDate}</p>}
                    </div>
                  ))}
                  {selectedEvents.length > 0 ? (
                    selectedEvents.map((event) => (
                      <AgendaEventCard
                        key={event.id}
                        event={event}
                        onDelete={onDelete}
                        deleting={deletingId === event.id || isPending}
                        compact
                        isBethHabad={isBethHabad}
                        timezone={timezone}
                      />
                    ))
                  ) : selectedTasks.length === 0 && selectedAutomations.length === 0 && !selectedShabbat && selectedHolidays.length === 0 ? (
                    <p className="text-sm font-medium text-slate-400">Aucun événement ce jour.</p>
                  ) : null}
                </div>
              </section>
            );
          })()}
        </>
      ) : period === "year" ? (
        <div className="space-y-3">
          {yearMonths.map(({ month, monthEvents, monthTasks, monthAutomations }) => (
            <section key={month.toISOString()} className="rounded-[1.7rem] border border-[#421388]/10 bg-white px-4 py-4 shadow-[0_12px_24px_rgba(45,16,110,0.07)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-black capitalize text-slate-950">{MONTH_NAME_FORMATTER.format(month)}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {monthEvents.length} événement{monthEvents.length > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {monthAutomations > 0 && <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[0.68rem] font-black text-cyan-700">{monthAutomations} auto</span>}
                  {monthTasks > 0 && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[0.68rem] font-black text-emerald-700">{monthTasks} tâche{monthTasks > 1 ? "s" : ""}</span>}
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {monthEvents.slice(0, 3).map((event) => (
                  <MiniCalendarEvent key={event.id} event={event} timezone={timezone} />
                ))}
                {monthEvents.length === 0 && monthAutomations === 0 && monthTasks === 0 && (
                  <p className="text-sm font-medium text-slate-400">Aucune activité ce mois-ci.</p>
                )}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {snapshots.length === 0 ? (
            <section className="rounded-[1.7rem] border border-dashed border-slate-200 bg-white px-4 py-12 text-center">
              <p className="text-sm font-bold text-slate-600">Aucune activité sur cette période</p>
              <p className="mt-2 text-xs font-medium text-slate-400">Essayez une autre vue ou une autre période.</p>
            </section>
          ) : (
            snapshots.map((snapshot) => (
              <section key={snapshot.key} className="overflow-hidden rounded-[1.7rem] border border-[#421388]/10 bg-white shadow-[0_12px_24px_rgba(45,16,110,0.07)]">
                <div className="bg-gradient-to-r from-[#421388] via-[#5d1ba6] to-[#7a2ec9] px-4 py-4 text-white">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[0.72rem] font-black uppercase tracking-[0.14em] text-white/70">{DAY_SHORT_FORMATTER.format(snapshot.date)}</p>
                      <p className="mt-1 text-lg font-black capitalize">{formatFrenchDate(snapshot.date)}</p>
                      {isBethHabad && <p className="mt-1 text-xs font-semibold text-violet-100 hebrew">{formatHebrewDate(snapshot.date)}</p>}
                    </div>
                    <div className="rounded-[1.15rem] bg-white/12 px-3 py-2 text-right backdrop-blur-sm">
                      <p className="text-[0.68rem] font-black uppercase tracking-[0.1em] text-white/70">Activité</p>
                      <p className="mt-1 text-base font-black">
                        {snapshot.dayEvents.length + snapshot.dayTasks.length + snapshot.dayAutomations.length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 p-4">
                  {snapshot.dayAutomations.map((automation, index) => (
                    <AutomationPill key={`${automation.id}-${index}`} automation={automation} />
                  ))}
                  {snapshot.dayTasks.map((task) => <TaskCard key={task.id} task={task} />)}
                  {snapshot.shabbat && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <p className="text-sm font-black text-amber-700">Horaires de Chabbat</p>
                      {snapshot.shabbat.parasha && <p className="mt-1 text-xs font-semibold text-amber-600">{snapshot.shabbat.parasha}</p>}
                      <p className="mt-1 text-xs font-semibold text-amber-700">Entrée {snapshot.shabbat.entry ?? "-"} · Sortie {snapshot.shabbat.exit ?? "-"}</p>
                    </div>
                  )}
                  {snapshot.holidays?.map((holiday) => (
                    <div key={`${holiday.date}-${holiday.name}`} className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
                      <p className="text-sm font-black text-blue-700">{holiday.name}</p>
                      {holiday.nameHebrew && <p className="mt-1 text-xs font-semibold text-blue-500 hebrew">{holiday.nameHebrew}</p>}
                      {holiday.hebrewDate && <p className="mt-1 text-xs font-semibold text-blue-600">{holiday.hebrewDate}</p>}
                    </div>
                  ))}
                  {snapshot.dayEvents.length > 0 ? (
                    snapshot.dayEvents.map((event) => (
                      <AgendaEventCard
                        key={event.id}
                        event={event}
                        onDelete={onDelete}
                        deleting={deletingId === event.id || isPending}
                        compact
                        isBethHabad={isBethHabad}
                        timezone={timezone}
                      />
                    ))
                  ) : snapshot.dayTasks.length === 0 && snapshot.dayAutomations.length === 0 && !snapshot.shabbat && !snapshot.holidays?.length ? (
                    <p className="text-sm font-medium text-slate-400">Aucun événement ce jour.</p>
                  ) : null}
                </div>
              </section>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function MobileListView({
  groupedEvents,
  taskByDate,
  automationByDate,
  onDelete,
  deletingId,
  isPending,
  isBethHabad,
  timezone,
}: {
  groupedEvents: ReturnType<typeof groupEventsByDay>;
  taskByDate: Map<string, TaskOccurrence[]>;
  automationByDate: Map<string, AutomationOccurrence[]>;
  onDelete: (event: Event) => void;
  deletingId: string | null;
  isPending: boolean;
  isBethHabad: boolean;
  timezone: string;
}) {
  const eventGroups = new Map(groupedEvents.map((group) => [group.key, group]));
  const dayKeys = [...new Set([...eventGroups.keys(), ...taskByDate.keys(), ...automationByDate.keys()])].sort();

  return (
    <div className="space-y-4">
      {dayKeys.map((key) => {
        const group = eventGroups.get(key);
        const tasks = taskByDate.get(key) ?? [];
        const automations = automationByDate.get(key) ?? [];
        const date = group?.date ?? new Date(`${key}T12:00:00`);
        return (
          <section key={key} className="overflow-hidden rounded-[1.7rem] border border-[#421388]/10 bg-white shadow-[0_12px_24px_rgba(45,16,110,0.07)]">
            <div className="bg-gradient-to-r from-white via-violet-50/70 to-fuchsia-50/70 px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-[1.15rem] bg-[#421388] text-white shadow-[0_12px_22px_rgba(66,19,136,0.22)]">
                  <span className="text-[0.62rem] font-black uppercase">{formatMonth(date)}</span>
                  <span className="text-lg font-black leading-none">{formatDayNumber(date)}</span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-black capitalize text-slate-950">{formatFrenchDate(date)}</p>
                  {isBethHabad && <p className="mt-1 text-xs font-semibold text-[#421388] hebrew">{formatHebrewDate(date)}</p>}
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {(group?.events.length ?? 0) + tasks.length + automations.length} élément{(group?.events.length ?? 0) + tasks.length + automations.length > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 p-4">
              {automations.map((automation) => <AutomationPill key={`${automation.id}-${key}`} automation={automation} />)}
              {tasks.map((task) => <TaskCard key={task.id} task={task} />)}
              {group?.events.map((event) => (
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
        );
      })}
    </div>
  );
}

function ToggleChip({
  active,
  onClick,
  children,
  activeTone,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  activeTone: "violet" | "amber";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.08em] transition",
        activeTone === "amber"
          ? active
            ? "bg-amber-50 text-amber-700 shadow-sm"
            : "border border-white/18 bg-white/10 text-white/88"
          : active
            ? "bg-white text-[#421388] shadow-sm"
            : "border border-white/18 bg-white/10 text-white/88"
      )}
    >
      <span className="inline-flex items-center gap-1.5">{children}</span>
    </button>
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
  taskByDate,
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
  taskByDate: Map<string, TaskOccurrence[]>;
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
                    href={getAutomationConfigurationHref(automation)}
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
              dayTasks={taskByDate.get(dayKey(anchorDate))}
              onDelete={onDelete}
              deletingId={deletingId}
              isPending={isPending}
              isBethHabad={isBethHabad}
              timezone={timezone}
            />
          )}
          {period === "week" && (
            <WeekCalendar events={events} anchorDate={anchorDate} shabbatByDate={isBethHabad ? shabbatByDate : undefined} holidayByDate={isBethHabad ? holidayByDate : undefined} automationByDate={automationByDate} taskByDate={taskByDate} isBethHabad={isBethHabad} timezone={timezone} />
          )}
          {period === "month" && (
            <MonthCalendar events={events} anchorDate={anchorDate} shabbatByDate={isBethHabad ? shabbatByDate : undefined} holidayByDate={isBethHabad ? holidayByDate : undefined} automationByDate={automationByDate} taskByDate={taskByDate} isBethHabad={isBethHabad} timezone={timezone} />
          )}
          {period === "year" && (
            <YearCalendar events={events} anchorDate={anchorDate} automationByDate={automationByDate} taskByDate={taskByDate} timezone={timezone} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ListView({
  groupedEvents,
  taskByDate,
  automationByDate,
  onDelete,
  deletingId,
  isPending,
  isBethHabad,
  timezone,
}: {
  groupedEvents: ReturnType<typeof groupEventsByDay>;
  taskByDate: Map<string, TaskOccurrence[]>;
  automationByDate: Map<string, AutomationOccurrence[]>;
  onDelete: (event: Event) => void;
  deletingId: string | null;
  isPending: boolean;
  isBethHabad: boolean;
  timezone: string;
}) {
  const eventGroups = new Map(groupedEvents.map((group) => [group.key, group]));
  const dayKeys = [...new Set([...eventGroups.keys(), ...taskByDate.keys(), ...automationByDate.keys()])].sort();

  return (
    <div className="space-y-5">
      {dayKeys.map((key) => {
        const group = eventGroups.get(key);
        const tasks = taskByDate.get(key) ?? [];
        const automations = automationByDate.get(key) ?? [];
        const date = group?.date ?? new Date(`${key}T12:00:00`);
        return (
        <section key={key} className="overflow-hidden rounded-2xl border border-[#421388]/15 border-l-4 border-l-[#421388] bg-white shadow-sm shadow-[#421388]/5">
          <div className="grid gap-0 lg:grid-cols-[13rem_1fr]">
          <div className="bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-4 lg:sticky lg:top-4 lg:self-start">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#421388] text-white shadow-sm shadow-[#421388]/20">
                <span className="text-xs font-semibold uppercase">{formatMonth(date)}</span>
                <span className="text-2xl font-bold leading-none">{formatDayNumber(date)}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold capitalize text-slate-950">{formatFrenchDate(date)}</p>
                {isBethHabad && <p className="mt-1 text-sm font-medium text-[#421388] hebrew">{formatHebrewDate(date)}</p>}
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {(group?.events.length ?? 0) + tasks.length + automations.length} élément{(group?.events.length ?? 0) + tasks.length + automations.length > 1 ? "s" : ""} ce jour
            </p>
          </div>

          <div className="space-y-3 p-3">
            {automations.map((automation) => <AutomationPill key={`${automation.id}-${key}`} automation={automation} />)}
            {tasks.map((task) => <TaskCard key={task.id} task={task} />)}
            {group?.events.map((event) => (
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
          </div>
        </section>
        );
      })}
    </div>
  );
}

function DayCalendar({
  events,
  anchorDate,
  shabbatItem,
  holidayItems,
  dayAutomations,
  dayTasks,
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
  dayTasks?: TaskOccurrence[];
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
        {(shabbatItem || (holidayItems?.length ?? 0) > 0 || (dayAutomations?.length ?? 0) > 0 || (dayTasks?.length ?? 0) > 0) && (
          <div className="mt-3 space-y-2">
            {dayAutomations?.map((automation, index) => (
              <Link
                key={`${automation.id}-${index}`}
                href={getAutomationConfigurationHref(automation)}
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
            {dayTasks?.map((task) => <TaskPill key={task.id} task={task} />)}
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
      {events.length > 0 || (dayTasks?.length ?? 0) > 0 ? (
        <div className="space-y-3">
          {dayTasks?.map((task) => <TaskCard key={task.id} task={task} />)}
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

function WeekCalendar({ events, anchorDate, shabbatByDate, holidayByDate, automationByDate, taskByDate, isBethHabad, timezone }: { events: Event[]; anchorDate: Date; shabbatByDate?: Map<string, ShabbatItem>; holidayByDate?: Map<string, HolidayItem[]>; automationByDate: Map<string, AutomationOccurrence[]>; taskByDate: Map<string, TaskOccurrence[]>; isBethHabad: boolean; timezone: string }) {
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
          const dayTasks = taskByDate.get(key);
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
                {dayTasks?.map((task) => <TaskPill key={task.id} task={task} />)}
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

function MonthCalendar({ events, anchorDate, shabbatByDate, holidayByDate, automationByDate, taskByDate, isBethHabad, timezone }: { events: Event[]; anchorDate: Date; shabbatByDate?: Map<string, ShabbatItem>; holidayByDate?: Map<string, HolidayItem[]>; automationByDate: Map<string, AutomationOccurrence[]>; taskByDate: Map<string, TaskOccurrence[]>; isBethHabad: boolean; timezone: string }) {
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
            const dayTasks = taskByDate.get(key) ?? [];
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
                  {dayTasks.slice(0, 2).map((task) => <TaskPill key={task.id} task={task} compact />)}
                  {dayTasks.length > 2 && (
                    <p className="text-[10px] font-semibold text-emerald-600">+{dayTasks.length - 2} tâche{dayTasks.length - 2 > 1 ? "s" : ""}</p>
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

function YearCalendar({ events, anchorDate, automationByDate, taskByDate, timezone }: { events: Event[]; anchorDate: Date; automationByDate: Map<string, AutomationOccurrence[]>; taskByDate: Map<string, TaskOccurrence[]>; timezone: string }) {
  const automationCountByMonth = useMemo(() => {
    const counts = new Array(12).fill(0);
    for (const [key, items] of automationByDate) {
      const month = Number(key.slice(5, 7)) - 1;
      if (month >= 0 && month < 12) counts[month] += items.length;
    }
    return counts;
  }, [automationByDate]);
  const taskCountByMonth = useMemo(() => {
    const counts = new Array(12).fill(0);
    for (const [key, items] of taskByDate) {
      const month = Number(key.slice(5, 7)) - 1;
      if (month >= 0 && month < 12) counts[month] += items.length;
    }
    return counts;
  }, [taskByDate]);

  return (
    <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
      {buildYearMonths(anchorDate).map((month) => {
        const monthEvents = events.filter((event) => isSamePeriod(toDate(event.startDate), month, "month"));
        const monthAutomationCount = automationCountByMonth[month.getMonth()];
        const monthTaskCount = taskCountByMonth[month.getMonth()];
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
                {monthTaskCount > 0 && (
                  <span className="flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 shadow-sm">
                    <CheckSquare className="size-3" />
                    {monthTaskCount}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              {monthEvents.slice(0, 4).map((event) => (
                <MiniCalendarEvent key={event.id} event={event} timezone={timezone} />
              ))}
              {monthEvents.length === 0 && monthAutomationCount === 0 && monthTaskCount === 0 && (
                <p className="text-sm text-slate-400">Aucun événement</p>
              )}
              {monthEvents.length === 0 && monthAutomationCount > 0 && (
                <p className="text-sm text-cyan-600">{monthAutomationCount} publication{monthAutomationCount > 1 ? "s" : ""} automatique{monthAutomationCount > 1 ? "s" : ""}</p>
              )}
              {monthEvents.length === 0 && monthTaskCount > 0 && (
                <p className="text-sm text-emerald-700">{monthTaskCount} tâche{monthTaskCount > 1 ? "s" : ""} personnelle{monthTaskCount > 1 ? "s" : ""}</p>
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
      href={getAutomationConfigurationHref(automation)}
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
    <Link
      href={event.automationHref ?? `/dashboard/events/${event.id}`}
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
    </Link>
  );
}

function MiniCalendarEvent({ event, timezone }: { event: Event; timezone: string }) {
  return (
    <Link href={event.automationHref ?? `/dashboard/events/${event.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-600 transition-colors hover:bg-violet-50">
      <span className="w-11 shrink-0 font-semibold text-[#421388]">{formatTime(event.startDate, timezone)}</span>
      <span className="truncate">{event.title}</span>
    </Link>
  );
}

function TaskPill({ task, compact = false }: { task: TaskOccurrence; compact?: boolean }) {
  return (
    <div
      title={`Tâche : ${task.title}`}
      className={cn(
        "flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-800 shadow-sm",
        compact && "px-1.5 py-0.5"
      )}
    >
      <CheckSquare className={cn("shrink-0", compact ? "size-3" : "size-3.5")} />
      <span className={cn("block truncate font-semibold", compact ? "text-[10px]" : "text-[11px]")}>{task.time} · {task.title}</span>
    </div>
  );
}

function TaskCard({ task }: { task: TaskOccurrence }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-emerald-950">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white"><CheckSquare className="size-4" /></div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{task.title}</p>
        <p className="text-xs text-emerald-700">Tâche personnelle · {task.time}</p>
      </div>
    </div>
  );
}

function TaskCreateDialog({ triggerClassName }: { triggerClassName?: string } = {}) {
  const router = useRouter();
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(dayKey(now));
  const [time, setTime] = useState("09:00");
  const [frequency, setFrequency] = useState<"NONE" | "DAILY" | "WEEKLY" | "MONTHLY">("NONE");
  const [weekdays, setWeekdays] = useState<number[]>([now.getDay()]);
  const [until, setUntil] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleWeekday(day: number) {
    setWeekdays((current) => current.includes(day) ? current.filter((value) => value !== day) : [...current, day]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setError("Le nom de la tâche est obligatoire.");
      return;
    }
    if (frequency === "WEEKLY" && weekdays.length === 0) {
      setError("Sélectionnez au moins un jour de répétition.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const recurrenceRule = frequency === "NONE" ? null : {
        frequency,
        ...(frequency === "WEEKLY" ? { weekdays } : {}),
        ...(until ? { until: new Date(`${until}T23:59:59`).toISOString() } : {}),
      };
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          scheduledAt: new Date(`${date}T${time}`).toISOString(),
          recurrenceRule,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Impossible d’ajouter la tâche.");
      }
      setOpen(false);
      setTitle("");
      setFrequency("NONE");
      setUntil("");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Impossible d’ajouter la tâche.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "border border-white/70 bg-white text-[#421388] shadow-lg shadow-[#1b0738]/30 hover:bg-violet-100 hover:text-[#35106f]",
          triggerClassName
        )}
      >
        <Plus className="size-4" />
        Ajouter une tâche
      </Button>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end bg-slate-950/50 p-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6" role="presentation" onMouseDown={() => !saving && setOpen(false)}>
          <form
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-dialog-title"
            onSubmit={submit}
            onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 bg-[#421388] px-5 py-5 text-white sm:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-200">Organisation personnelle</p>
                <h2 id="task-dialog-title" className="mt-1 text-2xl font-bold">Ajouter une tâche</h2>
                <p className="mt-1 text-sm text-violet-100">Planifiez une action ponctuelle ou récurrente dans votre agenda.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="text-white hover:bg-white/15 hover:text-white" onClick={() => setOpen(false)} disabled={saving} aria-label="Fermer"><X className="size-4" /></Button>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              <label className="block text-sm font-medium text-slate-700">Nom de la tâche
                <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex. Préparer la publication" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#421388] focus:ring-2 focus:ring-[#421388]/15" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">Date
                  <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#421388]" />
                </label>
                <label className="block text-sm font-medium text-slate-700">Heure
                  <input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#421388]" />
                </label>
              </div>
              <label className="block text-sm font-medium text-slate-700">Répétition
                <select value={frequency} onChange={(event) => setFrequency(event.target.value as typeof frequency)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#421388]">
                  <option value="NONE">Ne se répète pas</option>
                  <option value="DAILY">Tous les jours</option>
                  <option value="WEEKLY">Chaque semaine</option>
                  <option value="MONTHLY">Chaque mois</option>
                </select>
              </label>
              {frequency === "WEEKLY" && (
                <div>
                  <p className="text-sm font-medium text-slate-700">Jours de répétition</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"].map((label, day) => (
                      <button key={label} type="button" onClick={() => toggleWeekday(day)} className={cn("h-9 w-10 rounded-full border text-xs font-semibold", weekdays.includes(day) ? "border-[#421388] bg-[#421388] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-[#421388]/40")}>{label}</button>
                    ))}
                  </div>
                </div>
              )}
              {frequency !== "NONE" && (
                <label className="block text-sm font-medium text-slate-700">Fin de répétition <span className="font-normal text-slate-400">(facultatif)</span>
                  <input type="date" value={until} min={date} onChange={(event) => setUntil(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#421388]" />
                </label>
              )}
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Annuler</Button>
              <Button type="submit" loading={saving} className="bg-[#421388] hover:bg-[#35106f]"><Repeat2 className="size-4" />Ajouter la tâche</Button>
            </div>
          </form>
        </div>
      )}
    </>
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
  const router = useRouter();
  const draftCount = event._count?.contentDrafts ?? 0;
  const publicationCount = event._count?.publications ?? 0;

  return (
    <Card
      role="link"
      tabIndex={0}
      onClick={() => router.push(event.automationHref ?? `/dashboard/events/${event.id}`)}
      onKeyDown={(keyboardEvent) => {
        if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
          keyboardEvent.preventDefault();
          router.push(event.automationHref ?? `/dashboard/events/${event.id}`);
        }
      }}
      className="cursor-pointer overflow-hidden rounded-xl border-slate-200 bg-white shadow-sm transition-all duration-200 hover:border-[#421388]/25 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#421388]/40"
    >
      <CardContent className="p-0">
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
                    onClick={(clickEvent) => { clickEvent.stopPropagation(); setMenuOpen(!menuOpen); }}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Actions événement"
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={(clickEvent) => { clickEvent.stopPropagation(); setMenuOpen(false); }} />
                      <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg max-md:border-cyan-100 max-md:bg-white/95">
                        <button
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                          disabled={deleting}
                          onClick={(clickEvent) => {
                            clickEvent.stopPropagation();
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
      </CardContent>
    </Card>
  );
}
