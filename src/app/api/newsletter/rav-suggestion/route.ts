import { NextResponse } from "next/server";
import { generateContent } from "@/lib/ai/engine";
import { getUpcomingShabbatTimes } from "@/lib/automation/hebcal";
import { assertPaidFeature } from "@/lib/billing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { limitNewsletterText, NEWSLETTER_RAV_WORD_LIMIT } from "@/lib/newsletter/limits";
import { outputLanguageDirective, parseOutputLocale, type OutputLocale } from "@/lib/ai/output-locale";
import { localizedParasha } from "@/lib/newsletter/religious-locale";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Reconnectez-vous pour utiliser l’IA." }, { status: 401 });
    const body = await request.json().catch(() => ({})) as { outputLocale?: OutputLocale };
    const outputLocale = parseOutputLocale(body.outputLocale);

    const admin = createAdminClient();
    const access = await assertPaidFeature(
      admin,
      user.id,
      "newsletter_generation",
      "Générez votre newsletter Chabbat avec EasyCom IA : premier mois à 9,99 € TTC, puis 19,99 € TTC/mois.",
    );
    if (!access.ok) return access.response;

    const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
    if (!profile?.communityId) return NextResponse.json({ error: "Communauté introuvable." }, { status: 403 });

    const { data: community } = await admin.from("Community").select("city, timezone").eq("id", profile.communityId).single();
    if (!community) return NextResponse.json({ error: "Communauté introuvable." }, { status: 404 });

    const shabbat = (await getUpcomingShabbatTimes({
      city: community.city ?? "Paris",
      timezone: community.timezone && community.timezone !== "UTC" ? community.timezone : "Europe/Paris",
      count: 1,
    }))[0];
    const parasha = shabbat ? localizedParasha(shabbat.date, outputLocale, shabbat.parasha).trim() : "";
    if (!parasha) {
      return NextResponse.json({ error: "La Paracha de ce Chabbat est indisponible. Réessayez plus tard." }, { status: 422 });
    }

    const result = await generateContent({
      communityId: profile.communityId,
      contentType: "COMMUNITY_NEWS",
      outputLocale,
      customInstructions: [
        outputLanguageDirective(outputLocale),
        `Rédige uniquement une proposition de Mot du Rav pour la Paracha ${parasha}, Chabbat suivant le vendredi ${shabbat.date}.`,
        outputLocale === "he" ? "Écris en hébreu naturel, chaleureux et fluide, dans un style adapté à une communauté Habad, sans calque du français." : "",
        "Le contenu est destiné à être relu et validé par un humain avant impression.",
        `Ton chaleureux et sobre, sans titre, hashtag, emoji ni appel à l’action, avec ${NEWSLETTER_RAV_WORD_LIMIT} caractères maximum espaces compris.`,
        "N’invente ni citation, ni verset, ni histoire, ni détail précis de la Paracha non vérifié.",
        "Si tu ne peux pas vérifier un détail, formule une réflexion générale sans l’affirmer comme un fait.",
        "Place uniquement le Mot du Rav dans la propriété JSON body ; laisse les autres propriétés vides.",
      ].join("\n"),
    });
    const suggestion = limitNewsletterText(result.body, NEWSLETTER_RAV_WORD_LIMIT);
    if (!suggestion) return NextResponse.json({ error: "Aucune proposition reçue. Réessayez." }, { status: 502 });

    return NextResponse.json({ suggestion, parasha }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[Newsletter Rav Suggestion]", error);
    return NextResponse.json({ error: "La proposition IA est momentanément indisponible. Votre texte n’a pas été modifié." }, { status: 500 });
  }
}
