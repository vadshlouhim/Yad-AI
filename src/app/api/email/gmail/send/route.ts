import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGmailClient } from "@/lib/gmail";
import { assertTierFeature } from "@/lib/billing";

export async function POST(request: Request) {
  try {
    // 1. Vérifier l'authentification
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await request.json();
    const { to, subject, bodyText } = body;

    if (!to || !subject || !bodyText) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    // 2. Récupérer le communityId de l'utilisateur
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("communityId")
      .eq("id", user.id)
      .single();

    if (!profile?.communityId) {
      return NextResponse.json({ error: "Aucune communauté associée" }, { status: 400 });
    }

    const tierCheck = await assertTierFeature(
      admin,
      user.id,
      "BUSINESS",
      "email_management",
      "La gestion des emails est réservée à l'offre Business."
    );
    if (!tierCheck.ok) return tierCheck.response;

    // 3. Récupérer le refreshToken Gmail de CETTE communauté
    const { data: channel } = await admin
      .from("Channel")
      .select("refreshToken, isConnected")
      .eq("communityId", profile.communityId)
      .eq("type", "EMAIL")
      .maybeSingle();

    const refreshToken = channel?.refreshToken ?? process.env.GMAIL_REFRESH_TOKEN;

    if (!refreshToken) {
      return NextResponse.json({ error: "Gmail non connecté pour cette communauté" }, { status: 400 });
    }

    // 4. Envoyer avec le token de la communauté
    const gmail = getGmailClient(refreshToken);

    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString("base64")}?=`;
    const messageParts = [
      `To: ${to}`,
      "Content-Type: text/html; charset=utf-8",
      "MIME-Version: 1.0",
      `Subject: ${utf8Subject}`,
      "",
      bodyText.replace(/\n/g, "<br />"),
    ];
    const message = messageParts.join("\n");
    const encodedMessage = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encodedMessage },
    });

    return NextResponse.json({ success: true, id: res.data.id });
  } catch (error: unknown) {
    console.error("[Gmail Send Error]", error);
    const msg = error instanceof Error ? error.message : "Erreur lors de l'envoi";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
