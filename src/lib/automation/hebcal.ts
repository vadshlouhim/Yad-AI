import { HDate, getSedra } from "@hebcal/core";
import { resolveShabbatLocation } from "./city-location";
import { outputIntlLocale, type OutputLocale } from "@/lib/ai/output-locale";
import { localizedHebrewDateForDate, localizedParasha } from "@/lib/religious/locale";

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
  sourceUrl?: string;
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
const CHABAD_WIDGET_URL = "https://fr.chabad.org/tools/shared/candlelighting/candlelighting.js.asp";
const LOUBAVITCH_TORAH_URL = "https://www.loubavitch.fr/templates/loubavitch_v2/helpers/torah.php";
const HAVDALAH_MINUTES = 63;

const ENGLISH_MONTHS: Record<string, string> = {
  January: "01", February: "02", March: "03", April: "04", May: "05", June: "06",
  July: "07", August: "08", September: "09", October: "10", November: "11", December: "12",
};

const CHABAD_HEBREW_MONTHS: Record<string, string> = {
  Nisan: "Nissan", Iyyar: "Iyar", Sivan: "Sivan", Tamuz: "Tamouz", Av: "Av", Elul: "Eloul",
  Tishrei: "Tichri", Cheshvan: "'Hechvan", Kislev: "Kislev", Tevet: "Tévet", "Sh'vat": "Chevat",
  "Adar I": "Adar I", "Adar II": "Adar II", Adar: "Adar",
};

const CHABAD_PARASHIOT: Record<string, string> = {
  Bereshit: "Béréchit", Noach: "Noa'h", "Lech-Lecha": "Lekh Lekha", Vayera: "Vayéra",
  "Chayei Sara": "'Hayé Sarah", Toldot: "Toldot", Vayetzei: "Vayétsé", Vayishlach: "Vayichla'h",
  Vayeshev: "Vayéchev", Miketz: "Mikets", Vayigash: "Vayigach", Vayechi: "Vayé'hi",
  Shemot: "Chémot", Vaera: "Vaéra", Bo: "Bo", Beshalach: "Bechala'h", Yitro: "Yitro",
  Mishpatim: "Michpatim", Terumah: "Terouma", Tetzaveh: "Tétsavé", "Ki Tisa": "Ki Tissa",
  Vayakhel: "Vayakhel", Pekudei: "Pékoudei", Vayikra: "Vayikra", Tzav: "Tsav", Shmini: "Chemini",
  Tazria: "Tazria", Metzora: "Metsora", "Achrei Mot": "A'harei Mot", Kedoshim: "Kedochim",
  Emor: "Emor", Behar: "Behar", Bechukotai: "Be'houkotaï", Bamidbar: "Bamidbar", Nasso: "Nasso",
  "Beha'alotcha": "Behaalotekha", "Sh'lach": "Chela'h", Korach: "Kora'h", Chukat: "'Houkat", Balak: "Balak",
  Pinchas: "Pin'has", Matot: "Matot", Masei: "Massé", Devarim: "Devarim", Vaetchanan: "Vaet'hanane",
  Eikev: "Ekev", "Re'eh": "Reé", Shoftim: "Choftim", "Ki Teitzei": "Ki Tetsé", "Ki Tavo": "Ki Tavo",
  Nitzavim: "Nitsavim", Vayeilech: "Vayélekh", "Ha'azinu": "Haazinou", "Vezot Haberakhah": "Vezot Haberakha",
  "Pesach Shabbat Chol ha-Moed": "Chabbat 'Hol Hamoëd Pessa'h", Shavuot: "Chavouot",
  "Rosh Hashana": "Roch Hachana", Sukkot: "Souccot", "Shmini Atzeret": "Chemini Atsérète",
};

type ChabadWidgetEvent = { kind: "friday" | "shabbat"; date: string; time: string };

function decodeChabadText(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/\\'/g, "'").replace(/\s+/g, " ").trim();
}

function parseChabadEnglishDate(value: string) {
  const match = value.match(/^(Friday|Shabbat),\s+([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/);
  const month = match ? ENGLISH_MONTHS[match[2]] : null;
  return match && month ? `${match[4]}-${month}-${match[3].padStart(2, "0")}` : null;
}

export function parseChabadShabbatWidget(script: string): ChabadWidgetEvent[] {
  const events: ChabadWidgetEvent[] = [];
  const pattern = /<div class="CLdate">\s*([^<]+)[\s\S]*?<div class="CLTime">([\s\S]*?)<\/div>/gi;
  for (const match of script.matchAll(pattern)) {
    const label = decodeChabadText(match[1]);
    const date = parseChabadEnglishDate(label);
    const time = decodeChabadText(match[2]).match(/(\d{1,2}:\d{2})(?!.*\d{1,2}:\d{2})/)?.[1];
    if (date && time) events.push({ kind: label.startsWith("Friday") ? "friday" : "shabbat", date, time });
  }
  return events;
}

function nextDay(date: string) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

function hdate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new HDate(new Date(year, month - 1, day, 12));
}

function chabadHebrewDate(date: string) {
  const value = hdate(date);
  return `${value.getDate()} ${CHABAD_HEBREW_MONTHS[value.getMonthName()] ?? value.getMonthName()} ${value.getFullYear()}`;
}

function frenchParashaFallback(date: string, israel: boolean) {
  const value = hdate(date);
  return getSedra(value.getFullYear(), israel).lookup(value).parsha.map((name) => CHABAD_PARASHIOT[name] ?? name).join("-");
}

function loubavitchMonth(value: HDate) {
  const month = value.getMonth();
  const leapYear = (7 * value.getFullYear() + 1) % 19 < 7;
  return month >= 7 ? month - 6 : month + (leapYear ? 7 : 6);
}

async function loubavitchParasha(date: string, israel: boolean) {
  const fallback = frenchParashaFallback(date, israel);
  if (israel) return fallback;
  try {
    const value = hdate(date);
    const query = new URLSearchParams({
      day: String(value.getDate()),
      month: String(loubavitchMonth(value)),
      year: String(value.getFullYear()),
    });
    const response = await fetch(`${LOUBAVITCH_TORAH_URL}?${query.toString()}`, {
      headers: { "User-Agent": "EasyCom-IA Torah reading reader" },
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return fallback;
    const result = await response.json() as unknown;
    return typeof result === "string" && result.trim() ? result.trim() : fallback;
  } catch {
    return fallback;
  }
}

function chabadSourceUrl(latitude: number, longitude: number, city: string, timezone: string) {
  return `https://fr.chabad.org/calendar/candlelighting_cdo/coords/${encodeURIComponent(`${latitude},${longitude}`)}/n/${encodeURIComponent(city)}/tzname/${encodeURIComponent(timezone)}/jewish/Candle-Lighting.htm`;
}

// ============================================================
// HORAIRES CHABBAT
// ============================================================

export async function getShabbatTimes(params: {
  city?: string; country?: string; latitude?: number; longitude?: number; timezone?: string; date?: Date; outputLocale?: OutputLocale;
}): Promise<ShabbatTimes | null> {
  return (await getUpcomingShabbatTimes({ ...params, count: 1 }))[0] ?? null;
}

/**
 * Source unique : module officiel Chabad.org personnalisé avec les coordonnées de
 * la ville. Aucun repli silencieux vers un calcul différent n'est autorisé.
 */
export async function getUpcomingShabbatTimes(params: {
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  date?: Date;
  count?: number;
  outputLocale?: OutputLocale;
}): Promise<UpcomingShabbatTimes[]> {
  try {
    const { city, latitude, longitude, timezone = "Europe/Paris", date = new Date(), count = 8, outputLocale = "fr" } = params;
    const explicitCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
    const location = explicitCoordinates ? { latitude: latitude!, longitude: longitude!, timezone, cityName: city ?? "Coordonnées choisies", countryCode: params.country === "IL" ? "IL" : "FR" } : await resolveShabbatLocation(city, params.country);
    const firstFriday = getNextFriday(date, location.timezone);
    const requestedCount = Math.max(1, Math.min(count, 12));
    const responses = await Promise.all(Array.from({ length: Math.ceil(requestedCount / 4) }, (_, index) => {
      const batchDate = new Date(firstFriday);
      batchDate.setUTCDate(batchDate.getUTCDate() + index * 28);
      const query = new URLSearchParams({
        coords: `${location.latitude},${location.longitude}`,
        n: location.cityName,
        tzname: location.timezone,
        ln: "2",
        weeks: String(Math.min(4, requestedCount - index * 4)),
        mid: "4194",
        lang: outputLocale,
        tdate: `${batchDate.getUTCMonth() + 1}/${batchDate.getUTCDate()}/${batchDate.getUTCFullYear()}`,
      });
      return fetch(`${CHABAD_WIDGET_URL}?${query.toString()}`, {
        headers: { "Accept-Language": `${outputIntlLocale(outputLocale)},${outputLocale};q=0.9`, "User-Agent": "EasyCom-IA Shabbat times reader" },
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(8_000),
      });
    }));
    if (responses.some((response) => !response.ok)) return [];
    const events = (await Promise.all(responses.map((response) => response.text()))).flatMap(parseChabadShabbatWidget);
    const sourceUrl = chabadSourceUrl(location.latitude, location.longitude, location.cityName, location.timezone);
    const entries = events.flatMap((event, index) => {
      if (event.kind !== "friday") return [];
      const saturday = events.slice(index + 1).find((candidate) => candidate.kind === "shabbat" && candidate.date === nextDay(event.date));
      if (!saturday) return [];
      return [{
        date: event.date,
        cityName: location.cityName,
        timezone: location.timezone,
        countryCode: location.countryCode,
        hebrewDate: outputLocale === "he" ? localizedHebrewDateForDate(saturday.date, "he") : chabadHebrewDate(saturday.date),
        parasha: outputLocale === "he"
          ? localizedParasha(event.date, "he", "", location.countryCode === "IL")
          : frenchParashaFallback(saturday.date, location.countryCode === "IL"),
        entry: event.time,
        exit: saturday.time,
        candleLighting: event.time,
        havdalah: saturday.time,
        sourceUrl,
      }];
    });
    const uniqueEntries = Array.from(new Map(entries.map((entry) => [entry.date, entry])).values())
      .sort((left, right) => left.date.localeCompare(right.date))
      .slice(0, requestedCount);
    return outputLocale === "he"
      ? uniqueEntries
      : Promise.all(uniqueEntries.map(async (entry) => ({
          ...entry,
          parasha: await loubavitchParasha(nextDay(entry.date), location.countryCode === "IL"),
        })));
  } catch (error) {
    console.error("[Chabad.org] Erreur getUpcomingShabbatTimes:", error);
    return [];
  }
}

// ============================================================
// FÊTES JUIVES
// ============================================================

export async function getJewishHolidays(params: {
  year?: number;
  months?: number;
  outputLocale?: OutputLocale;
}): Promise<JewishHoliday[]> {
  try {
    const { year = new Date().getFullYear(), outputLocale = "fr" } = params;

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
      lg: outputLocale === "he" ? "he-x-NoNikud" : "fr",
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
        hebrewDate: localizedHebrewDateForDate(item.date, outputLocale, item.hdate ?? ""),
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
  outputLocale?: OutputLocale;
}): Promise<HolidayTimes | null> {
  try {
    const { city, latitude, longitude, timezone = "Europe/Paris", date, outputLocale = "fr" } = params;
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
      lg: outputLocale === "he" ? "he-x-NoNikud" : "fr",
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
      entry = formatTime(candlesOnTargetDate.date, location.timezone, outputLocale);
    } else {
      for (let index = startIndex; index >= 0; index -= 1) {
        const item = items[index];
        if (item.category === "candles") {
          entry = formatTime(item.date, location.timezone, outputLocale);
          break;
        }
      }
    }

    if (havdalahOnTargetDate?.date) {
      exit = formatTime(havdalahOnTargetDate.date, location.timezone, outputLocale);
    } else {
      for (let index = endIndex; index < items.length; index += 1) {
        const item = items[index];
        if (item.category === "havdalah") {
          exit = formatTime(item.date, location.timezone, outputLocale);
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

export async function getNextHoliday(outputLocale: OutputLocale = "fr"): Promise<JewishHoliday | null> {
  const holidays = await getJewishHolidays({ year: new Date().getFullYear(), outputLocale });
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

function formatTime(isoDateTime: string, timezone = "Europe/Paris", locale: OutputLocale = "fr"): string {
  const date = new Date(isoDateTime);
  return date.toLocaleTimeString(outputIntlLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });
}
