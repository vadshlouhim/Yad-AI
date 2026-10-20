import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { updateSession } from "@/lib/supabase/session";
import { DEMO_ACCESS_COOKIE, isValidDemoAccessCookie } from "@/lib/demo/access";
import { normalizeAuthNextPath } from "@/lib/supabase/auth-redirect";
import {
  isSupportedLocale,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_COOKIE_NAME,
  LOCALE_SOURCE_AUTO,
  LOCALE_SOURCE_COOKIE_NAME,
} from "@/i18n/config";
import { detectLocaleFromRequest } from "@/lib/locale-detection";

const PUBLIC_ROUTES = [
  "/",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/callback",
  "/auth/error",
  "/dashboard/email/oauth-done",
  "/dashboard/google-reviews/oauth-done",
  "/method",
  "/affiches",
  "/contact",
  "/blog",
  "/tarification",
  "/fonctionnalites-a-venir",
  "/privacy",
  "/data-deletion",
  "/help",
  "/site-map",
  "/sitemap.xml",
  "/robots.txt",
  "/llms.txt",
  "/agents",
  "/legal",
  "/communication",
];

function isPublicRoute(pathname: string): boolean {
  if (/^\/google[a-z0-9_-]+\.html$/i.test(pathname)) return true;
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

function redirectWithSession(url: URL, supabaseResponse: NextResponse) {
  const response = NextResponse.redirect(url);
  for (const cookie of supabaseResponse.cookies.getAll()) {
    response.cookies.set(cookie);
  }
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = supabaseResponse.headers.get(header);
    if (value !== null) response.headers.set(header, value);
  }
  return response;
}

function hasSupabaseSessionCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"));
}

function prepareAutomaticLocale(request: NextRequest) {
  const savedLocale = request.cookies.get(LOCALE_COOKIE_NAME)?.value;
  if (isSupportedLocale(savedLocale) || hasSupabaseSessionCookie(request)) return null;

  const locale = detectLocaleFromRequest(request);
  request.cookies.set(LOCALE_COOKIE_NAME, locale);
  request.cookies.set(LOCALE_SOURCE_COOKIE_NAME, LOCALE_SOURCE_AUTO);
  return locale;
}

function withAutomaticLocale(response: NextResponse, locale: ReturnType<typeof prepareAutomaticLocale>) {
  if (!locale) return response;
  const options = {
    maxAge: LOCALE_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
  response.cookies.set(LOCALE_COOKIE_NAME, locale, options);
  response.cookies.set(LOCALE_SOURCE_COOKIE_NAME, LOCALE_SOURCE_AUTO, options);
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Entrée privée : le Route Handler valide le secret puis pose le cookie démo.
  if (pathname.startsWith("/demo-access/")) {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store, private");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return response;
  }

  // Mode démo — isolé de Supabase et protégé par un cookie dérivé du secret.
  if (pathname.startsWith("/demo")) {
    const cookie = request.cookies.get(DEMO_ACCESS_COOKIE)?.value;
    if (!isValidDemoAccessCookie(cookie)) {
      return new NextResponse("Not Found", {
        status: 404,
        headers: {
          "Cache-Control": "no-store, private",
          "X-Robots-Tag": "noindex, nofollow, noarchive",
        },
      });
    }

    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store, private");
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return response;
  }

  // Routes API publiques (webhooks Stripe, cron, auth callback)
  if (isApiRoute(pathname)) {
    return NextResponse.next();
  }

  const automaticLocale = prepareAutomaticLocale(request);

  const publicRoute = isPublicRoute(pathname);
  const authEntry = pathname === "/auth/login" || pathname === "/auth/register";

  // Les pages publiques ordinaires ne dépendent pas de Supabase Auth.
  // Connexion et inscription conservent la redirection des utilisateurs connectés.
  if (publicRoute && !authEntry) {
    return withAutomaticLocale(
      NextResponse.next({ request: { headers: new Headers(request.headers) } }),
      automaticLocale,
    );
  }

  // Sans variables Supabase valides (dev sans .env.local) â†’ autoriser les routes publiques
  if (!isSupabaseConfigured()) {
    if (publicRoute) return withAutomaticLocale(NextResponse.next({ request: { headers: new Headers(request.headers) } }), automaticLocale);
    return withAutomaticLocale(NextResponse.redirect(new URL("/auth/login", request.url)), automaticLocale);
  }

  // Rafraîchit la session Supabase + récupère l'utilisateur
  const { supabaseResponse, user } = await updateSession(request);

  // Routes publiques — rediriger vers dashboard si déjà connecté
  if (publicRoute) {
    if (user && authEntry) {
      const callbackUrl = normalizeAuthNextPath(request.nextUrl.searchParams.get("callbackUrl"));
      return withAutomaticLocale(redirectWithSession(new URL(callbackUrl, request.url), supabaseResponse), automaticLocale);
    }
    return withAutomaticLocale(supabaseResponse, automaticLocale);
  }

  // Pas connecté â†’ login
  if (!user) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return withAutomaticLocale(redirectWithSession(loginUrl, supabaseResponse), automaticLocale);
  }

  return withAutomaticLocale(supabaseResponse, automaticLocale);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|media/home/.*\\.mp4$|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest)$).*)",
  ],
};
