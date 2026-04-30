import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTemplateQuestions, resolveTemplateAssetUrl } from "@/lib/templates/shared";
import { analyzeTemplateVisuals } from "@/lib/templates/analysis";

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

interface DesignZone {
  id: string;
  label: string;
  type: string;
  defaultText: string;
}

function removeAsterisks(value: string) {
  return value.replace(/\*/g, "");
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
    const { templateId, messages } = body as {
      templateId?: string;
      messages?: Array<{ role: "user" | "assistant"; content: string }>;
    };

    if (!templateId || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("communityId")
      .eq("id", user.id)
      .single();

    if (!profile?.communityId) {
      return NextResponse.json(
        { error: "Communauté non configurée" },
        { status: 400 }
      );
    }

    const [{ data: template }, { data: community }] = await Promise.all([
      admin
        .from("Template")
        .select("*")
        .eq("id", templateId)
        .or(`isGlobal.eq.true,communityId.eq.${profile.communityId}`)
        .single(),
      admin
        .from("Community")
        .select("name, city, phone, email, website, address, religiousStream, tone")
        .eq("id", profile.communityId)
        .single(),
    ]);

    if (!template) {
      return NextResponse.json({ error: "Template introuvable" }, { status: 404 });
    }

    const questions = getTemplateQuestions(template.category);
    const templateImageUrl =
      resolveTemplateAssetUrl(template.previewUrl) ??
      resolveTemplateAssetUrl(template.thumbnailUrl);
    const visualAnalysis = await analyzeTemplateVisuals({
      imageUrl: templateImageUrl,
      templateName: template.name,
      category: template.category,
      userRequest: messages.findLast((message) => message.role === "user")?.content,
    });
    const configuredZones = (template.design as unknown as DesignZone[]) ?? [];
    const zones = configuredZones.length > 0
      ? configuredZones
      : visualAnalysis.elements.length > 0
        ? visualAnalysis.elements.map((element) => ({
            id: element.id,
            label: element.label,
            type: element.kind,
            defaultText: element.currentValueHint ?? "",
          }))
        : questions.map((question) => ({
            id: question.id,
            label: question.label,
            type: question.id,
            defaultText: "",
          }));
    const conversation = messages
      .slice(-12)
      .map((message) => `${message.role === "user" ? "Utilisateur" : "Assistant"}: ${message.content}`)
      .join("\n");

    const extractionPrompt = `Tu prépares le texte final d'une affiche communautaire.

Communauté :
- Nom : ${community?.name ?? "Non spécifié"}
- Ville : ${community?.city ?? "Non spécifié"}
- Téléphone : ${community?.phone ?? "Non spécifié"}
- Email : ${community?.email ?? "Non spécifié"}
- Site web : ${community?.website ?? "Non spécifié"}
- Adresse : ${community?.address ?? "Non spécifié"}
- Courant : ${community?.religiousStream ?? "Non spécifié"}
- Ton : ${community?.tone ?? "MODERN"}

Template :
- Nom : ${template.name}
- Catégorie : ${template.category}

Questions attendues :
${questions.map((question) => `- ${question.label}`).join("\n")}

Analyse visuelle de l'affiche :
- Résumé : ${visualAnalysis.summary}
- Éléments détectés :
${visualAnalysis.elements.map((element) => `- ${element.label} [${element.kind}]${element.currentValueHint ? ` — visible actuellement : "${element.currentValueHint}"` : ""}`).join("\n")}

Zones éditables :
${zones
  .map(
    (zone) =>
      `- ${zone.label} (id: ${zone.id}, type: ${zone.type}, texte par défaut: "${zone.defaultText}")`
  )
  .join("\n")}

Conversation récente :
${conversation}

Règles :
- Génère des textes courts, crédibles et prêts à poser sur une affiche.
- Si une information importante manque, écris exactement "À confirmer".
- Réutilise les infos de la communauté quand elles sont pertinentes.
- N'utilise jamais le caractère astérisque.
- N'ajoute pas de commentaires.

Réponds UNIQUEMENT en JSON valide de la forme :
{
  "generatedTexts": {
    "zoneId": "texte"
  }
}`;

    const response = await openrouter.chat.completions.create({
      model: "google/gemini-2.5-flash",
      max_tokens: 1200,
      messages: [{ role: "user", content: extractionPrompt }],
    });

    const raw = response.choices[0]?.message?.content ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Réponse IA invalide pour la confirmation", raw },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      generatedTexts?: Record<string, string>;
    };

    const generatedTexts = Object.fromEntries(
      Object.entries(parsed.generatedTexts ?? {}).map(([key, value]) => [key, removeAsterisks(String(value))])
    );
    const missingFields = Object.entries(generatedTexts)
      .filter(([, value]) => value === "À confirmer")
      .map(([zoneId]) => {
        const zone = zones.find((entry) => entry.id === zoneId);
        return zone?.label ?? zoneId;
      });

    const summaryLines = zones.map((zone) => {
      const value = removeAsterisks(generatedTexts[zone.id] ?? zone.defaultText ?? "À confirmer");
      return `- ${zone.label} : ${value}`;
    });

    const confirmationMessage = [
      `J'ai préparé les textes pour ${template.name}.`,
      "",
      ...summaryLines,
      "",
      missingFields.length > 0
        ? `Les champs suivants restent à confirmer : ${missingFields.join(", ")}.`
        : "Si tout te convient, tu peux confirmer et générer l'affiche.",
    ].join("\n");

    return NextResponse.json({
      confirmationMessage,
      generatedTexts,
      missingFields,
      template: {
        id: template.id,
        name: template.name,
        category: template.category,
        thumbnailUrl: resolveTemplateAssetUrl(template.thumbnailUrl),
        previewUrl: resolveTemplateAssetUrl(template.previewUrl),
      },
    });
  } catch (error) {
    console.error("[Templates Confirm] Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
