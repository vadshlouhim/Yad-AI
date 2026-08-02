import { createHash, timingSafeEqual } from "node:crypto";

export const DEMO_ACCESS_COOKIE = "easycom_demo_access";
export const DEMO_ACCESS_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function configuredToken() {
  return process.env.DEMO_ACCESS_TOKEN?.trim() ?? "";
}

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

function safeEqual(left: string, right: string) {
  return timingSafeEqual(digest(left), digest(right));
}

export function isDemoAccessConfigured() {
  return configuredToken().length >= 32;
}

export function isValidDemoAccessToken(candidate: string) {
  const token = configuredToken();
  return token.length >= 32 && candidate.length >= 32 && safeEqual(candidate, token);
}

export function demoAccessCookieValue() {
  const token = configuredToken();
  if (token.length < 32) return "";
  return createHash("sha256").update(`easycom-demo:${token}`).digest("hex");
}

export function isValidDemoAccessCookie(candidate: string | undefined) {
  const expected = demoAccessCookieValue();
  return Boolean(candidate && expected && safeEqual(candidate, expected));
}
