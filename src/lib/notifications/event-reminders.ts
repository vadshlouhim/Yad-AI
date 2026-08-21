import type { SupabaseClient } from "@supabase/supabase-js";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

type EventReminderProfile = {
  userId: string;
  communityId: string;
  timezone?: string | null;
};

type TodayEvent = {
  id: string;
  title: string;
  startDate: string;
  location: string | null;
};

function todayBounds(timezone: string) {
  const dayKey = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
  return {
    dayKey,
    start: fromZonedTime(`${dayKey}T00:00:00.000`, timezone),
    end: fromZonedTime(`${dayKey}T23:59:59.999`, timezone),
  };
}

function formatEventTime(date: string, timezone: string) {
  return formatInTimeZone(new Date(date), timezone, "HH:mm");
}

export async function ensureTodayEventReminderNotifications(
  admin: SupabaseClient,
  { userId, communityId, timezone: rawTimezone }: EventReminderProfile,
) {
  const timezone = rawTimezone || "Europe/Paris";
  const { dayKey, start, end } = todayBounds(timezone);

  const { data: events, error: eventsError } = await admin
    .from("Event")
    .select("id, title, startDate, location")
    .eq("communityId", communityId)
    .neq("status", "ARCHIVED")
    .gte("startDate", start.toISOString())
    .lte("startDate", end.toISOString())
    .order("startDate", { ascending: true });

  if (eventsError || !events || events.length === 0) return;

  const { data: existingNotifications } = await admin
    .from("Notification")
    .select("data")
    .eq("userId", userId)
    .eq("communityId", communityId)
    .eq("type", "EVENT_REMINDER")
    .gte("createdAt", start.toISOString());

  const alreadyNotifiedEventIds = new Set(
    (existingNotifications ?? [])
      .map((notification) => {
        const data = notification.data;
        if (!data || typeof data !== "object" || Array.isArray(data)) return null;
        const eventId = (data as { eventId?: unknown; reminderDate?: unknown }).eventId;
        const reminderDate = (data as { eventId?: unknown; reminderDate?: unknown }).reminderDate;
        return typeof eventId === "string" && reminderDate === dayKey ? eventId : null;
      })
      .filter((eventId): eventId is string => Boolean(eventId)),
  );

  const notifications = (events as TodayEvent[])
    .filter((event) => !alreadyNotifiedEventIds.has(event.id))
    .map((event) => {
      const time = formatEventTime(event.startDate, timezone);
      const location = event.location ? ` Lieu : ${event.location}.` : "";

      return {
        id: `event-today-${dayKey}-${userId}-${event.id}`,
        userId,
        communityId,
        type: "EVENT_REMINDER",
        title: `Événement aujourd'hui : ${event.title}`,
        body: `Votre événement "${event.title}" est prévu aujourd'hui à ${time}.${location}`,
        link: "/dashboard/events",
        data: {
          eventId: event.id,
          reminderDate: dayKey,
          source: "event_today",
        },
      };
    });

  if (notifications.length > 0) {
    await admin.from("Notification").upsert(notifications, { onConflict: "id" });
  }
}
