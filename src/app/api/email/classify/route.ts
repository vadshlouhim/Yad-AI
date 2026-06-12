import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 30;

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});
const MODEL = "google/gemini-2.5-flash";

type Priority = "EXTREME" | "URGENT" | "IMPORTANT" | "LOW";
const VALID: Priority[] = ["EXTREME", "URGENT", "IMPORTANT", "LOW"];

interface InboundEmail {
  id: string;
  sender?: string;
  subject?: string;
  body?: string;
}

// Classe une liste d'emails par niveau d'urgence/importance via l'IA, en un seul
// appel (batch) pour rester rapide et sous la limite de durée des fonctions.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  let emails: InboundEmail[] = [];
  try {
    const body = await request.json();
    emails = Array.isArray(body?.emails) ? body.emails : [];
  } catch {
    emails = [];
  }
  if (emails.length === 0) return NextResponse.json({ classifications: [] });

  const list = emails
    .map(
      (e, i) =>
        `[${i}] id="${e.id}"\nExpéditeur : ${e.sender ?? "?"}\nObjet : ${e.subject ?? "(sans objet)"}\nExtrait : ${(e.body ?? "").slice(0, 500)}`
    )
    .join("\n\n");

  const system = `Tu tries les emails reçus par une communauté (synagogue, association juive) selon leur niveau d'urgence et d'importance.

Attribue à CHAQUE email une "priority" parmi :
- EXTREME : urgence extrême, action immédiate requise (sécurité, deuil/décès, détresse, problème grave, demande critique avec délai imminent comme « ce soir », « dans 1h »).
- URGENT : à traiter vite (problème bloquant, accès non reçu, inscription/réservation avec délai court, demande explicitement pressante).
- IMPORTANT : à traiter mais sans urgence immédiate (question concrète, demande d'information qui appelle une réponse, suivi nécessaire).
- LOW : non important / informatif (remerciement simple, question générale sans délai, newsletter, message sans action attendue).

Règles : juge sur le fond (délai, conséquence, ton), pas seulement les mots. En cas de doute entre deux niveaux, choisis le moins alarmant.

Réponds UNIQUEMENT en JSON valide, sans texte autour :
{"classifications":[{"id":"<id exact reçu>","priority":"EXTREME|URGENT|IMPORTANT|LOW","reason":"raison courte en français"}]}`;

  try {
    const r = await openrouter.chat.completions.create({
      model: MODEL,
      max_tokens: 1500,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Classe ces ${emails.length} emails :\n\n${list}` },
      ],
    });

    const content = r.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as {
      classifications?: Array<{ id?: string; priority?: string; reason?: string }>;
    };

    const classifications = (parsed.classifications ?? [])
      .map((c) => ({
        id: String(c.id ?? ""),
        priority: (VALID.includes(c.priority as Priority) ? c.priority : "IMPORTANT") as Priority,
        reason: typeof c.reason === "string" ? c.reason : "",
      }))
      .filter((c) => c.id);

    return NextResponse.json({ classifications });
  } catch (error) {
    console.error("[Email Classify] Erreur:", (error as Error).message);
    return NextResponse.json({ error: "Échec de la classification IA." }, { status: 500 });
  }
}
