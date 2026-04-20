import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

/**
 * POST /api/templates/generate
 * Génère le texte personnalisé pour un template d'affiche
 * à partir du contexte communauté + réponses utilisateur
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { communityId: true },
    });
    if (!profile?.communityId) {
      return NextResponse.json({ error: "Communauté non configurée" }, { status: 400 });
    }

    const body = await request.json();
    const { templateId, answers } = body;

    // Charger template + communauté
    const [template, community] = await Promise.all([
      prisma.template.findUnique({ where: { id: templateId } }),
      prisma.community.findUnique({
        where: { id: profile.communityId },
        select: {
          name: true, city: true, phone: true, email: true,
          website: true, address: true, religiousStream: true, tone: true,
        },
      }),
    ]);

    if (!template) {
      return NextResponse.json({ error: "Template introuvable" }, { status: 404 });
    }

    const designZones = template.design as Array<{
      id: string;
      label: string;
      type: string;
      defaultText: string;
    }>;

    const zonesDescription = designZones
      .map((z) => `- "${z.label}" (id: ${z.id}, type: ${z.type}) — texte par défaut : "${z.defaultText}"`)
      .join("\n");

    const prompt = `Tu es un expert en communication pour les communautés juives.

Contexte de la communauté :
- Nom : ${community?.name}
- Ville : ${community?.city ?? "Non spécifié"}
- Téléphone : ${community?.phone ?? "Non spécifié"}
- Email : ${community?.email ?? "Non spécifié"}
- Site web : ${community?.website ?? "Non spécifié"}
- Adresse : ${community?.address ?? "Non spécifié"}
- Courant : ${community?.religiousStream ?? "Non spécifié"}
- Ton : ${community?.tone ?? "MODERN"}

Réponses de l'utilisateur aux questions de personnalisation :
${Object.entries(answers).map(([k, v]) => `- ${k} : ${v}`).join("\n")}

Template choisi : "${template.name}" (catégorie : ${template.category})

Zones éditables de l'affiche :
${zonesDescription}

Pour chaque zone éditable, génère le texte personnalisé adapté. Le texte doit être :
- Court et percutant (adapté à une affiche)
- En accord avec le ton de la communauté
- Intégrant les informations de la communauté et les réponses de l'utilisateur

Réponds UNIQUEMENT en JSON valide, avec un objet dont les clés sont les IDs des zones et les valeurs le texte personnalisé. Exemple :
{ "title": "Soirée Chabbat Spéciale", "date": "Vendredi 20 Avril 2026", "lieu": "Beth Habad Paris" }`;

    const response = await openrouter.chat.completions.create({
      model: "google/gemini-2.5-flash",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.choices[0]?.message?.content ?? "";

    // Parser le JSON
    let generatedTexts: Record<string, string> = {};
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        generatedTexts = JSON.parse(jsonMatch[0]);
      }
    } catch {
      return NextResponse.json({ error: "Erreur de parsing IA", raw }, { status: 500 });
    }

    // Incrémenter le compteur d'usage
    await prisma.template.update({
      where: { id: templateId },
      data: { usageCount: { increment: 1 } },
    });

    return NextResponse.json({ generatedTexts });
  } catch (error) {
    console.error("[Templates Generate] Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
