import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Route de callback OAuth — Supabase redirige ici après Google/GitHub login
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

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
        return NextResponse.redirect(`${origin}/onboarding`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/error?message=auth_callback_failed`);
}
