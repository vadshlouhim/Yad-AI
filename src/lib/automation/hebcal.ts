// ============================================================
// Yad.ia — Intégration Hebcal
// Calendrier hébraïque, horaires Chabbat, fêtes
// API gratuite : https://www.hebcal.com/home/195/jewish-calendar-rest-api
// ============================================================

export interface ShabbatTimes {
  date: string;          // YYYY-MM-DD
  hebrewDate: string;    // Date hébraïque en texte
  parasha: string;       // Nom de la paracha
  entry: string;         // Heure d'entrée (HH:mm)
  exit: string;          // Heure de sortie (HH:mm)
  candleLighting: string; // Allumage des bougies
  havdalah: string;       // Havdalah
}

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

const HEBCAL_API = process.env.HEBCAL_API_URL ?? "https://www.hebcal.com/hebcal";

// ============================================================
// HORAIRES CHABBAT
// ============================================================

export async function getShabbatTimes(params: {
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  date?: Date;
}): Promise<ShabbatTimes | null> {
  try {
    const { city, latitude, longitude, timezone = "Europe/Paris", date = new Date() } = params;

    // Trouver le prochain vendredi
    const friday = getNextFriday(date);
    const year = friday.getFullYear();
    const month = friday.getMonth() + 1;

    const searchParams = new URLSearchParams({
      v: "1",
      cfg: "json",
      maj: "off",
      min: "off",
      mod: "off",
      nx: "off",
      year: year.toString(),
      month: month.toString(),
      ss: "on",     // Chabbat times
      mf: "on",     // Minor fasts
      c: "on",      // Candle lighting
      start: friday.toISOString().split("T")[0],
      end: new Date(friday.getTime() + 86400000).toISOString().split("T")[0],
      b: "18",      // Minutes avant coucher soleil
      M: "on",      // Havdalah 50 minutes
      s: "on",      // Sedrot (paracha)
      i: "off",
      lg: "fr",
    });

    // Géolocalisation
    if (latitude && longitude) {
      searchParams.set("geo", "pos");
      searchParams.set("latitude", latitude.toString());
      searchParams.set("longitude", longitude.toString());
      searchParams.set("tzid", timezone);
    } else if (city) {
      searchParams.set("geo", "city");
      searchParams.set("city", getCityGeoId(city));
    } else {
      // Paris par défaut
      searchParams.set("geo", "city");
      searchParams.set("city", "Paris");
    }

    const response = await fetch(`${HEBCAL_API}?${searchParams.toString()}`, {
      next: { revalidate: 3600 }, // Cache 1h
    });

    if (!response.ok) {
      console.error("[Hebcal] Erreur API:", response.status);
      return null;
    }

    const data = await response.json();
    if (!data.items || data.items.length === 0) return null;

    // Parser les items
    let candleLighting: string | null = null;
    let havdalah: string | null = null;
    let parasha: string | null = null;
    let hebrewDate: string | null = null;

    for (const item of data.items) {
      if (item.category === "candles") {
        candleLighting = formatTime(item.date);
      } else if (item.category === "havdalah") {
        havdalah = formatTime(item.date);
      } else if (item.category === "parashat") {
        parasha = item.title;
        hebrewDate = item.hdate ?? "";
      }
    }

    if (!candleLighting) return null;

    return {
      date: friday.toISOString().split("T")[0],
      hebrewDate: hebrewDate ?? "",
      parasha: parasha ?? "",
      entry: candleLighting,
      exit: havdalah ?? "",
      candleLighting: candleLighting,
      havdalah: havdalah ?? "",
    };
  } catch (error) {
    console.error("[Hebcal] Erreur getShabbatTimes:", error);
    return null;
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
    const { year = new Date().getFullYear(), months = 12 } = params;

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

function getNextFriday(from: Date): Date {
  const date = new Date(from);
  const day = date.getDay();
  const daysUntilFriday = (5 - day + 7) % 7 || 7;
  date.setDate(date.getDate() + daysUntilFriday);
  return date;
}

function formatTime(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
}

function getCityGeoId(city: string): string {
  const cityMap: Record<string, string> = {
    paris: "Paris",
    "paris 1": "Paris",
    lyon: "Lyon",
    marseille: "Marseille",
    toulouse: "Toulouse",
    nice: "Nice",
    strasbourg: "Strasbourg",
    bordeaux: "Bordeaux",
    jerusalem: "Jerusalem",
    "tel aviv": "Tel_Aviv",
    new_york: "New_York",
    london: "London",
  };

  return cityMap[city.toLowerCase()] ?? "Paris";
}
