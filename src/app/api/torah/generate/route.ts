import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const requestSchema = z.object({
  duration: z.string().min(1),
  prompt: z.string().min(10),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Parametres invalides" }, { status: 400 });
    }

    const { duration, prompt } = parsed.data;

    const systemPrompt = `Tu es un assistant specialise dans la preparation de cours de Torah.

Regles absolues :
- N'invente jamais de contenu de Torah.
- N'invente jamais de citation.
- N'invente jamais de reference.
- N'attribue jamais une idee a un Rav, un texte ou une source si ce n'est pas verifie.
- Tu dois t'appuyer uniquement sur les sources autorisees suivantes :
  1. https://www.chabad.org
  2. https://www.loubavitch.fr
  3. https://www.sefaria.org
- Si tu n'es pas certain qu'un point provient de ces sources, indique-le clairement au lieu d'inventer.
- Le cours doit etre adapte a la duree choisie.
- 5 minutes = tres concis
- 10 a 15 minutes = structure courte mais developpee
- 30 minutes = cours plus complet
- Plus de 45 minutes = plan et developpement plus approfondis

Format de reponse obligatoire :
Reponds UNIQUEMENT en JSON valide avec cette structure :
{
  "title": "Titre du cours",
  "introduction": "Introduction courte",
  "outline": ["Point 1", "Point 2"],
  "body": "Corps complet du cours",
  "conclusion": "Conclusion du cours",
  "sources": ["Source 1", "Source 2"],
  "note": "Note de prudence si necessaire"
}`;

    const userPrompt = `Prepare un cours de Torah.

Duree choisie : ${duration}

Demande utilisateur :
${prompt}

Important :
- Adapte reellement le niveau de detail a la duree choisie.
- Si certaines informations ne peuvent pas etre verifiees a partir de chabad.org, loubavitch.fr ou sefaria.org, dis-le clairement dans "note".
- Reste structure, clair, fidele aux sources et respectueux.`;

    const response = await openrouter.chat.completions.create({
      model: "google/gemini-2.5-flash",
      max_tokens: 1800,
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Reponse IA non exploitable" }, { status: 500 });
    }

    let result: {
      title: string;
      introduction: string;
      outline: string[];
      body: string;
      conclusion: string;
      sources: string[];
      note?: string;
    };

    try {
      result = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json({ error: "Erreur de parsing IA" }, { status: 500 });
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error("[Torah Generate] Erreur:", error);
    return NextResponse.json({ error: "Erreur lors de la generation du cours" }, { status: 500 });
  }
}
