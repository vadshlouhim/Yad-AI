import { resolveShabbatLocation } from "./city-location";
// ============================================================
// EasyCom IA — Intégration Hebcal
// Calendrier hébraïque, horaires Chabbat, fêtes
// API gratuite : https://www.hebcal.com/home/195/jewish-calendar-rest-api
// ============================================================

export interface ShabbatTimes {
  cityName?: string;
  timezone?: string;
  countryCode?: string;
  date: string;          // YYYY-MM-DD
  hebrewDate: string;    // Date hébraïque en texte
  parasha: string;       // Nom de la paracha
  entry: string;         // Heure d'entrée (HH:mm)
  exit: string;          // Heure de sortie (HH:mm)
  candleLighting: string; // Allumage des bougies
  havdalah: string;       // Havdalah
}

export type UpcomingShabbatTimes = ShabbatTimes;

export interface JewishHoliday {
  date: string;
  hebrewDate: string;
  name: string;
  nameHebrew: string;
  category: string;  // "holiday", "roshchodesh", etc.
  subcat?: string;
  memo?: string;
  link?: string;
}

export interface HolidayTimes {
  entry: string | null;
  exit: string | null;
}

const HEBCAL_API = process.env.HEBCAL_API_URL ?? "https://www.hebcal.com/hebcal";
const HAVDALAH_MINUTES = 63;

// ============================================================
// HORAIRES CHABBAT
// ============================================================

export async function getShabbatTimes(params: {
  city?: string; country?: string; latitude?: number; longitude?: number; timezone?: string; date?: Date;
}): Promise<ShabbatTimes | null> {
  return (await getUpcomingShabbatTimes({ ...params, count: 1 }))[0] ?? null;
}

/**
 * Charge les prochains horaires de Chabbat directement depuis l'API REST Hebcal.
 * La source locale peut ensuite servir de secours, mais les heures affichées restent
 * ainsi à jour pour la ville configurée par la communauté.
 */
export async function getUpcomingShabbatTimes(params: {
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  date?: Date;
  count?: number;
}): Promise<UpcomingShabbatTimes[]> {
  try {
    const { city, latitude, longitude, timezone = "Europe/Paris", date = new Date(), count = 8 } = params;
    const explicitCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
    const location = explicitCoordinates ? { latitude: latitude!, longitude: longitude!, timezone, cityName: city ?? "Coordonnées choisies", countryCode: params.country === "IL" ? "IL" : "FR" } : await resolveShabbatLocation(city, params.country);
    const friday = getNextFriday(date, location.timezone);
    const end = new Date(friday);
    end.setDate(end.getDate() + Math.max(count * 8, 14));

    const searchParams = new URLSearchParams({
      v: "1",
      cfg: "json",
      maj: "on",
      min: "off",
      mod: "off",
      nx: "off",
      ss: "on",
      c: "on",
      s: "on",
      D: "on",
      b: "18",
      m: HAVDALAH_MINUTES.toString(),
      i: location.countryCode === "IL" ? "on" : "off",
      lg: "fr",
      start: friday.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    });

    searchParams.set("geo", "pos");
    searchParams.set("latitude", location.latitude.toString());
    searchParams.set("longitude", location.longitude.toString());
    searchParams.set("tzid", location.timezone);

    const response = await fetch(`${HEBCAL_API}?${searchParams.toString()}`, {
      next: { revalidate: 3600 },
    });
    if (!response.ok) return [];

    const data = await response.json() as {
      items?: Array<{ category?: string; date?: string; title?: string; hdate?: string; yomtov?: boolean }>;
    };
    const entries = new Map<string, { candleLighting?: string; havdalah?: string; parasha?: string; hebrewDate?: string }>();
    const getEntry = (key: string) => {
      const current = entries.get(key) ?? {};
      entries.set(key, current);
      return current;
    };

    for (const item of data.items ?? []) {
      if (!item.date) continue;
      const itemDate = item.date.slice(0, 10);
      const day = new Date(`${itemDate}T12:00:00Z`).getUTCDay();
      if (item.category === "candles" && day === 5) getEntry(itemDate).candleLighting = formatTime(item.date, location.timezone);
      if (day !== 6) continue;
      const entry = getEntry(previousDay(itemDate));
      // On a Saturday leading into Yom Tov, the after-nightfall candles mark the transition, not the end of the festival.
      if (item.category === "havdalah" || item.category === "candles") entry.havdalah = formatTime(item.date, location.timezone);
      if (item.hdate) entry.hebrewDate = item.hdate;
      if (item.category === "parashat") entry.parasha = item.title;
      else if (item.category === "holiday" && item.yomtov && !entry.parasha) entry.parasha = item.title;
    }

    return Array.from(entries.entries())
      .filter(([, entry]) => Boolean(entry.candleLighting))
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(0, count)
      .map(([dateKey, entry]) => ({
        date: dateKey,
        cityName: location.cityName,
        timezone: location.timezone,
        countryCode: location.countryCode,
        hebrewDate: entry.hebrewDate ?? "",
        parasha: entry.parasha ?? "",
        entry: entry.candleLighting ?? "",
        exit: entry.havdalah ?? "",
        candleLighting: entry.candleLighting ?? "",
        havdalah: entry.havdalah ?? "",
      }));
  } catch (error) {
    console.error("[Hebcal] Erreur getUpcomingShabbatTimes:", error);
    return [];
  }
}

// ============================================================
// FÊTES JUIVES
// ============================================================

export async function getJewishHolidays(params: {
  year?: number;
  months?: number;
}): Promise<JewishHoliday[]> {
  try {
    const { year = new Date().getFullYear() } = params;

    const searchParams = new URLSearchParams({
      v: "1",
      cfg: "json",
      year: year.toString(),
      maj: "on",   // Major holidays
      min: "off",
      nx: "off",
      mf: "on",
      ss: "off",
      c: "off",
      i: "off",
      lg: "fr",
    });

    const response = await fetch(`${HEBCAL_API}?${searchParams.toString()}`, {
      next: { revalidate: 86400 }, // Cache 24h
    });

    if (!response.ok) return [];

    const data = await response.json();
    if (!data.items) return [];

    return data.items
      .filter((item: { category: string }) => item.category === "holiday")
      .map((item: {
        date: string;
        hdate?: string;
        title: string;
        hebrew?: string;
        category: string;
        subcat?: string;
        memo?: string;
        link?: string;
      }) => ({
        date: item.date,
        hebrewDate: item.hdate ?? "",
        name: item.title,
        nameHebrew: item.hebrew ?? "",
        category: item.category,
        subcat: item.subcat,
        memo: item.memo,
        link: item.link,
      }));
  } catch (error) {
    console.error("[Hebcal] Erreur getHolidays:", error);
    return [];
  }
}

export async function getHolidayTimes(params: {
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  date: string;
}): Promise<HolidayTimes | null> {
  try {
    const { city, latitude, longitude, timezone = "Europe/Paris", date } = params;
    const targetDate = new Date(`${date}T12:00:00`);
    const start = new Date(targetDate);
    start.setDate(start.getDate() - 1);
    const end = new Date(targetDate);
    end.setDate(end.getDate() + 2);

    const searchParams = new URLSearchParams({
      v: "1",
      cfg: "json",
      maj: "on",
      min: "off",
      mod: "off",
      nx: "off",
      year: targetDate.getFullYear().toString(),
      c: "on",
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
      b: "18",
      m: HAVDALAH_MINUTES.toString(),
      i: "off",
      lg: "fr",
    });

    const location = Number.isFinite(latitude) && Number.isFinite(longitude)
      ? { latitude: latitude!, longitude: longitude!, timezone, countryCode: params.country === "IL" ? "IL" : "FR" }
      : await resolveShabbatLocation(city, params.country);
    searchParams.set("geo", "pos");
    searchParams.set("latitude", location.latitude.toString());
    searchParams.set("longitude", location.longitude.toString());
    searchParams.set("tzid", location.timezone);
    searchParams.set("i", location.countryCode === "IL" ? "on" : "off");

    const response = await fetch(`${HEBCAL_API}?${searchParams.toString()}`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const items = Array.isArray(data.items) ? data.items : [];
    if (!items.length) {
      return null;
    }

    const targetKey = date;
    const candlesOnTargetDate = items.find(
      (item: { category?: string; date?: string }) =>
        item.category === "candles" && item.date?.slice(0, 10) === targetKey
    );
    const havdalahOnTargetDate = items.find(
      (item: { category?: string; date?: string }) =>
        item.category === "havdalah" && item.date?.slice(0, 10) === targetKey
    );

    const holidayIndices = items
      .map((item: { category?: string; date?: string }, index: number) => ({
        category: item.category,
        date: item.date?.slice(0, 10),
        index,
      }))
      .filter((item: { category?: string; date?: string; index: number }) => item.category === "holiday" && item.date === targetKey)
      .map((item: { index: number }) => item.index);

    const startIndex = holidayIndices[0] ?? 0;
    const endIndex = holidayIndices[holidayIndices.length - 1] ?? startIndex;

    let entry: string | null = null;
    let exit: string | null = null;

    if (candlesOnTargetDate?.date) {
      entry = formatTime(candlesOnTargetDate.date, location.timezone);
    } else {
      for (let index = startIndex; index >= 0; index -= 1) {
        const item = items[index];
        if (item.category === "candles") {
          entry = formatTime(item.date, location.timezone);
          break;
        }
      }
    }

    if (havdalahOnTargetDate?.date) {
      exit = formatTime(havdalahOnTargetDate.date, location.timezone);
    } else {
      for (let index = endIndex; index < items.length; index += 1) {
        const item = items[index];
        if (item.category === "havdalah") {
          exit = formatTime(item.date, location.timezone);
          break;
        }
      }
    }

    return { entry, exit };
  } catch (error) {
    console.error("[Hebcal] Erreur getHolidayTimes:", error);
    return null;
  }
}

// ============================================================
// PROCHAINE FÊTE
// ============================================================

export async function getNextHoliday(): Promise<JewishHoliday | null> {
  const holidays = await getJewishHolidays({ year: new Date().getFullYear() });
  const now = new Date();

  const upcoming = holidays.filter((h) => new Date(h.date) > now);
  return upcoming[0] ?? null;
}

// ============================================================
// HELPERS
// ============================================================

export function getNextFriday(from: Date, timezone = "Europe/Paris"): Date {
  const localDate = from.toLocaleDateString("en-CA", { timeZone: timezone });
  const date = new Date(`${localDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + (5 - date.getUTCDay() + 7) % 7);
  return date;
}

function formatTime(isoDateTime: string, timezone = "Europe/Paris"): string {
  const date = new Date(isoDateTime);
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });
}

function previousDay(date: string) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
}
