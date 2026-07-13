import type { createAdminClient } from "@/lib/supabase/admin";

// Persistance de la routine quotidienne (AIMemory RECURRING_CONTENT/daily_routine)
// + synchronisation agenda + règles éditoriales. Partagée entre la route API
// /api/community/daily-routine et l'exécuteur de l'assistant IA.

type Admin = ReturnType<typeof createAdminClient>;

export interface DailyRoutineItem {
  label: string;
  frequency: string;
  channels: string[];
  day?: string;
  time?: string;
  notes?: string;
}

export interface DailyRoutine {
  configured: boolean;
  configuredAt: string;
  summary: string;
  items: DailyRoutineItem[];
}

const DAY_TO_INDEX: Record<string, number> = {
  Dimanche: 0,
  Lundi: 1,
  Mardi: 2,
  Mercredi: 3,
  Jeudi: 4,
  Vendredi: 5,
  Samedi: 6,
};

function toTime24(input?: string | null): string {
  if (!input) return "10:00";
  const cleaned = input.trim().toLowerCase().replace("h", ":");
  const [rawHours, rawMinutes] = cleaned.split(":");
  const hours = Number.parseInt(rawHours ?? "10", 10);
  const minutes = Number.parseInt(rawMinutes ?? "0", 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return "10:00";
  const hh = String(Math.max(0, Math.min(23, hours))).padStart(2, "0");
  const mm = String(Math.max(0, Math.min(59, minutes))).padStart(2, "0");
  return `${hh}:${mm}`;
}

function toStartDateISO(day?: string, time?: string): string {
  const now = new Date();
  const target = new Date(now);
  const dayIndex = day ? DAY_TO_INDEX[day] : undefined;
  if (typeof dayIndex === "number") {
    const delta = (dayIndex - now.getDay() + 7) % 7;
    target.setDate(now.getDate() + delta);
  }

  const [hours, minutes] = toTime24(time).split(":").map((value) => Number.parseInt(value, 10));
  target.setHours(hours, minutes, 0, 0);
  return target.toISOString();
}

function toRecurrenceRule(item: DailyRoutineItem) {
  const frequency = item.frequency.toLowerCase();
  const dayIndex = typeof item.day === "string" ? DAY_TO_INDEX[item.day] : undefined;

  if (frequency.includes("quotidien")) {
    return { freq: "DAILY" };
  }
  if (frequency.includes("mensuel")) {
    return { freq: "MONTHLY" };
  }
  if (frequency.includes("vendredi")) {
    return { freq: "WEEKLY", byday: [5] };
  }
  if (frequency.includes("hebdomadaire") || frequency.includes("bi-mensuel")) {
    return { freq: "WEEKLY", byday: typeof dayIndex === "number" ? [dayIndex] : [] };
  }
  if (frequency.includes("saisonnier")) {
    return { freq: "MONTHLY" };
  }
  if (frequency.includes("avant chaque")) {
    return { freq: "WEEKLY", byday: typeof dayIndex === "number" ? [dayIndex] : [] };
  }

  return { freq: "WEEKLY", byday: typeof dayIndex === "number" ? [dayIndex] : [] };
}

export async function getDailyRoutine(admin: Admin, communityId: string): Promise<DailyRoutine | null> {
  const { data } = await admin
    .from("AIMemory")
    .select("value")
    .eq("communityId", communityId)
    .eq("type", "RECURRING_CONTENT")
    .eq("key", "daily_routine")
    .maybeSingle();
  return (data?.value as DailyRoutine | null) ?? null;
}

export async function saveDailyRoutine(
  admin: Admin,
  communityId: string,
  routine: Partial<DailyRoutine>
): Promise<DailyRoutine> {
  const payload: DailyRoutine = {
    configured: true,
    configuredAt: new Date().toISOString(),
    summary: routine.summary ?? "",
    items: routine.items ?? [],
  };

  await admin.from("AIMemory").upsert(
    {
      id: crypto.randomUUID(),
      communityId,
      type: "RECURRING_CONTENT",
      key: "daily_routine",
      value: payload,
      relevance: 1.5,
      updatedAt: new Date().toISOString(),
    },
    { onConflict: "communityId,type,key" }
  );

  // Synchroniser la routine dans l'agenda client en événements récurrents.
  await admin
    .from("Event")
    .delete()
    .eq("communityId", communityId)
    .ilike("notes", "%AUTO_DAILY_ROUTINE%");

  if (payload.items.length > 0) {
    const routineEvents = payload.items.map((item) => ({
      id: crypto.randomUUID(),
      communityId,
      title: item.label,
      description: item.notes ?? null,
      startDate: toStartDateISO(item.day, item.time),
      endDate: null,
      category: "ANNOUNCEMENT",
      status: "SCHEDULED",
      isRecurring: true,
      recurrenceRule: toRecurrenceRule(item),
      location: null,
      address: null,
      audience: null,
      isPublic: true,
      notes: `AUTO_DAILY_ROUTINE | ${item.frequency} | ${item.channels.join(", ")}`,
      updatedAt: new Date().toISOString(),
    }));
    await admin.from("Event").insert(routineEvents);
  }

  // Mettre à jour editorialRules avec le résumé de la routine
  if (payload.summary) {
    const rulesText = [
      "ROUTINE QUOTIDIENNE :",
      payload.summary,
      "",
      "ACTIONS RÉCURRENTES :",
      ...payload.items.map(
        (item) =>
          `- ${item.label} (${item.frequency}) sur ${item.channels.join(", ")}${item.notes ? ` — ${item.notes}` : ""}`
      ),
    ].join("\n");

    await admin
      .from("Community")
      .update({ editorialRules: rulesText, updatedAt: new Date().toISOString() })
      .eq("id", communityId);
  }

  return payload;
}
