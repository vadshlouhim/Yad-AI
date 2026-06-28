import { fal, ValidationError } from "@fal-ai/client";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/types/database.types";
import { getTemplateQuestions, resolveTemplateAssetUrl, CATEGORY_LABELS } from "./shared";
import { POSTER_IMAGE_EDIT_RULES } from "./poster-rules";

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
  prompt: string,
  retryPrompt?: string
): Promise<string> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    throw new Error("FAL_KEY manquant");
  }

  fal.config({ credentials: falKey });

  const sourceResponse = await fetch(imageUrl);
  if (!sourceResponse.ok) {
    throw new Error(`Impossible de télécharger l'affiche source (${sourceResponse.status})`);
  }

  const contentType = sourceResponse.headers.get("content-type")?.split(";")[0] ?? "";
  if (!contentType.startsWith("image/")) {
    throw new Error("L'affiche source n'est pas une image valide");
  }

  // Give Fal its own hosted copy instead of relying on third-party storage access.
  const sourceBlob = new Blob([await sourceResponse.arrayBuffer()], { type: contentType });
  const falImageUrl = await fal.storage.upload(sourceBlob, {
    lifecycle: { expiresIn: "1d" },
  });

  async function runEdit(editPrompt: string) {
    return fal.subscribe("fal-ai/nano-banana/edit", {
      input: {
        prompt: editPrompt,
        image_urls: [falImageUrl],
        num_images: 1,
        output_format: "png",
        aspect_ratio: "auto",
        limit_generations: true,
      },
      logs: true,
    });
  }

  let result;
  try {
    result = await runEdit(prompt);
  } catch (error) {
    const missingImageOutput =
      error instanceof ValidationError &&
      error.fieldErrors.some((fieldError) =>
        fieldError.msg.toLowerCase().includes("did not generate the expected output")
      );

    if (!missingImageOutput || !retryPrompt) throw error;
    result = await runEdit(retryPrompt);
  }

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
${POSTER_IMAGE_EDIT_RULES}

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
- output a single edited poster
${POSTER_IMAGE_EDIT_RULES}`;
}

/**
 * Construit le prompt d'édition d'image — propre à CHAQUE affiche — combiné à la
 * demande libre de l'utilisateur. Ce prompt n'est jamais exposé au front : il est
 * dérivé des métadonnées de l'affiche (nom, catégorie, description) et encadre
 * strictement nano-banana pour préserver la composition d'origine.
 */
export function buildHiddenEditPrompt(
  template: Pick<TemplateRow, "name" | "category" | "description">,
  userRequest: string,
  community?: { name?: string | null; city?: string | null } | null
): string {
  const categoryLabel = CATEGORY_LABELS[template.category] ?? template.category;
  const contextLine = template.description ? `Contexte de l'affiche : ${template.description}` : "";
  const communityLine = community?.name
    ? `Communauté : ${community.name}${community.city ? `, ${community.city}` : ""}.`
    : "";

  return `Produis une image finale à partir de l'affiche de référence jointe.
Contexte : affiche d'une communauté juive Habad-Loubavitch, avec textes français et hébreux.
Affiche : « ${template.name} » — catégorie : ${categoryLabel}.
${contextLine}
${communityLine}

Applique UNIQUEMENT la modification demandée par l'utilisateur, et rien d'autre :
« ${userRequest} »

${POSTER_IMAGE_EDIT_RULES}`;
}

function buildConciseRetryPrompt(userRequest: string): string {
  const conciseRequest = userRequest.replace(/\s+/g, " ").trim().slice(0, 1800);
  return `Return exactly one edited poster image based on the attached image.
Apply this request: ${conciseRequest}
Keep the original layout, colors, photos, faces, logo and visual style unless the request explicitly changes them.
Do not invent event details. Keep all visible text readable. Add a small ב''ה at the top right if absent.
Output only the final image.`;
}

/**
 * Édite l'affiche via fal.ai / nano-banana à partir de la demande libre de
 * l'utilisateur et du prompt caché propre à l'affiche, puis stocke le résultat.
 */
export async function editPosterFromRequest(params: {
  admin: SupabaseClient<Database>;
  template: TemplateRow;
  communityId: string;
  userRequest: string;
  community?: { name?: string | null; city?: string | null } | null;
}) {
  const { admin, template, communityId, userRequest, community } = params;

  const sourceUrl =
    resolveTemplateAssetUrl(template.previewUrl) ?? resolveTemplateAssetUrl(template.thumbnailUrl);
  if (!sourceUrl) {
    throw new Error("Le template ne possède pas d'image source exploitable");
  }

  const promptUsed = buildHiddenEditPrompt(template, userRequest, community);
  const editedImageUrl = await editTemplateTextWithNanoBanana(
    sourceUrl,
    promptUsed,
    buildConciseRetryPrompt(userRequest)
  );
  const outputBuffer = await fetchImageBuffer(editedImageUrl);

  const storagePath = `generated/${communityId}/${template.id}-${Date.now()}.png`;
  const upload = await admin.storage
    .from("templates")
    .upload(storagePath, outputBuffer, { contentType: "image/png", upsert: false });

  if (upload.error) {
    throw new Error(upload.error.message);
  }

  const { data: publicUrl } = admin.storage.from("templates").getPublicUrl(storagePath);
  return { imageUrl: publicUrl.publicUrl, storagePath, promptUsed };
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
