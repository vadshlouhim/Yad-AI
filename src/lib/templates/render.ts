import { fal } from "@fal-ai/client";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/types/database.types";
import { getTemplateQuestions, resolveTemplateAssetUrl } from "./shared";

type TemplateRow = Tables<"Template">;

interface DesignZone {
  id: string;
  label: string;
  type: string;
  defaultText: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
  fontFamily: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const tentative = current ? `${current} ${word}` : word;
    if (tentative.length <= maxCharsPerLine) {
      current = tentative;
    } else {
      if (current) {
        lines.push(current);
      }
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines.slice(0, 4);
}

function buildTextOverlaySvg(
  zones: DesignZone[],
  generatedTexts: Record<string, string>,
  width: number,
  height: number
): Buffer {
  const zoneMarkup = zones
    .map((zone) => {
      const rawText = generatedTexts[zone.id] ?? zone.defaultText ?? "";
      const text = escapeXml(rawText.trim());
      const zoneWidth = (zone.width / 100) * width;
      const fontSize = Math.max(Math.round(zone.fontSize), 18);
      const maxCharsPerLine = Math.max(Math.floor(zoneWidth / (fontSize * 0.52)), 10);
      const lines = wrapText(text, maxCharsPerLine);
      const startX = (zone.x / 100) * width + zoneWidth / 2;
      const startY = (zone.y / 100) * height + fontSize;
      const lineHeight = fontSize * 1.18;
      const fontFamily = escapeXml(zone.fontFamily || "Arial, Helvetica, sans-serif");
      const fill = zone.color || "#111827";

      return `
        <text
          x="${startX}"
          y="${startY}"
          text-anchor="middle"
          font-family="${fontFamily}"
          font-size="${fontSize}"
          fill="${fill}"
          font-weight="700"
        >
          ${lines
            .map(
              (line, index) =>
                `<tspan x="${startX}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
            )
            .join("")}
        </text>
      `;
    })
    .join("");

  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      ${zoneMarkup}
    </svg>
  `;

  return Buffer.from(svg);
}

async function fetchImageBuffer(imageUrl: string): Promise<Buffer> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Impossible de télécharger l'image source (${response.status})`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function removeTemplateTextWithFal(imageUrl: string): Promise<string> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    throw new Error("FAL_KEY manquant");
  }

  fal.config({ credentials: falKey });

  const result = await fal.subscribe("fal-ai/image-editing/text-removal", {
    input: { image_url: imageUrl },
    logs: true,
  });

  const cleanedImageUrl = result.data?.images?.[0]?.url;
  if (!cleanedImageUrl) {
    throw new Error("Fal n'a pas renvoyé d'image nettoyée");
  }

  return cleanedImageUrl;
}

async function editTemplateTextWithNanoBanana(
  imageUrl: string,
  prompt: string
): Promise<string> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    throw new Error("FAL_KEY manquant");
  }

  fal.config({ credentials: falKey });

  const result = await fal.subscribe("fal-ai/nano-banana/edit", {
    input: {
      prompt,
      image_urls: [imageUrl],
      num_images: 1,
      output_format: "png",
      aspect_ratio: "auto",
    },
    logs: true,
  });

  const editedImageUrl = result.data?.images?.[0]?.url;
  if (!editedImageUrl) {
    throw new Error("Fal n'a pas renvoyé d'image éditée");
  }

  return editedImageUrl;
}

export function buildPosterEditPrompt(
  template: Pick<TemplateRow, "name">,
  zones: DesignZone[],
  generatedTexts: Record<string, string>
): string {
  const zoneDescription = zones
    .map((zone) => {
      const nextValue = generatedTexts[zone.id] ?? zone.defaultText;
      return `- Zone "${zone.label}" : remplacer par "${nextValue}". Position originale à conserver.`;
    })
    .join("\n");

  return `Édite cette affiche "${template.name}" en gardant l'image strictement identique hors texte.

Remplace uniquement les contenus textuels existants, sans changer :
- le fond
- les couleurs de fond
- les personnages ou objets
- les logos
- la composition générale

Conserve la hiérarchie visuelle et l'emplacement des blocs de texte.
N'invente aucun nouvel élément graphique.

Textes à remplacer :
${zoneDescription}`;
}

function formatFallbackLabel(key: string, category: string): string {
  const matchedQuestion = getTemplateQuestions(category).find((question) => question.id === key);
  if (matchedQuestion) return matchedQuestion.label;

  return key
    .split("_")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

export function buildPosterEditPromptWithoutZones(
  template: Pick<TemplateRow, "name" | "category">,
  generatedTexts: Record<string, string>
): string {
  const replacementLines = Object.entries(generatedTexts)
    .filter(([, value]) => value && value !== "À confirmer")
    .map(([key, value]) => `- ${formatFallbackLabel(key, template.category)} : "${value}"`)
    .join("\n");

  return `Edit this poster named "${template.name}" by replacing only the visible text content.

Keep absolutely everything else unchanged:
- same background
- same colors
- same people, objects and decorative elements
- same logo placement
- same overall composition
- same typography spirit and visual hierarchy as closely as possible

Do not redesign the poster. Do not add new graphic elements. Only swap the textual information so the poster matches these new details:
${replacementLines || "- Use the user's confirmed event information."}

Important:
- preserve the original language style when appropriate
- replace outdated dates, times, titles, locations and calls to action
- keep the poster clean, readable and natural
- output a single edited poster`;
}

export async function renderTemplatePoster(params: {
  admin: SupabaseClient<Database>;
  template: TemplateRow;
  communityId: string;
  generatedTexts: Record<string, string>;
}) {
  const { admin, template, communityId, generatedTexts } = params;

  const sourceUrl =
    resolveTemplateAssetUrl(template.previewUrl) ??
    resolveTemplateAssetUrl(template.thumbnailUrl);

  if (!sourceUrl) {
    throw new Error("Le template ne possède pas d'image source exploitable");
  }

  const zones = (template.design as unknown as DesignZone[]) ?? [];
  let outputBuffer: Buffer;
  let promptUsed: string;

  if (zones.length > 0) {
    const cleanedImageUrl = await removeTemplateTextWithFal(sourceUrl);
    const cleanedBuffer = await fetchImageBuffer(cleanedImageUrl);
    const sourceImage = sharp(cleanedBuffer);
    const metadata = await sourceImage.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error("Impossible de lire les dimensions du template");
    }

    const overlaySvg = buildTextOverlaySvg(
      zones,
      generatedTexts,
      metadata.width,
      metadata.height
    );

    outputBuffer = await sourceImage
      .composite([{ input: overlaySvg, top: 0, left: 0 }])
      .png()
      .toBuffer();
    promptUsed = buildPosterEditPrompt(template, zones, generatedTexts);
  } else {
    promptUsed = buildPosterEditPromptWithoutZones(template, generatedTexts);
    const editedImageUrl = await editTemplateTextWithNanoBanana(sourceUrl, promptUsed);
    outputBuffer = await fetchImageBuffer(editedImageUrl);
  }

  const storagePath = `generated/${communityId}/${template.id}-${Date.now()}.png`;
  const upload = await admin.storage
    .from("templates")
    .upload(storagePath, outputBuffer, {
      contentType: "image/png",
      upsert: false,
    });

  if (upload.error) {
    throw new Error(upload.error.message);
  }

  const { data: publicUrl } = admin.storage
    .from("templates")
    .getPublicUrl(storagePath);

  return {
    imageUrl: publicUrl.publicUrl,
    storagePath,
    promptUsed,
  };
}
