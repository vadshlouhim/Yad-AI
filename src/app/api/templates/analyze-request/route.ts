import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { resolveTemplateAssetUrl } from "@/lib/templates/shared";

const MODEL = "google/gemini-2.5-flash";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "OPENROUTER_API_KEY n’est pas configurée." }, { status: 503 });
    }

    const body = await request.json() as { templateId?: unknown; request?: unknown };
    const templateId = typeof body.templateId === "string" ? body.templateId : "";
    const userRequest = typeof body.request === "string" ? body.request.trim() : "";
    if (!templateId || !userRequest) return NextResponse.json({ error: "Demande incomplète." }, { status: 400 });
    if (userRequest.length > 4_000) return NextResponse.json({ error: "La demande est trop longue." }, { status: 400 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
    if (!profile?.communityId) return NextResponse.json({ error: "Communauté non configurée" }, { status: 400 });
    const { data: template } = await admin
      .from("Template")
      .select("id, name, originalUrl, previewUrl")
      .eq("id", templateId)
      .eq("isActive", true)
      .or(`isGlobal.eq.true,communityId.eq.${profile.communityId}`)
      .single();
    if (!template) return NextResponse.json({ error: "Template introuvable" }, { status: 404 });
    const imageUrl = resolveTemplateAssetUrl(template.originalUrl) ?? resolveTemplateAssetUrl(template.previewUrl);
    if (!imageUrl) return NextResponse.json({ error: "Image du template introuvable" }, { status: 400 });

    const openrouter = new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey: process.env.OPENROUTER_API_KEY });
    const response = await openrouter.chat.completions.create({
      model: MODEL,
      temperature: 0.1,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: [
            `Analyse cette affiche nommée « ${template.name} » et la demande de modification de l’utilisateur.`,
            "Lis l’image et distingue les éléments graphiques permanents des informations événementielles variables.",
            "Extrais toutes les nouvelles informations que l’utilisateur veut voir sur l’affiche, même si le template ne possède aucun champ ou texte correspondant.",
            "Pour chaque nouvelle information, crée une entrée changes. Si un texte correspondant est visible, place-le dans currentText ; sinon laisse currentText vide.",
            "Recense dans textsToRemove les anciens textes événementiels visibles qui entreraient en conflit ou feraient doublon avec les nouvelles informations.",
            "Rédige editPrompt en anglais pour un modèle d’édition d’image : indique précisément quels anciens textes nettoyer, où intégrer les nouveaux contenus et comment respecter la hiérarchie visuelle existante.",
            "Le prompt doit fonctionner dans les deux cas : remplacement des anciens textes s’ils existent, ou ajout harmonieux si le template est vierge.",
            "Interdis explicitement tout doublon entre anciens et nouveaux textes.",
            "N’invente aucune information. Toute donnée nécessaire mais absente doit apparaître dans missingInformation.",
            "Ne considère pas un nom propre comme manquant si l’utilisateur souhaite seulement afficher une fonction, par exemple « le maire ».",
            "Le fond, les photos, les visages, les logos, les illustrations, les couleurs, le cadrage et la composition doivent rester inchangés.",
            `Demande utilisateur : ${userRequest}`,
          ].join("\n") },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "poster_edit_brief",
          strict: true,
          schema: {
            type: "object",
            properties: {
              summary: { type: "string" },
              changes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    label: { type: "string" },
                    currentText: { type: "string" },
                    newText: { type: "string" },
                  },
                  required: ["label", "currentText", "newText"],
                  additionalProperties: false,
                },
              },
              textsToRemove: { type: "array", items: { type: "string" } },
              editPrompt: { type: "string" },
              unchangedElements: { type: "array", items: { type: "string" } },
              missingInformation: { type: "array", items: { type: "string" } },
            },
            required: ["summary", "changes", "textsToRemove", "editPrompt", "unchangedElements", "missingInformation"],
            additionalProperties: false,
          },
        },
      },
    });
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Gemini n’a renvoyé aucune analyse.");
    return NextResponse.json(JSON.parse(content));
  } catch (error) {
    console.error("[Template Request Analysis]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Analyse impossible." }, { status: 500 });
  }
}
