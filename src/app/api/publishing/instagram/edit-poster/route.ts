import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderTemplatePoster } from "@/lib/templates/render";
import { POSTER_GENERATION_RULES } from "@/lib/templates/poster-rules";

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

type DesignZone = {
  id: string;
  label: string;
  type: string;
  defaultText: string;
};

function removeAsterisks(value: string) {
  return value.replace(/\*/g, "");
}

function formatFallbackLabel(key: string) {
  return key
    .split("_")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const templateId = typeof body.templateId === "string" ? body.templateId : "";
    const editPrompt = typeof body.editPrompt === "string" ? body.editPrompt.trim() : "";
    const caption = typeof body.caption === "string" ? body.caption.trim() : "";
    const currentTexts =
      body.generatedTexts && typeof body.generatedTexts === "object"
        ? (body.generatedTexts as Record<string, string>)
        : null;

    if (!templateId || !editPrompt || !currentTexts) {
      return NextResponse.json({ error: "Données de modification invalides." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("communityId")
      .eq("id", user.id)
      .single();

    if (!profile?.communityId) {
      return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });
    }

    const [{ data: community }, { data: template }] = await Promise.all([
      admin
        .from("Community")
        .select("name, city, tone")
        .eq("id", profile.communityId)
        .single(),
      admin
        .from("Template")
        .select("*")
        .eq("id", templateId)
        .or(`isGlobal.eq.true,communityId.eq.${profile.communityId}`)
        .single(),
    ]);

    if (!template) {
      return NextResponse.json({ error: "Template introuvable." }, { status: 404 });
    }

    const zones = (template.design as DesignZone[] | null) ?? [];
    const zoneContext = zones.length > 0
      ? zones
          .map((zone) => `- ${zone.label} (id: ${zone.id}) : "${currentTexts[zone.id] ?? zone.defaultText ?? ""}"`)
          .join("\n")
      : Object.entries(currentTexts)
          .map(([key, value]) => `- ${formatFallbackLabel(key)} (id: ${key}) : "${value}"`)
          .join("\n");

    const prompt = `Tu modifies les textes d'une affiche Instagram existante.

Communauté :
- Nom : ${community?.name ?? "Non spécifié"}
- Ville : ${community?.city ?? "Non spécifié"}
- Ton : ${community?.tone ?? "MODERN"}

Template : ${template.name}

Légende Instagram actuelle :
${caption || "Non fournie"}

Textes actuels de l'affiche :
${zoneContext}

Demande de modification :
${editPrompt}

Règles :
- Modifie uniquement ce qui est nécessaire pour répondre à la demande.
- Garde le même style visuel et la même hiérarchie.
- Génère des textes courts, nets et directement exploitables.
- Ne renvoie aucun commentaire, aucune explication.
- N'utilise jamais d'astérisques.
- Si l'affiche ne contient pas de zones techniques explicites, utilise simplement les ids déjà fournis.
${POSTER_GENERATION_RULES}

Réponds UNIQUEMENT avec un JSON valide de la forme :
{ "zoneId": "nouveau texte" }`;

    const response = await openrouter.chat.completions.create({
      model: "google/gemini-2.5-flash",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.choices[0]?.message?.content ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return NextResponse.json({ error: "Réponse IA invalide pour la modification de l'affiche." }, { status: 500 });
    }

    const generatedTexts = Object.fromEntries(
      Object.entries(JSON.parse(jsonMatch[0]) as Record<string, string>).map(([key, value]) => [
        key,
        removeAsterisks(String(value)),
      ])
    );

    const renderedPoster = await renderTemplatePoster({
      admin,
      template,
      communityId: profile.communityId,
      generatedTexts,
    });

    return NextResponse.json({
      imageUrl: renderedPoster.imageUrl,
      generatedTexts,
    });
  } catch (error) {
    console.error("[Instagram Edit Poster]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
