const DEFAULT_POST_LOGIN_PATH = "/dashboard";
const DEFAULT_POST_REGISTER_PATH = "/onboarding";

function isSafeRelativePath(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//");
}

export function normalizeAuthNextPath(
  value: string | null | undefined,
  fallback = DEFAULT_POST_LOGIN_PATH
): string {
  if (!value || !isSafeRelativePath(value)) {
    return fallback;
  }

  return value;
}

export function buildAuthCallbackUrl(
  origin: string,
  nextPath: string | null | undefined,
  fallback = DEFAULT_POST_LOGIN_PATH
): string {
  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("next", normalizeAuthNextPath(nextPath, fallback));
  return callbackUrl.toString();
}

export { DEFAULT_POST_LOGIN_PATH, DEFAULT_POST_REGISTER_PATH };
