import OpenAI from "openai";

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export interface TemplateVisualElementSuggestion {
  id: string;
  label: string;
  kind: "text" | "visual";
  question: string;
  currentValueHint?: string | null;
}

export interface TemplateVisualAnalysis {
  summary: string;
  elements: TemplateVisualElementSuggestion[];
}

function sanitizeElementId(value: string, fallbackIndex: number): string {
  const normalized = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || `element_${fallbackIndex + 1}`;
}

function fallbackAnalysis(category: string): TemplateVisualAnalysis {
  const defaults: Record<string, TemplateVisualElementSuggestion[]> = {
    COURSE: [
      { id: "course_name", label: "Nom du cours", kind: "text", question: "Quel est le nom exact du cours ?" },
      { id: "teacher", label: "Intervenant", kind: "text", question: "Qui donne le cours ?" },
      { id: "schedule", label: "Jour et heure", kind: "text", question: "Pour quel jour et quelle heure veux-tu annoncer le cours ?" },
      { id: "location", label: "Lieu", kind: "text", question: "Où le cours a-t-il lieu ?" },
      { id: "main_visual", label: "Visuel principal", kind: "visual", question: "Souhaites-tu garder le visuel principal ou le remplacer ?" },
    ],
    EVENT: [
      { id: "event_name", label: "Titre principal", kind: "text", question: "Quel est le titre principal à mettre sur l'affiche ?" },
      { id: "date_time", label: "Date et heure", kind: "text", question: "Quelle date et quelle heure veux-tu afficher ?" },
      { id: "location", label: "Lieu", kind: "text", question: "Quel lieu doit apparaître sur l'affiche ?" },
      { id: "cta", label: "Appel à l'action", kind: "text", question: "Quel appel à l'action veux-tu afficher ?" },
      { id: "main_visual", label: "Visuel principal", kind: "visual", question: "Souhaites-tu garder le visuel principal ou le remplacer ?" },
    ],
  };

  return {
    summary: "Je n'ai pas pu analyser précisément l'affiche, donc je pars sur les éléments de personnalisation les plus probables.",
    elements: defaults[category] ?? [
      { id: "title", label: "Titre principal", kind: "text", question: "Quel titre veux-tu afficher ?" },
      { id: "date", label: "Date", kind: "text", question: "Quelle date faut-il afficher ?" },
      { id: "location", label: "Lieu", kind: "text", question: "Quel lieu faut-il afficher ?" },
      { id: "main_visual", label: "Visuel principal", kind: "visual", question: "Souhaites-tu garder le visuel principal ou le remplacer ?" },
    ],
  };
}

export async function analyzeTemplateVisuals(params: {
  imageUrl: string | null;
  templateName: string;
  category: string;
  userRequest?: string;
}): Promise<TemplateVisualAnalysis> {
  const { imageUrl, templateName, category, userRequest } = params;

  if (!imageUrl || !process.env.OPENROUTER_API_KEY) {
    return fallbackAnalysis(category);
  }

  const analysisPrompt = `Analyse cette affiche/template communautaire.

Contexte :
- Nom du template : ${templateName}
- Catégorie : ${category}
- Demande utilisateur : ${userRequest ?? "Non précisée"}

Objectif :
- identifier les éléments visibles qu'un utilisateur voudra probablement personnaliser
- proposer surtout les textes à remplacer
- ajouter les éléments visuels remplaçables seulement s'ils sont clairement identifiables (photo intervenant, visuel héros, encart photo, bandeau fort, etc.)
- les questions doivent être courtes, concrètes et directement exploitables par un assistant

Règles :
- 4 à 7 éléments maximum
- privilégie ce qui est réellement visible sur l'affiche
- n'invente pas des zones qui n'existent probablement pas
- si un texte visible semble lisible, résume-le brièvement dans currentValueHint
- réponds uniquement en JSON valide

Format :
{
  "summary": "phrase courte",
  "elements": [
    {
      "id": "title",
      "label": "Titre principal",
      "kind": "text",
      "question": "Quel titre principal veux-tu afficher ?",
      "currentValueHint": "exemple optionnel"
    }
  ]
}`;

  try {
    const response = await openrouter.chat.completions.create({
      model: "google/gemini-2.5-flash",
      max_tokens: 900,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: analysisPrompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return fallbackAnalysis(category);
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      summary?: string;
      elements?: Array<{
        id?: string;
        label?: string;
        kind?: "text" | "visual";
        question?: string;
        currentValueHint?: string | null;
      }>;
    };

    const elements = (parsed.elements ?? [])
      .filter((element) => element.label && element.question)
      .slice(0, 7)
      .map((element, index) => ({
        id: sanitizeElementId(element.id ?? element.label ?? "", index),
        label: element.label ?? `Élément ${index + 1}`,
        kind: element.kind === "visual" ? "visual" : "text",
        question: element.question ?? "Que veux-tu modifier sur cet élément ?",
        currentValueHint: element.currentValueHint ?? null,
      }));

    if (elements.length === 0) {
      return fallbackAnalysis(category);
    }

    return {
      summary: parsed.summary?.trim() || "J'ai repéré les principaux éléments personnalisables de cette affiche.",
      elements,
    };
  } catch (error) {
    console.error("[Template Analysis] Erreur vision:", error);
    return fallbackAnalysis(category);
  }
}
