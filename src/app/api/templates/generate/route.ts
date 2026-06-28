import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { POSTER_GENERATION_RULES } from "@/lib/templates/poster-rules";

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
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

    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
    if (!profile?.communityId) {
      return NextResponse.json({ error: "Communaute non configuree" }, { status: 400 });
    }

    const body = await request.json();
    const { templateId, answers } = body;

    const [{ data: template }, { data: community }] = await Promise.all([
      admin.from("Template").select("*").eq("id", templateId).single(),
      admin
        .from("Community")
        .select("name, city, phone, email, website, address, religiousStream, tone")
        .eq("id", profile.communityId)
        .single(),
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
      .map(
        (zone) =>
          `- "${zone.label}" (id: ${zone.id}, type: ${zone.type}) - texte par defaut : "${zone.defaultText}"`,
      )
      .join("\n");

    const prompt = `Tu es un expert en communication pour les communautes juives.

Contexte de la communaute :
- Nom : ${community?.name}
- Ville : ${community?.city ?? "Non specifie"}
- Telephone : ${community?.phone ?? "Non specifie"}
- Email : ${community?.email ?? "Non specifie"}
- Site web : ${community?.website ?? "Non specifie"}
- Adresse : ${(community as Record<string, unknown>)?.address ?? "Non specifie"}
- Courant : ${community?.religiousStream ?? "Non specifie"}
- Ton : ${community?.tone ?? "MODERN"}

Informations fournies librement par l'utilisateur pour personnaliser l'affiche :
${Object.entries(answers).map(([key, value]) => `- ${key} : ${value}`).join("\n")}

Template choisi : "${template.name}" (categorie : ${template.category})

Zones editables de l'affiche :
${zonesDescription}

Pour chaque zone editable, genere le texte personnalise adapte. Le texte doit etre :
- Court et percutant, adapte a une affiche
- En accord avec le ton de la communaute
- Capable d'extraire et de comprendre les informations donnees librement par l'utilisateur
- Coherent avec le type d'evenement, la date, l'heure, le lieu, le public et les consignes eventuelles
${POSTER_GENERATION_RULES}

Reponds UNIQUEMENT en JSON valide, avec un objet dont les cles sont les IDs des zones et les valeurs le texte personnalise. Exemple :
{ "title": "Soiree Chabbat Speciale", "date": "Vendredi 20 Avril 2026", "lieu": "Beth Habad Paris" }`;

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
    await admin
      .from("Template")
      .update({
        usageCount: (currentTemplate?.usageCount ?? 0) + 1,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", templateId);

    return NextResponse.json({ generatedTexts });
  } catch (error) {
    console.error("[Templates Generate] Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
