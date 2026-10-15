import {
  getPublicToolDestination,
  getToolOnboardingPath,
} from "@/lib/public-tools";

const DEFAULT_POST_LOGIN_PATH = "/dashboard";
const DEFAULT_POST_REGISTER_PATH = "/onboarding";

function isSafeRelativePath(value: string): boolean {
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u0020]/.test(value)
  )
    return false;
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || /[\\\u0000-\u001f]/.test(decoded))
      return false;
    return new URL(value, "https://auth.local").origin === "https://auth.local";
  } catch {
    return false;
  }
}

// Only catalogue destinations may survive the new public discovery journey.
export function getAuthToolDestination(
  value: string | null | undefined,
): string | null {
  if (!value || !isSafeRelativePath(value)) return null;
  const direct = getPublicToolDestination(value);
  if (direct) return direct;
  const url = new URL(value, "https://auth.local");
  return url.pathname === "/onboarding"
    ? getPublicToolDestination(url.searchParams.get("callbackUrl"))
    : null;
}

export function getPostAuthDestination(
  next: string,
  hasCommunity: boolean,
): string {
  const toolDestination = getAuthToolDestination(next);
  if (toolDestination)
    return hasCommunity
      ? toolDestination
      : preserveOnboardingRegistrationParams(next, toolDestination);
  if (!hasCommunity) {
    const normalizedNext = normalizeAuthNextPath(
      next,
      DEFAULT_POST_REGISTER_PATH,
    );
    const url = new URL(normalizedNext, "https://auth.local");
    if (url.pathname === "/onboarding") return normalizedNext;
  }
  return hasCommunity
    ? normalizeAuthNextPath(next)
    : DEFAULT_POST_REGISTER_PATH;
}

function preserveOnboardingRegistrationParams(
  next: string,
  toolDestination: string,
): string {
  const destination = new URL(
    getToolOnboardingPath(toolDestination),
    "https://auth.local",
  );
  const requested = new URL(
    normalizeAuthNextPath(next, DEFAULT_POST_REGISTER_PATH),
    "https://auth.local",
  );
  const country = requested.searchParams.get("country");
  if (country) destination.searchParams.set("country", country);
  return `${destination.pathname}${destination.search}`;
}

export function normalizeAuthNextPath(
  value: string | null | undefined,
  fallback = DEFAULT_POST_LOGIN_PATH,
): string {
  if (!value || !isSafeRelativePath(value)) {
    return fallback;
  }

  return value;
}

export function buildAuthCallbackUrl(
  origin: string,
  nextPath: string | null | undefined,
  fallback = DEFAULT_POST_LOGIN_PATH,
): string {
  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set(
    "next",
    normalizeAuthNextPath(nextPath, fallback),
  );
  return callbackUrl.toString();
}

export { DEFAULT_POST_LOGIN_PATH, DEFAULT_POST_REGISTER_PATH };
