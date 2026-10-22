import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_POST_LOGIN_PATH,
  normalizeAuthNextPath,
  getPostAuthDestination,
} from "@/lib/supabase/auth-redirect";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { syncLocaleOnLogin } from "@/lib/i18n/sync-locale-on-login";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const verificationType = searchParams.get("type");
  const next = normalizeAuthNextPath(
    searchParams.get("next"),
    DEFAULT_POST_LOGIN_PATH
  );
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const isLocalOrigin =
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:");
  const redirectOrigin =
    process.env.NODE_ENV === "development" || isLocalOrigin
      ? origin
      : forwardedHost
        ? `${forwardedProto}://${forwardedHost}`
        : siteUrl ?? origin;

  const allowedVerificationTypes = new Set([
    "signup",
    "invite",
    "magiclink",
    "recovery",
    "email_change",
    "email",
  ] as const);
  const hasValidTokenHash =
    Boolean(tokenHash) &&
    allowedVerificationTypes.has(
      verificationType as (typeof allowedVerificationTypes extends Set<infer T>
        ? T
        : never),
    );

  if (code || hasValidTokenHash) {
    const cookieStore = await cookies();

    // Capture les cookies auth pour les coller sur la réponse redirect
    const authCookies: Array<{ name: string; value: string; options: Parameters<typeof cookieStore.set>[2] }> = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            authCookies.push(...cookiesToSet);
          },
        },
      }
    );

    const { data, error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({
          token_hash: tokenHash!,
          type: verificationType as
            | "signup"
            | "invite"
            | "magiclink"
            | "recovery"
            | "email_change"
            | "email",
        });

    if (!error && data.user) {
      const admin = createAdminClient();

      await admin.from("profiles").upsert(
        {
          id: data.user.id,
          email: data.user.email!,
          name:
            data.user.user_metadata?.full_name ??
            data.user.email?.split("@")[0],
          avatarUrl: data.user.user_metadata?.avatar_url ?? null,
          role: "ADMIN",
          updatedAt: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      const { data: profile } = await admin
        .from("profiles")
        .select("communityId")
        .eq("id", data.user.id)
        .single();

      const destination = getPostAuthDestination(next, Boolean(profile?.communityId));
      const redirectResponse = NextResponse.redirect(
        new URL(destination, redirectOrigin)
      );

      // Transférer les cookies de session sur la réponse redirect
      authCookies.forEach(({ name, value, options }) => {
        redirectResponse.cookies.set(name, value, options);
      });

      try {
        await syncLocaleOnLogin({
          supabase,
          requestCookies: cookieStore,
          responseCookies: redirectResponse.cookies,
        });
      } catch (localeError) {
        console.error("[Auth] Synchronisation de langue impossible:", localeError);
      }

      return redirectResponse;
    }
  }

  return NextResponse.redirect(
    new URL("/auth/error?message=auth_callback_failed", redirectOrigin)
  );
}
