import OpenAI from "openai";
import sharp from "sharp";
import { z } from "zod";
import { normalizeTemplateZones, type TemplateEditableZone } from "./zones";

const numeric = (minimum: number, maximum: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() ? Number(value) : value,
  z.number().finite().min(minimum).max(maximum),
);

const variableKeySchema = z.preprocess((value) => {
  const key = String(value ?? "MESSAGE").trim().toUpperCase().replace(/[ -]+/g, "_");
  const aliases: Record<string, string> = {
    TITLE_MAIN: "TITLE",
    MAIN_TITLE: "TITLE",
    DETAILS: "MESSAGE",
    INFO: "MESSAGE",
    INFORMATIONS: "MESSAGE",
    ADDRESS: "LOCATION",
    PHONE: "CONTACT",
  };
  return aliases[key] ?? key;
}, z.enum([
  "SHABBAT_TIMES",
  "HOLIDAY_TIMES",
  "DATE",
  "TIME",
  "BET_DIN_NAME",
  "TITLE",
  "SUBTITLE",
  "MESSAGE",
  "LOCATION",
  "CONTACT",
  "CUSTOM_TEXT",
]));

const prioritySchema = z.preprocess((value) => {
  const priority = String(value ?? "complementary").trim().toLocaleLowerCase("fr");
  if (["main", "primary", "principal", "principale"].includes(priority)) return "main";
  if (["important", "essential", "essentiel", "essentielle"].includes(priority)) return "important";
  return "complementary";
}, z.enum(["main", "important", "complementary"]));

const alignmentSchema = z.preprocess((value) => {
  const alignment = String(value ?? "center").trim().toLocaleLowerCase("fr");
  if (["left", "gauche"].includes(alignment)) return "left";
  if (["right", "droite"].includes(alignment)) return "right";
  return "center";
}, z.enum(["left", "center", "right"]));

const layoutAnalysisSchema = z.object({
  confidence: numeric(0, 100),
  summary: z.string().max(500).default(""),
  zones: z.array(z.object({
    label: z.string().min(1).max(100),
    variableKey: variableKeySchema,
    x: numeric(0, 100),
    y: numeric(0, 100),
    width: numeric(0.1, 100),
    height: numeric(0.1, 100),
    align: alignmentSchema,
    fontSize: numeric(8, 180),
    minFontSize: numeric(10, 120),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    priority: prioritySchema,
    maxCharacters: z.preprocess(
      (value) => typeof value === "string" && value.trim() ? Number(value) : value,
      z.number().int().min(12).max(500),
    ),
  })).min(1).max(7),
}).strict();

function extractJson(raw: string) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? raw.match(/\{[\s\S]*\}/)?.[0];
  if (!candidate) throw new Error("L’analyse IA n’a retourné aucun plan exploitable.");
  return JSON.parse(candidate) as unknown;
}

function rectanglesOverlap(left: TemplateEditableZone, right: TemplateEditableZone) {
  return left.x < right.x + right.width
    && left.x + left.width > right.x
    && left.y < right.y + right.height
    && left.y + left.height > right.y;
}

async function readImageDimensions(imageUrl: string) {
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Impossible de charger l’image source (${response.status}).`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(buffer, { failOn: "error" }).metadata();
  if (!metadata.width || !metadata.height) throw new Error("Dimensions de l’image source introuvables.");
  return { width: metadata.width, height: metadata.height };
}

function buildAnalysisPrompt(params: {
  templateName: string;
  category: string;
  width: number;
  height: number;
  lockedZones: TemplateEditableZone[];
}) {
  return `Tu prépares une affiche réutilisable dans un éditeur professionnel.

Modèle: ${params.templateName}
Catégorie: ${params.category}
Dimensions: ${params.width} x ${params.height}px
Zones déjà validées et verrouillées à conserver: ${JSON.stringify(params.lockedZones)}

Mission:
- détecte uniquement les cadres vides, lignes vides et espaces clairement conçus pour recevoir du texte;
- le contenu intérieur vide d’un cadre décoratif est une zone éditable valide;
- mesure les bords réels de chaque espace: x=0 est le bord gauche et x=100 le bord droit de l’image;
- une zone placée dans un cadre doit rester entièrement à l’intérieur du cadre avec une petite marge interne;
- ne propose pas de rectangle générique centré s’il empiète sur une grande inscription verticale ou un objet fixe;
- ne place jamais de zone sur un texte fixe, logo, photo, illustration ou décoration;
- propose entre 1 et 7 rectangles en pourcentages de l’image;
- attribue à chaque zone le rôle le plus probable: TITLE, SUBTITLE, DATE, TIME, LOCATION, CONTACT, MESSAGE ou CUSTOM_TEXT;
- le plus grand cadre destiné à l’accroche principale doit être TITLE, sauf s’il s’agit clairement d’un panneau d’informations multilignes;
- utilise CONTACT uniquement si un téléphone, une adresse web, une inscription ou un repère explicite de contact est visible autour de la zone;
- une simple ligne vide sans indication explicite doit être CUSTOM_TEXT afin de pouvoir recevoir date, heure ou lieu;
- pour une zone réunissant plusieurs informations pratiques, utilise MESSAGE;
- estime une couleur contrastée, une taille de départ, une taille minimale lisible et une capacité réaliste;
- ne chevauche pas les zones verrouillées;
- confidence représente la fiabilité globale de 0 à 100.

Réponds uniquement avec ce JSON:
{
  "confidence": 90,
  "summary": "description courte",
  "zones": [{
    "label": "Titre principal",
    "variableKey": "TITLE",
    "x": 10,
    "y": 20,
    "width": 80,
    "height": 15,
    "align": "center",
    "fontSize": 54,
    "minFontSize": 24,
    "color": "#FFFFFF",
    "priority": "main",
    "maxCharacters": 72
  }]
}`;
}

export async function analyzeTemplateLayout(params: {
  imageUrl: string;
  templateName: string;
  category: string;
  existingZones?: unknown;
}) {
  if (!process.env.OPENROUTER_API_KEY) throw new Error("Le service d’analyse visuelle n’est pas configuré.");
  const { width, height } = await readImageDimensions(params.imageUrl);
  const existingZones = normalizeTemplateZones(params.existingZones);
  const lockedZones = existingZones.filter((zone) => zone.locked);
  const openrouter = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  });
  const response = await openrouter.chat.completions.create({
    model: process.env.POSTER_VISION_MODEL ?? "google/gemini-2.5-flash",
    max_tokens: 2_500,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [{
      role: "user",
      content: [
        { type: "text", text: buildAnalysisPrompt({ ...params, width, height, lockedZones }) },
        { type: "image_url", image_url: { url: params.imageUrl } },
      ],
    }],
  });
  const parsed = layoutAnalysisSchema.parse(extractJson(response.choices[0]?.message?.content ?? ""));
  const proposedZones = normalizeTemplateZones(parsed.zones.map((zone, index) => ({
    ...zone,
    id: `ai_zone_${index + 1}_${crypto.randomUUID().slice(0, 8)}`,
    variableType: "TEXT",
    defaultText: `{{${zone.variableKey}}}`,
    fontFamily: "Arial, Helvetica, sans-serif",
    overflow: zone.priority === "complementary" ? "hide" : "shrink",
    locked: false,
  }))).filter((zone) => !lockedZones.some((locked) => rectanglesOverlap(zone, locked)));
  const zones = [...lockedZones, ...proposedZones];
  if (zones.length === 0) throw new Error("Aucune zone vide fiable n’a été détectée sur ce modèle.");

  return {
    zones,
    confidence: Math.round(parsed.confidence),
    summary: parsed.summary,
    width,
    height,
  };
}
