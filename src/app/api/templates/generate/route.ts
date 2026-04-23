import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import OpenAI from "openai";

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
    if (!profile?.communityId) {
      return NextResponse.json({ error: "Communauté non configurée" }, { status: 400 });
    }

    const body = await request.json();
    const { templateId, answers } = body;

    const [{ data: template }, { data: community }] = await Promise.all([
      admin.from("Template").select("*").eq("id", templateId).single(),
      admin.from("Community").select("name, city, phone, email, website, address, religiousStream, tone").eq("id", profile.communityId).single(),
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
- Adresse : ${(community as Record<string, unknown>)?.address ?? "Non spécifié"}
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

    let generatedTexts: Record<string, string> = {};
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        generatedTexts = JSON.parse(jsonMatch[0]);
      }
    } catch {
      return NextResponse.json({ error: "Erreur de parsing IA", raw }, { status: 500 });
    }

    const { data: currentTemplate } = await admin.from("Template").select("usageCount").eq("id", templateId).single();
    await admin.from("Template").update({
      usageCount: (currentTemplate?.usageCount ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    }).eq("id", templateId);

    return NextResponse.json({ generatedTexts });
  } catch (error) {
    console.error("[Templates Generate] Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
