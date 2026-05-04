import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_POST_LOGIN_PATH,
  normalizeAuthNextPath,
} from "@/lib/supabase/auth-redirect";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = normalizeAuthNextPath(
    searchParams.get("next"),
    DEFAULT_POST_LOGIN_PATH
  );
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const redirectOrigin =
    siteUrl ??
    (process.env.NODE_ENV === "development" || !forwardedHost
      ? origin
      : `${forwardedProto}://${forwardedHost}`);

  if (code) {
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

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

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

      const destination = !profile?.communityId ? "/onboarding" : next;
      const redirectResponse = NextResponse.redirect(
        new URL(destination, redirectOrigin)
      );

      // Transférer les cookies de session sur la réponse redirect
      authCookies.forEach(({ name, value, options }) => {
        redirectResponse.cookies.set(name, value, options);
      });

      return redirectResponse;
    }
  }

  return NextResponse.redirect(
    new URL("/auth/error?message=auth_callback_failed", redirectOrigin)
  );
}
