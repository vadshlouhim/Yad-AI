import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertPaidFeature } from "@/lib/billing";

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
  if (!profile?.communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  const paid = await assertPaidFeature(
    admin,
    user.id,
    "whatsapp",
    "WhatsApp IA est réservé au mode payant. Passez à l'abonnement pour générer et envoyer des messages WhatsApp."
  );
  if (!paid.ok) return paid.response;

  const body = await request.json();
  const prompt = String(body.prompt ?? "").trim();
  if (!prompt) return NextResponse.json({ error: "Indiquez le message ou les informations à préparer." }, { status: 400 });

  const { data: community } = await admin
    .from("Community")
    .select("name, city, tone, signature")
    .eq("id", profile.communityId)
    .single();

  const tone = community?.tone ?? "FRIENDLY";
  const systemPrompt = `Tu rédiges des messages WhatsApp pour la communauté juive "${community?.name ?? ""}"${
    community?.city ? ` (${community.city})` : ""
  }.
Style attendu : message WhatsApp prêt à envoyer, chaleureux et clair, ton ${tone}.
- Court et direct, adapté à une lecture sur mobile.
- Utilise des emojis avec parcimonie et des sauts de ligne pour aérer.
- Pas de markdown (#, **), pas de titre technique. Tu peux utiliser *gras WhatsApp* si utile.
- N'invente pas d'informations manquantes (dates, lieux) : reste fidèle à la demande.
${community?.signature ? `- Termine par la signature : ${community.signature}` : ""}
Réponds UNIQUEMENT avec le texte final du message, sans guillemets ni commentaire.`;

  try {
    const response = await openrouter.chat.completions.create({
      model: "google/gemini-2.5-flash",
      max_tokens: 600,
      temperature: 0.6,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    });
    const message = (response.choices[0]?.message?.content ?? "").trim();
    if (!message) return NextResponse.json({ error: "Génération vide, réessayez." }, { status: 502 });
    return NextResponse.json({ message });
  } catch (error) {
    console.error("[WhatsApp Generate] Erreur:", error);
    return NextResponse.json({ error: "Erreur de génération IA." }, { status: 500 });
  }
}
