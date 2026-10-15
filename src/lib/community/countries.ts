export const DEFAULT_COUNTRY = "France" as const;

export const SUPPORTED_COUNTRIES = [
  { value: "France", label: "France", code: "FR" },
  { value: "Belgium", label: "Belgique", code: "BE" },
  { value: "Switzerland", label: "Suisse", code: "CH" },
  { value: "Canada", label: "Canada", code: "CA" },
  { value: "Luxembourg", label: "Luxembourg", code: "LU" },
  { value: "Israel", label: "Israël", code: "IL" },
  { value: "United Kingdom", label: "Royaume-Uni", code: "GB" },
  { value: "United States", label: "États-Unis", code: "US" },
  { value: "Monaco", label: "Monaco", code: "MC" },
  { value: "Germany", label: "Allemagne", code: "DE" },
  { value: "Spain", label: "Espagne", code: "ES" },
  { value: "Italy", label: "Italie", code: "IT" },
  { value: "Portugal", label: "Portugal", code: "PT" },
  { value: "Netherlands", label: "Pays-Bas", code: "NL" },
  { value: "Austria", label: "Autriche", code: "AT" },
  { value: "Ireland", label: "Irlande", code: "IE" },
  { value: "Morocco", label: "Maroc", code: "MA" },
  { value: "Tunisia", label: "Tunisie", code: "TN" },
  { value: "Algeria", label: "Algérie", code: "DZ" },
] as const;

export type SupportedCountry = (typeof SUPPORTED_COUNTRIES)[number]["value"];

const countryByValue = new Map<string, (typeof SUPPORTED_COUNTRIES)[number]>(
  SUPPORTED_COUNTRIES.map((country) => [country.value, country]),
);

export function isSupportedCountry(value: unknown): value is SupportedCountry {
  return typeof value === "string" && countryByValue.has(value);
}

export function normalizeSupportedCountry(value: unknown): SupportedCountry {
  return isSupportedCountry(value) ? value : DEFAULT_COUNTRY;
}

export function countryCodeForName(value: unknown) {
  return isSupportedCountry(value) ? countryByValue.get(value)?.code ?? null : null;
}

export function withRegistrationCountry(
  path: string,
  value: unknown,
): string {
  const url = new URL(path, "https://registration.local");
  url.searchParams.set("country", normalizeSupportedCountry(value));
  return `${url.pathname}${url.search}${url.hash}`;
}
