import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCommunityEmail } from "@/lib/email/send-community-email";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("communityId")
      .eq("id", user.id)
      .single();

    if (!profile?.communityId) {
      return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });
    }

    const { to, subject, bodyText } = await request.json();
    if (!to || !subject || !bodyText) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    // Envoi demandé par l'utilisateur → part de SA boîte (Gmail OAuth), jamais de Resend.
    const result = await sendCommunityEmail(admin, profile.communityId, { to, subject, bodyText });

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? "Échec de l'envoi" }, { status: 500 });
    }
    return NextResponse.json({ success: true, id: result.id, provider: result.provider });
  } catch (error) {
    console.error("[Email API Catch Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur interne" },
      { status: 500 }
    );
  }
}
