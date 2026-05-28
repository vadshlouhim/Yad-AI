import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { updateSession } from "@/lib/supabase/session";

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
  "/privacy",
  "/data-deletion",
  "/help",
  "/legal",
];

function isPublicRoute(pathname: string): boolean {
  if (/^\/google[a-z0-9_-]+\.html$/i.test(pathname)) return true;
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function isApiRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/gmb")
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Mode démo — entièrement public, pas d'auth Supabase requise
  if (pathname.startsWith("/demo")) {
    return NextResponse.next();
  }

  // Routes API publiques (webhooks Stripe, cron, auth callback)
  if (isApiRoute(pathname)) {
    return NextResponse.next();
  }

  // Sans variables Supabase valides (dev sans .env.local) → autoriser les routes publiques
  if (!isSupabaseConfigured()) {
    if (isPublicRoute(pathname)) return NextResponse.next();
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Rafraîchit la session Supabase + récupère l'utilisateur
  const { supabaseResponse, user } = await updateSession(request);

  // Routes publiques — rediriger vers dashboard si déjà connecté
  if (isPublicRoute(pathname)) {
    if (user && (pathname === "/auth/login" || pathname === "/auth/register")) {
      const callbackUrl =
        request.nextUrl.searchParams.get("callbackUrl") || "/dashboard";
      return NextResponse.redirect(new URL(callbackUrl, request.url));
    }
    return supabaseResponse;
  }

  // Pas connecté → login
  if (!user) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
