import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export type AgendaTask = {
  id: string;
  title: string;
  scheduledAt: string;
  recurrenceRule: unknown;
};

export type AgendaTaskOccurrence = {
  id: string;
  taskId: string;
  title: string;
  scheduledAt: string;
};

type RecurrenceRule = {
  frequency?: "DAILY" | "WEEKLY" | "MONTHLY";
  weekdays?: number[];
  until?: string;
};

function recurrenceRule(value: unknown): RecurrenceRule | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as RecurrenceRule
    : null;
}

function addDayKey(dayKey: string) {
  const date = new Date(`${dayKey}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function weekdayForDayKey(dayKey: string) {
  return new Date(`${dayKey}T12:00:00.000Z`).getUTCDay();
}

function occursOnDay(task: AgendaTask, dayKey: string, timezone: string) {
  const base = new Date(task.scheduledAt);
  if (Number.isNaN(base.getTime())) return false;

  const baseDayKey = formatInTimeZone(base, timezone, "yyyy-MM-dd");
  if (dayKey < baseDayKey) return false;

  const rule = recurrenceRule(task.recurrenceRule);
  if (!rule) return dayKey === baseDayKey;

  if (rule.until) {
    const until = new Date(rule.until);
    if (!Number.isNaN(until.getTime()) && dayKey > formatInTimeZone(until, timezone, "yyyy-MM-dd")) return false;
  }

  if (rule.frequency === "DAILY") return true;
  if (rule.frequency === "WEEKLY") {
    const weekdays = Array.isArray(rule.weekdays)
      ? rule.weekdays.filter((value) => Number.isInteger(value) && value >= 0 && value <= 6)
      : [];
    const baseWeekday = weekdayForDayKey(baseDayKey);
    return (weekdays.length > 0 ? weekdays : [baseWeekday]).includes(weekdayForDayKey(dayKey));
  }
  if (rule.frequency === "MONTHLY") return dayKey.slice(8, 10) === baseDayKey.slice(8, 10);
  return dayKey === baseDayKey;
}

export function expandAgendaTaskOccurrences(
  tasks: AgendaTask[],
  rangeStart: Date,
  rangeEnd: Date,
  timezone: string,
) {
  if (rangeEnd < rangeStart) return [];

  const occurrences: AgendaTaskOccurrence[] = [];
  const firstDayKey = formatInTimeZone(rangeStart, timezone, "yyyy-MM-dd");
  const lastDayKey = formatInTimeZone(rangeEnd, timezone, "yyyy-MM-dd");

  for (const task of tasks) {
    const base = new Date(task.scheduledAt);
    if (Number.isNaN(base.getTime())) continue;
    const localTime = formatInTimeZone(base, timezone, "HH:mm:ss.SSS");

    for (let dayKey = firstDayKey; dayKey <= lastDayKey; dayKey = addDayKey(dayKey)) {
      if (!occursOnDay(task, dayKey, timezone)) continue;
      const scheduledAt = fromZonedTime(`${dayKey}T${localTime}`, timezone);
      if (scheduledAt < rangeStart || scheduledAt > rangeEnd) continue;
      occurrences.push({
        id: `${task.id}-${dayKey}`,
        taskId: task.id,
        title: task.title,
        scheduledAt: scheduledAt.toISOString(),
      });
    }
  }

  return occurrences.sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt));
}
