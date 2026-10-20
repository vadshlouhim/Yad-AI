import type { NextRequest } from "next/server";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";

export const FUTURE_DEFAULT_LOCALE = "en" as const;

export const FRENCH_SPEAKING_COUNTRIES = new Set([
  "FR", "BE", "CH", "LU", "MC", "MA", "TN", "DZ", "SN", "CI", "CM",
  "MG", "RE", "GP", "MQ", "GF", "YT", "NC", "PF", "HT",
]);

const ROBOT_USER_AGENT = /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|linkedinbot|twitterbot/i;

type RequestWithPlatformGeo = NextRequest & {
  geo?: { country?: string | null };
};

export function primaryBrowserLanguage(value: string | null): string {
  return value?.split(",", 1)[0]?.trim().split(/[-_]/, 1)[0]?.toLowerCase() ?? "";
}

export function visitorCountry(request: NextRequest): string {
  const simulated = process.env.NODE_ENV !== "production"
    ? request.nextUrl.searchParams.get("country")
    : null;
  const country = simulated
    ?? request.headers.get("x-vercel-ip-country")
    ?? request.headers.get("cf-ipcountry")
    ?? request.headers.get("x-nf-country")
    ?? (request as RequestWithPlatformGeo).geo?.country
    ?? "";
  return country.trim().toUpperCase();
}

export function detectVisitorLocale({
  acceptLanguage,
  country,
  userAgent,
}: {
  acceptLanguage: string | null;
  country: string;
  userAgent: string | null;
}): Locale {
  if (ROBOT_USER_AGENT.test(userAgent ?? "")) return DEFAULT_LOCALE;

  const language = primaryBrowserLanguage(acceptLanguage);
  if (language === "he" || language === "iw") return "he";
  if (country === "IL") return "he";
  if (FRENCH_SPEAKING_COUNTRIES.has(country)) return "fr";
  if (country === "CA") return language === "fr" ? "fr" : DEFAULT_LOCALE;
  if (language === "fr") return "fr";
  return DEFAULT_LOCALE;
}

export function detectLocaleFromRequest(request: NextRequest): Locale {
  return detectVisitorLocale({
    acceptLanguage: request.headers.get("accept-language"),
    country: visitorCountry(request),
    userAgent: request.headers.get("user-agent"),
  });
}
