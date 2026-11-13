import assert from "node:assert/strict";
import { fromZonedTime } from "date-fns-tz";
import { expandAgendaTaskOccurrences } from "../src/lib/agenda/task-occurrences";

const timezone = "Europe/Paris";
const rangeStart = fromZonedTime("2026-11-13T00:00:00", timezone);
const rangeEnd = fromZonedTime("2026-12-13T23:59:59", timezone);
const tasks = [
  {
    id: "single",
    title: "Tâche simple",
    scheduledAt: fromZonedTime("2026-11-20T09:30:00", timezone).toISOString(),
    recurrenceRule: null,
  },
  {
    id: "daily",
    title: "Tâche quotidienne",
    scheduledAt: fromZonedTime("2026-11-13T08:00:00", timezone).toISOString(),
    recurrenceRule: {
      frequency: "DAILY" as const,
      until: fromZonedTime("2026-11-15T23:59:59", timezone).toISOString(),
    },
  },
  {
    id: "weekly",
    title: "Tâche hebdomadaire",
    scheduledAt: fromZonedTime("2026-11-13T10:00:00", timezone).toISOString(),
    recurrenceRule: { frequency: "WEEKLY" as const, weekdays: [5] },
  },
  {
    id: "monthly",
    title: "Tâche mensuelle",
    scheduledAt: fromZonedTime("2026-10-20T11:00:00", timezone).toISOString(),
    recurrenceRule: { frequency: "MONTHLY" as const },
  },
];

const occurrences = expandAgendaTaskOccurrences(tasks, rangeStart, rangeEnd, timezone);

assert.equal(occurrences.filter((item) => item.taskId === "single").length, 1);
assert.equal(occurrences.filter((item) => item.taskId === "daily").length, 3);
assert.equal(occurrences.filter((item) => item.taskId === "weekly").length, 5);
assert.equal(occurrences.filter((item) => item.taskId === "monthly").length, 1);
assert.equal(
  occurrences.find((item) => item.taskId === "single")?.scheduledAt,
  fromZonedTime("2026-11-20T09:30:00", timezone).toISOString(),
);

console.log(`Newsletter tasks: ${occurrences.length} occurrences simples et récurrentes validées.`);
