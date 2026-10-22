import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { getJewishHolidays, getUpcomingShabbatTimes } from "@/lib/automation/hebcal";

type CommunityLocation = {
  city?: string | null;
  country?: string | null;
  timezone?: string | null;
};

export type PublishTimeResolution = {
  requestedAt: Date;
  publishAt: Date;
  adjusted: boolean;
  reason: "shabbat" | "holiday" | null;
};

function localDateKey(date: Date, timezone: string) {
  const local = toZonedTime(date, timezone);
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
}

function zonedDate(date: string, time: string, timezone: string) {
  return fromZonedTime(`${date}T${time}:00`, timezone);
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/**
 * Resolves a requested send time against the community's Chabbat and Yom Tov
 * calendar. The same helper is used when scheduling and immediately before a
 * queued publication is sent.
 */
export async function resolveAllowedPublishTime(
  requestedAt: Date,
  community: CommunityLocation,
): Promise<PublishTimeResolution> {
  const timezone = community.timezone || "Europe/Paris";
  const requestedKey = localDateKey(requestedAt, timezone);
  const shabbatEntries = await getUpcomingShabbatTimes({
    city: community.city ?? undefined,
    country: community.country ?? undefined,
    timezone,
    date: new Date(requestedAt.getTime() - 7 * 86_400_000),
    count: 3,
  });

  for (const entry of shabbatEntries) {
    const startsAt = zonedDate(entry.date, entry.entry, timezone);
    const endsAt = zonedDate(addDays(entry.date, 1), entry.exit, timezone);
    if (requestedAt >= startsAt && requestedAt <= endsAt) {
      return { requestedAt, publishAt: endsAt, adjusted: true, reason: "shabbat" };
    }
  }

  // Major Yom Tov days are treated as fully protected. Contiguous festival
  // dates are skipped together; publication resumes at 19:00 on the next day.
  const years = Array.from(new Set([requestedAt.getFullYear() - 1, requestedAt.getFullYear(), requestedAt.getFullYear() + 1]));
  const holidays = (await Promise.all(years.map((year) => getJewishHolidays({ year })))).flat();
  const protectedDates = new Set(holidays.map((holiday) => holiday.date));
  if (protectedDates.has(requestedKey)) {
    let nextDate = requestedKey;
    while (protectedDates.has(nextDate)) nextDate = addDays(nextDate, 1);
    return {
      requestedAt,
      publishAt: zonedDate(nextDate, "19:00", timezone),
      adjusted: true,
      reason: "holiday",
    };
  }

  return { requestedAt, publishAt: requestedAt, adjusted: false, reason: null };
}
