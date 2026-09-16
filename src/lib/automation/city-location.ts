import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeCityName } from "./shabbat-times";

export type ShabbatLocation = { cityName: string; latitude: number; longitude: number; timezone: string; countryCode: string };
export class CityResolutionError extends Error {
  constructor(message: string, public candidates: string[] = []) { super(message); }
}

/** Resolve only an explicit match; never substitute another town. */
export async function resolveShabbatLocation(city?: string | null, country?: string | null): Promise<ShabbatLocation> {
  const input = city?.trim();
  if (!input) throw new CityResolutionError("Indiquez la ville de votre communauté.");
  const name = input.replace(/\s*\(\d{5}\)$/, "").trim();
  const normalized = normalizeCityName(name);
  const { Location } = await import("@hebcal/core");
  const aliases: Record<string, string> = { marseille: "Marseilles", jerusalem: "Jerusalem", londres: "London", "tel aviv": "Tel Aviv", "new york": "New York", montreal: "Montreal", paris: "Paris" };
  const known = Location.lookup(aliases[normalized] ?? name);
  const countries: Record<string, string> = { france: "FR", israel: "IL", canada: "CA", "royaume uni": "GB", "united kingdom": "GB", "etats unis": "US", "united states": "US" };
  const cc = country ? countries[normalizeCityName(country)] ?? country.toUpperCase() : null;
  if (known && (!cc || known.getCountryCode() === cc)) return {
    cityName: known.getShortName() ?? name, latitude: known.getLatitude(), longitude: known.getLongitude(), timezone: known.getTzid(), countryCode: known.getCountryCode() ?? "FR",
  };
  if (cc && cc !== "FR") throw new CityResolutionError("Ville non reconnue dans ce pays. Vérifiez son nom dans les paramètres.");
  const code = input.match(/\((\d{5})\)$/)?.[1];
  const admin = createAdminClient();
  let query = admin.from("FranceCityShabbatSchedule").select("city_code, city_name, latitude, longitude, timezone");
  query = code ? query.eq("city_code", code) : query.ilike("city_name", name.replace(/[%_\\]/g, ""));
  let { data, error } = await query.limit(100);
  if (error) throw new CityResolutionError("Impossible de vérifier cette ville. Réessayez plus tard.");
  if (!data?.length && !code) {
    // Match accent/hyphen variants, then require exact normalized equality below.
    const pattern = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[%_\\]/g, "").replace(/[aeioucy]/gi, "_").replace(/['\s-]+/g, "%");
    const fallback = await admin.from("FranceCityShabbatSchedule").select("city_code, city_name, latitude, longitude, timezone").ilike("city_name", pattern).limit(500);
    data = fallback.data;
    error = fallback.error;
    if (error) throw new CityResolutionError("Impossible de vérifier cette ville. Réessayez plus tard.");
  }
  const matches = Array.from(new Map((data ?? []).filter((row) => normalizeCityName(row.city_name) === normalized).map((row) => [row.city_code, row])).values());
  if (matches.length !== 1) throw new CityResolutionError(matches.length ? "Plusieurs villes correspondent. Choisissez la bonne ville." : "Ville non reconnue. Vérifiez son orthographe dans les paramètres.", matches.map((row) => `${row.city_name} (${row.city_code})`));
  const row = matches[0];
  return { cityName: row.city_name, latitude: row.latitude, longitude: row.longitude, timezone: row.timezone, countryCode: "FR" };
}
