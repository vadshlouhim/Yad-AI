import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_POST_LOGIN_PATH,
  normalizeAuthNextPath,
} from "@/lib/supabase/auth-redirect";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Route de callback OAuth — Supabase redirige ici après Google/GitHub login
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = normalizeAuthNextPath(
    searchParams.get("next"),
    DEFAULT_POST_LOGIN_PATH
  );
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const redirectOrigin =
    process.env.NODE_ENV === "development" || !forwardedHost
      ? origin
      : `${forwardedProto}://${forwardedHost}`;

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const admin = createAdminClient();

      // Créer ou mettre à jour le profil Supabase
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

      // Vérifier si l'onboarding est terminé
      const { data: profile } = await admin
        .from("profiles")
        .select("communityId")
        .eq("id", data.user.id)
        .single();

      if (!profile?.communityId) {
        return NextResponse.redirect(new URL("/onboarding", redirectOrigin));
      }

      return NextResponse.redirect(new URL(next, redirectOrigin));
    }
  }

  return NextResponse.redirect(
    new URL("/auth/error?message=auth_callback_failed", redirectOrigin)
  );
}
