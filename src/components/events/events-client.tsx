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
  Plus, Search, CalendarDays, MapPin,
  FileText, Send, MoreHorizontal, Edit, Trash2, Sparkles, Clock, LayoutList,
  ChevronLeft, ChevronRight,
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

interface Props {
  events: Event[];
  statusCounts: Record<string, number>;
}

type ViewMode = "calendar" | "list";
type CalendarPeriod = "day" | "week" | "month" | "year";

const STATUS_FILTERS = [
  { value: "", label: "Tous" },
  { value: "DRAFT", label: "Brouillons" },
  { value: "READY", label: "Prêts" },
  { value: "SCHEDULED", label: "Programmés" },
  { value: "PUBLISHED", label: "Publiés" },
  { value: "COMPLETED", label: "Terminés" },
  { value: "ARCHIVED", label: "Archivés" },
];

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
const TIME_FORMATTER = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
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

function formatTime(value: Date | string) {
  return TIME_FORMATTER.format(toDate(value));
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

export function EventsClient({ events, statusCounts }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const activeStatus = searchParams.get("status") ?? "";
  const viewMode: ViewMode = searchParams.get("view") === "list" ? "list" : "calendar";
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

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50 to-teal-50 p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Agenda communautaire</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Mon agenda</h1>
            <p className="mt-2 text-sm text-slate-600">
              {totalAll} événement{totalAll !== 1 ? "s" : ""} enregistré{totalAll !== 1 ? "s" : ""}, avec une vue calendrier et une vue liste.
            </p>
          </div>
          <Link href="/dashboard/events/new">
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-500 sm:w-auto">
              <Plus className="size-4" />
              Nouvel événement
            </Button>
          </Link>
        </div>
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-sm">
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
                      "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-all",
                      isActive
                        ? "bg-emerald-600 text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
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
              <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
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
                        "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all sm:flex-none",
                        isActive ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
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
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {events.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <CalendarDays className="size-7 text-slate-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-700">Aucune date dans l&apos;agenda</p>
            <p className="mt-1 text-sm text-slate-400">Créez votre premier événement pour commencer.</p>
          </div>
          <Link href="/dashboard/events/new">
            <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
              <Plus className="size-4" />
              Créer un événement
            </Button>
          </Link>
        </div>
      ) : (
        viewMode === "calendar" ? (
          <CalendarView
            events={events}
            periodEvents={periodEvents}
            todaysEvents={todaysEvents}
            period={activePeriod}
            anchorDate={anchorDate}
            onPeriodChange={updatePeriod}
            onToday={goToday}
            onPrevious={() => setAnchorDate((date) => moveAnchor(date, activePeriod, -1))}
            onNext={() => setAnchorDate((date) => moveAnchor(date, activePeriod, 1))}
            onDelete={deleteEvent}
            deletingId={deletingId}
            isPending={isPending}
          />
        ) : (
          <ListView
            groupedEvents={groupedEvents}
            onDelete={deleteEvent}
            deletingId={deletingId}
            isPending={isPending}
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
  onPeriodChange,
  onToday,
  onPrevious,
  onNext,
  onDelete,
  deletingId,
  isPending,
}: {
  events: Event[];
  periodEvents: Event[];
  todaysEvents: Event[];
  period: CalendarPeriod;
  anchorDate: Date;
  onPeriodChange: (period: CalendarPeriod) => void;
  onToday: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onDelete: (event: Event) => void;
  deletingId: string | null;
  isPending: boolean;
}) {
  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-emerald-100 bg-gradient-to-br from-white via-emerald-50 to-teal-50 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">Aujourd&apos;hui</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <div className="flex h-14 w-14 flex-col items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
                  <span className="text-[11px] font-semibold uppercase">{formatMonth(new Date())}</span>
                  <span className="text-xl font-bold leading-none">{formatDayNumber(new Date())}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold capitalize text-slate-950">{formatFrenchDate(new Date())}</p>
                  <p className="mt-1 text-sm font-medium text-emerald-700 hebrew">{formatHebrewDate(new Date())}</p>
                </div>
              </div>
            </div>
            <div className="min-w-0 rounded-2xl border border-white/80 bg-white/80 p-3 shadow-sm lg:w-96">
              <p className="text-xs font-semibold text-slate-500">
                {todaysEvents.length} événement{todaysEvents.length !== 1 ? "s" : ""} aujourd&apos;hui
              </p>
              <div className="mt-2 space-y-1.5">
                {todaysEvents.length > 0 ? todaysEvents.slice(0, 3).map((event) => (
                  <MiniCalendarEvent key={event.id} event={event} />
                )) : (
                  <p className="text-sm text-slate-400">Aucun événement prévu aujourd&apos;hui.</p>
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
                    period === item.value ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {period === "day" && (
            <DayCalendar events={periodEvents} anchorDate={anchorDate} onDelete={onDelete} deletingId={deletingId} isPending={isPending} />
          )}
          {period === "week" && (
            <WeekCalendar events={events} anchorDate={anchorDate} />
          )}
          {period === "month" && (
            <MonthCalendar events={events} anchorDate={anchorDate} />
          )}
          {period === "year" && (
            <YearCalendar events={events} anchorDate={anchorDate} />
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
}: {
  groupedEvents: ReturnType<typeof groupEventsByDay>;
  onDelete: (event: Event) => void;
  deletingId: string | null;
  isPending: boolean;
}) {
  return (
    <div className="space-y-5">
      {groupedEvents.map((group) => (
        <section key={group.key} className="grid gap-3 lg:grid-cols-[13rem_1fr]">
          <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 lg:sticky lg:top-4 lg:self-start">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
                <span className="text-xs font-semibold uppercase">{formatMonth(group.date)}</span>
                <span className="text-2xl font-bold leading-none">{formatDayNumber(group.date)}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold capitalize text-slate-950">{formatFrenchDate(group.date)}</p>
                <p className="mt-1 text-sm font-medium text-emerald-700 hebrew">{formatHebrewDate(group.date)}</p>
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
  onDelete,
  deletingId,
  isPending,
}: {
  events: Event[];
  anchorDate: Date;
  onDelete: (event: Event) => void;
  deletingId: string | null;
  isPending: boolean;
}) {
  const isToday = dayKey(anchorDate) === todayKey();

  return (
    <div className="p-4">
      <div className={cn(
        "mb-4 rounded-2xl border p-4",
        isToday ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"
      )}>
        <p className="text-sm font-semibold capitalize text-slate-950">{formatFrenchDate(anchorDate)}</p>
        <p className="mt-1 text-sm font-medium text-emerald-700 hebrew">{formatHebrewDate(anchorDate)}</p>
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
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
          <p className="text-sm font-semibold text-slate-600">Aucun événement ce jour</p>
          <p className="mt-1 text-xs text-slate-400">Utilisez “Nouvel événement” pour ajouter une date.</p>
        </div>
      )}
    </div>
  );
}

function WeekCalendar({ events, anchorDate }: { events: Event[]; anchorDate: Date }) {
  const weekStart = startOfWeek(anchorDate);
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  return (
    <div className="grid min-w-[760px] grid-cols-7 divide-x divide-slate-200 overflow-x-auto">
      {days.map((day) => {
        const dayEvents = eventsForDate(events, day);
        const isToday = dayKey(day) === todayKey();
        return (
          <div key={dayKey(day)} className={cn("min-h-[34rem] bg-white", isToday && "bg-emerald-50/60")}>
            <div className={cn(
              "sticky top-0 z-10 border-b border-slate-200 bg-white/95 p-3 backdrop-blur",
              isToday && "bg-emerald-50/95"
            )}>
              <p className="text-xs font-semibold uppercase text-slate-500">{DAY_SHORT_FORMATTER.format(day)}</p>
              <p className={cn("mt-1 text-2xl font-bold", isToday ? "text-emerald-700" : "text-slate-950")}>
                {day.getDate()}
              </p>
              <p className="mt-1 truncate text-xs font-medium text-emerald-700 hebrew">{formatHebrewDate(day)}</p>
            </div>
            <div className="space-y-2 p-2">
              {dayEvents.map((event) => (
                <CalendarEventPill key={event.id} event={event} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthCalendar({ events, anchorDate }: { events: Event[]; anchorDate: Date }) {
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
            const dayEvents = eventsForDate(events, day);
            const isToday = dayKey(day) === todayKey();
            const isOutsideMonth = day.getMonth() !== anchorDate.getMonth();
            return (
              <div
                key={dayKey(day)}
                className={cn(
                  "min-h-32 border-b border-r border-slate-200 p-2",
                  isOutsideMonth ? "bg-slate-50/70 text-slate-400" : "bg-white",
                  isToday && "bg-emerald-50"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                    isToday ? "bg-emerald-600 text-white" : "text-slate-700"
                  )}>
                    {day.getDate()}
                  </span>
                  <span className="truncate text-[11px] font-medium text-emerald-700 hebrew">{formatHebrewDate(day)}</span>
                </div>
                <div className="mt-2 space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <CalendarEventPill key={event.id} event={event} compact />
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

function YearCalendar({ events, anchorDate }: { events: Event[]; anchorDate: Date }) {
  return (
    <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
      {buildYearMonths(anchorDate).map((month) => {
        const monthEvents = events.filter((event) => isSamePeriod(toDate(event.startDate), month, "month"));
        const isCurrentMonth = new Date().getFullYear() === month.getFullYear() && new Date().getMonth() === month.getMonth();
        return (
          <div key={month.toISOString()} className={cn(
            "rounded-2xl border p-4",
            isCurrentMonth ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
          )}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold capitalize text-slate-950">{MONTH_NAME_FORMATTER.format(month)}</h3>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500 shadow-sm">
                {monthEvents.length}
              </span>
            </div>
            <div className="mt-3 space-y-1.5">
              {monthEvents.slice(0, 4).map((event) => (
                <MiniCalendarEvent key={event.id} event={event} />
              ))}
              {monthEvents.length === 0 && (
                <p className="text-sm text-slate-400">Aucun événement</p>
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

function CalendarEventPill({ event, compact = false }: { event: Event; compact?: boolean }) {
  return (
    <Link
      href={`/dashboard/events/${event.id}`}
      className={cn(
        "block rounded-lg border border-emerald-100 bg-emerald-600 px-2 py-1.5 text-white shadow-sm transition-colors hover:bg-emerald-700",
        compact && "px-1.5 py-1"
      )}
    >
      <span className="block truncate text-[11px] font-semibold">
        {formatTime(event.startDate)} · {event.title}
      </span>
      {!compact && event.location && (
        <span className="mt-0.5 block truncate text-[11px] text-emerald-100">{event.location}</span>
      )}
    </Link>
  );
}

function MiniCalendarEvent({ event }: { event: Event }) {
  return (
    <Link
      href={`/dashboard/events/${event.id}`}
      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
    >
      <span className="w-11 shrink-0 font-semibold text-emerald-700">{formatTime(event.startDate)}</span>
      <span className="truncate">{event.title}</span>
    </Link>
  );
}

function AgendaEventCard({
  event,
  onDelete,
  deleting,
  compact = false,
}: {
  event: Event;
  onDelete: (event: Event) => void;
  deleting: boolean;
  compact?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const draftCount = event._count?.contentDrafts ?? 0;
  const publicationCount = event._count?.publications ?? 0;

  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <div className={cn(
            "flex w-full shrink-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 md:w-36 md:flex-col md:items-start",
            compact && "md:w-48 md:flex-row md:items-center"
          )}>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <Clock className="size-4 text-emerald-600" />
              {formatTime(event.startDate)}
            </div>
            {event.endDate && (
              <p className="text-xs text-slate-500">Fin {formatTime(event.endDate)}</p>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/dashboard/events/${event.id}`}
                  className="text-base font-semibold text-slate-950 transition-colors hover:text-emerald-700"
                >
                  {event.title}
                </Link>
                {event.isRecurring && (
                  <span className="ml-2 text-xs font-normal text-slate-400">récurrent</span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Badge variant={STATUS_BADGE_VARIANT[event.status] ?? "draft"} className="text-[11px]">
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
                      <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                        <Link href={`/dashboard/events/${event.id}/edit`} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                          <Edit className="size-4" /> Modifier
                        </Link>
                        <Link href={`/dashboard/content/new?eventId=${event.id}`} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                          <Sparkles className="size-4" /> Générer contenu IA
                        </Link>
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

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <CalendarDays className="size-3" />
                <span className="capitalize">{formatFrenchDate(event.startDate)}</span>
              </span>
              <span className="font-medium text-emerald-700 hebrew">{formatHebrewDate(event.startDate)}</span>
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
                <Link href={`/dashboard/events/${event.id}?tab=content`} className="flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-600">
                  <FileText className="size-3" />
                  {draftCount} contenu{draftCount > 1 ? "s" : ""}
                </Link>
              )}
              {publicationCount > 0 && (
                <Link href={`/dashboard/events/${event.id}?tab=publications`} className="flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-600">
                  <Send className="size-3" />
                  {publicationCount} publication{publicationCount > 1 ? "s" : ""}
                </Link>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
