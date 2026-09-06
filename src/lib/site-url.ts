const DEFAULT_SITE_URL = "https://easycom-ai.com";

function normalizeSiteUrl(value: string) {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export const SITE_URL = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? DEFAULT_SITE_URL
);

export function absoluteUrl(pathname: string) {
  return new URL(pathname, `${SITE_URL}/`).toString();
}
