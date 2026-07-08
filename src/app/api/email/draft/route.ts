import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStoredShabbatTimes } from "@/lib/ai/engine";
import { assertTierFeature } from "@/lib/billing";
import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 30;

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});
const MODEL = "google/gemini-2.5-flash";

interface DraftRequest {
  sender?: string;
  subject?: string;
  body?: string;
  history?: Array<{ role: "user" | "assistant"; body: string }>;
}

// Rédige une réponse contextuelle à un email reçu, dans le ton de la communauté
// et signée avec sa signature. Utilisé par le bouton « Rédiger avec EasyCom IA ».
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("communityId")
    .eq("id", user.id)
    .single();
  if (!profile?.communityId) {
    return NextResponse.json({ error: "Communauté introuvable" }, { status: 400 });
  }

  const tierCheck = await assertTierFeature(
    admin,
    user.id,
    "BUSINESS",
    "email_management",
    "La gestion des emails est réservée à l'offre Business."
  );
  if (!tierCheck.ok) return tierCheck.response;

  let payload: DraftRequest = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }
  const { sender, subject, body, history } = payload;
  if (!body && !subject) {
    return NextResponse.json({ error: "Email vide : rien à analyser." }, { status: 400 });
  }

  const { data: community } = await admin
    .from("Community")
    .select("name, city, timezone, tone, signature, religiousStream")
    .eq("id", profile.communityId)
    .single();

  const c = (community as {
    name?: string;
    city?: string;
    timezone?: string;
    tone?: string;
    signature?: string | null;
    religiousStream?: string | null;
  } | null) ?? {};
  const communityName = c.name ?? "notre communauté";
  const signature = (c.signature ?? "").trim() || `L'équipe ${communityName}`;

  // Si l'email parle de Chabbat, on fournit les horaires connus pour une réponse précise.
  const mentionsShabbat = /(chabbat|shabbat|chabat|havdal|bougies|kiddouch|kidouch)/i.test(
    `${subject ?? ""} ${body ?? ""}`
  );
  let shabbatBlock = "";
  if (mentionsShabbat) {
    const times = await getStoredShabbatTimes({ city: c.city ?? "Paris", timezone: c.timezone ?? "Europe/Paris" });
    if (times?.entry) {
      shabbatBlock = `\n\nHORAIRES DE CHABBAT CONNUS (à utiliser tels quels si pertinent) :
- Date : ${times.date ?? "—"}${times.parasha ? `, paracha ${times.parasha}` : ""}
- Allumage des bougies : ${times.entry}
- Havdala (sortie) : ${times.exit || "—"}`;
    }
  }

  const conversation = (history ?? [])
    .map((h) => `${h.role === "assistant" ? communityName : sender ?? "Expéditeur"} : ${h.body}`)
    .join("\n\n");

  const system = `Tu rédiges, au nom de "${communityName}"${c.city ? ` (${c.city})` : ""}, une réponse à un email reçu.

CONSIGNES :
- Comprends le contexte et l'intention réelle de l'expéditeur, puis réponds de façon utile, concrète et chaleureuse.
- Adopte un ton ${toneLabel(c.tone)} et professionnel, adapté à une communauté${c.religiousStream ? ` de tradition ${c.religiousStream}` : ""}.
- Réponds en français. Tu peux inclure une salutation juive si c'est pertinent (Shabbat Shalom, etc.).
- Si une information précise manque (date exacte, nombre de places…), demande-la clairement plutôt que d'inventer.
- N'invente jamais d'horaires, de prix ou d'engagements non fournis.
- Termine TOUJOURS par la signature exacte suivante, sur sa propre ligne :
${signature}
- Rends UNIQUEMENT le texte de l'email (objet non inclus), sans guillemets ni Markdown, sans astérisques.${shabbatBlock}`;

  const userPrompt = `Email reçu de ${sender ?? "un contact"} :
Objet : ${subject ?? "(sans objet)"}

${body ?? ""}${conversation ? `\n\nÉchanges précédents :\n${conversation}` : ""}

Rédige la réponse.`;

  try {
    const r = await openrouter.chat.completions.create({
      model: MODEL,
      max_tokens: 900,
      temperature: 0.5,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
    });
    const draft = (r.choices[0]?.message?.content ?? "").trim();
    if (!draft) return NextResponse.json({ error: "Réponse IA vide." }, { status: 500 });
    return NextResponse.json({ draft });
  } catch (error) {
    console.error("[Email Draft] Erreur:", (error as Error).message);
    return NextResponse.json({ error: "Échec de la rédaction IA." }, { status: 500 });
  }
}

function toneLabel(tone?: string): string {
  switch (tone) {
    case "FORMAL":
      return "formel et respectueux";
    case "FRIENDLY":
      return "amical et proche";
    case "MODERN":
      return "moderne et dynamique";
    default:
      return "chaleureux";
  }
}
