import OpenAI from "openai";
import { z } from "zod";

export const DEFAULT_TORAH_SOURCES = ["chabad.org", "loubavitch.fr", "sefaria.org"];

export const torahCourseRequestSchema = z.object({
  duration: z.enum(["5 minutes", "10 minutes", "15 minutes", "30 minutes", "Plus de 45 minutes"]),
  prompt: z.string().trim().min(10),
  theme: z.enum(["general", "youth", "children", "event"]).default("general"),
  eventContext: z.string().trim().max(300).optional().default(""),
  authorizedSources: z.array(
    z.string().trim().min(1).max(200).refine(
      (source) => /^(?:https?:\/\/)?(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s]*)?$/i.test(source),
      "Source invalide",
    ),
  ).min(1).max(10).default(DEFAULT_TORAH_SOURCES),
}).superRefine((value, context) => {
  if (value.theme === "event" && !value.eventContext) {
    context.addIssue({ code: "custom", path: ["eventContext"], message: "Précisez l’événement du cours." });
  }
});

export type TorahCourseRequest = z.infer<typeof torahCourseRequestSchema>;

export interface TorahCourseResult {
  title: string;
  introduction: string;
  outline: string[];
  body: string;
  conclusion: string;
  sources: string[];
  note?: string;
}

const THEME_LABELS = {
  general: "tout public",
  youth: "adapté aux jeunes",
  children: "adapté aux enfants",
  event: "adapté à un événement spécifique",
} as const;

const MAX_TOKENS_BY_DURATION: Record<TorahCourseRequest["duration"], number> = {
  "5 minutes": 900,
  "10 minutes": 1600,
  "15 minutes": 2400,
  "30 minutes": 4200,
  "Plus de 45 minutes": 6500,
};

function cleanCourseText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/<[^>]*>/g, "").replace(/^#{1,6}\s*/gm, "").replace(/\*\*/g, "").trim();
}

export async function generateTorahCourse(input: TorahCourseRequest): Promise<TorahCourseResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Le service IA n’est pas configuré.");

  const openrouter = new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey });
  const authorizedSources = Array.from(new Set(input.authorizedSources.map((source) => source.replace(/^https?:\/\//i, "").replace(/\/$/, ""))));
  const sourcesList = authorizedSources.map((source, index) => `  ${index + 1}. https://${source}`).join("\n");
  const systemPrompt = `Tu es un assistant spécialisé dans la préparation de cours de Torah.

Règles absolues :
- N'invente jamais de contenu de Torah, de citation ou de référence.
- Appuie-toi uniquement sur les sources autorisées suivantes :
${sourcesList}
- Si un point ne peut pas être vérifié, indique-le clairement dans "note".
- Le ton, le vocabulaire et les exemples doivent être ${THEME_LABELS[input.theme]}.
- Adapte réellement le cours à la durée choisie.
- N'utilise ni HTML ni Markdown dans les textes.

Réponds UNIQUEMENT en JSON valide :
{
  "title": "Titre du cours",
  "introduction": "Introduction courte",
  "outline": ["Point 1", "Point 2"],
  "body": "Corps complet du cours",
  "conclusion": "Conclusion du cours",
  "sources": ["Source 1", "Source 2"],
  "note": "Note de prudence si nécessaire"
}`;
  const userPrompt = `Prépare un cours de Torah.

Durée : ${input.duration}
Public ou contexte : ${THEME_LABELS[input.theme]}
${input.theme === "event" ? `Événement : ${input.eventContext}` : ""}

Demande utilisateur :
${input.prompt}`;
  const response = await openrouter.chat.completions.create({
    model: "google/gemini-2.5-flash",
    max_tokens: MAX_TOKENS_BY_DURATION[input.duration],
    temperature: 0.3,
    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
  });
  const raw = response.choices[0]?.message?.content ?? "";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Réponse IA non exploitable");

  let parsed: TorahCourseResult;
  try {
    parsed = JSON.parse(jsonMatch[0]) as TorahCourseResult;
  } catch {
    throw new Error("Erreur de parsing IA");
  }
  return {
    title: cleanCourseText(parsed.title),
    introduction: cleanCourseText(parsed.introduction),
    outline: Array.isArray(parsed.outline) ? parsed.outline.map(cleanCourseText).filter(Boolean) : [],
    body: cleanCourseText(parsed.body),
    conclusion: cleanCourseText(parsed.conclusion),
    sources: Array.isArray(parsed.sources) ? parsed.sources.map(cleanCourseText).filter(Boolean) : [],
    note: cleanCourseText(parsed.note) || undefined,
  };
}
