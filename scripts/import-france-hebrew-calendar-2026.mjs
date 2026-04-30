import { createClient } from "@supabase/supabase-js";
import { HebrewCalendar, Location } from "@hebcal/core";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(filename) {
  const path = resolve(process.cwd(), filename);
  if (!existsSync(path)) return;

  const content = readFileSync(path, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const YEAR = 2026;
const COUNTRY = "France";
const TIMEZONE = "Europe/Paris";
const HOLIDAYS_SOURCE_URL = "https://www.hebcal.com/home/195/jewish-calendar-rest-api";
const COMMUNES_URL = "https://geo.api.gouv.fr/communes?fields=nom,code,centre&format=json&geometry=centre";
const BATCH_SIZE = 200;

const argMap = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const cleaned = arg.replace(/^--/, "");
    const [key, value = "true"] = cleaned.split("=");
    return [key, value];
  })
);

const limit = Number(argMap.limit ?? 0) || null;
const holidaysOnly = argMap["holidays-only"] === "true";

function formatLocalDate(date) {
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function parseSchedule(city) {
  const location = new Location(
    city.latitude,
    city.longitude,
    false,
    TIMEZONE,
    city.city_name,
    "FR"
  );

  const events = HebrewCalendar.calendar({
    year: YEAR,
    isHebrewYear: false,
    candlelighting: true,
    location,
    sedrot: true,
    addHebrewDatesForEvents: true,
    havdalahMins: 42,
  });

  const schedule = [];
  let current = null;

  for (const ev of events) {
    const desc = ev.render?.("en") ?? ev.desc ?? "";
    const greg = ev.getDate?.().greg?.();
    const hebrewDate = ev.getDate?.().toString?.() ?? null;

    if (!greg) continue;

    if (desc.startsWith("Candle lighting:")) {
      current = {
        gregorian_date: formatLocalDate(greg),
        hebrew_date: hebrewDate,
        parasha: null,
        shabbat_entry_time: ev.eventTimeStr ?? null,
        shabbat_exit_time: null,
      };
      continue;
    }

    if (desc.startsWith("Parashat ") && current) {
      current.parasha = desc.replace(/^Parashat\s+/, "").trim();
      continue;
    }

    if (desc.startsWith("Havdalah") && current) {
      current.shabbat_exit_time = ev.eventTimeStr ?? null;
      schedule.push(current);
      current = null;
    }
  }

  return schedule;
}

async function fetchFrenchCommunes() {
  const response = await fetch(COMMUNES_URL);
  if (!response.ok) {
    throw new Error(`Unable to fetch communes (${response.status})`);
  }

  const communes = await response.json();
  return communes
    .filter((commune) => Array.isArray(commune.centre?.coordinates))
    .map((commune) => ({
      city_code: commune.code,
      city_name: commune.nom,
      latitude: commune.centre.coordinates[1],
      longitude: commune.centre.coordinates[0],
    }));
}

async function importHolidays() {
  const params = new URLSearchParams({
    v: "1",
    cfg: "json",
    year: String(YEAR),
    maj: "on",
    min: "off",
    nx: "off",
    mf: "on",
    ss: "off",
    c: "off",
    i: "off",
    lg: "fr",
  });

  const response = await fetch(`https://www.hebcal.com/hebcal?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Unable to fetch holidays (${response.status})`);
  }

  const data = await response.json();
  const holidays = (data.items ?? [])
    .filter((item) => item.category === "holiday")
    .map((item) => ({
      country: COUNTRY,
      city: null,
      calendar_year: YEAR,
      gregorian_date: item.date,
      hebrew_date: item.hdate ?? null,
      entry_type: "HOLIDAY",
      shabbat_entry_time: null,
      shabbat_exit_time: null,
      parasha: null,
      holiday_name: item.title ?? null,
      holiday_name_hebrew: item.hebrew ?? null,
      source_provider: "hebcal-api",
      source_url: item.link ?? HOLIDAYS_SOURCE_URL,
      notes: null,
    }));

  await supabase
    .from("HebrewCalendarReference")
    .delete()
    .eq("country", COUNTRY)
    .eq("calendar_year", YEAR)
    .eq("entry_type", "HOLIDAY")
    .eq("source_provider", "hebcal-api");

  for (let index = 0; index < holidays.length; index += 500) {
    const chunk = holidays.slice(index, index + 500);
    const { error } = await supabase.from("HebrewCalendarReference").insert(chunk);
    if (error) {
      throw error;
    }
  }

  console.log(`Imported ${holidays.length} holiday rows`);
}

async function importCitySchedules() {
  const communes = await fetchFrenchCommunes();
  const selected = limit ? communes.slice(0, limit) : communes;

  console.log(`Preparing Shabbat schedules for ${selected.length} French communes`);

  const rows = selected.map((city) => ({
    ...city,
    year: YEAR,
    timezone: TIMEZONE,
    shabbat_schedule: parseSchedule(city),
    source_provider: "hebcal-core",
    source_url: HOLIDAYS_SOURCE_URL,
  }));

  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    const chunk = rows.slice(index, index + BATCH_SIZE);
    const { error } = await supabase
      .from("FranceCityShabbatSchedule")
      .upsert(chunk, { onConflict: "city_code,year" });

    if (error) {
      throw error;
    }

    console.log(`Upserted ${Math.min(index + BATCH_SIZE, rows.length)}/${rows.length} city schedules`);
  }
}

await importHolidays();

if (!holidaysOnly) {
  await importCitySchedules();
}

console.log("Import completed");
