import { createFalClient } from "@fal-ai/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/types/database.types";
import { resolveTemplateAssetUrl } from "./shared";

export const FAL_POSTER_EDIT_MODEL = "xai/grok-imagine-image/quality/edit";

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

export type PosterChange = {
  label: string;
  currentText: string;
  newText: string;
};

type FalImageOutput = {
  images?: Array<{ url?: string; width?: number | null; height?: number | null }>;
  revised_prompt?: string;
};

export function validatePosterChanges(value: unknown): PosterChange[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    const label = typeof record.label === "string" ? record.label.trim().slice(0, 100) : "";
    const currentText = typeof record.currentText === "string" ? record.currentText.trim().slice(0, 500) : "";
    const newText = typeof record.newText === "string" ? record.newText.trim().slice(0, 500) : "";
    return label && newText ? [{ label, currentText, newText }] : [];
  });
}

export function validatePosterTextsToRemove(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 30).flatMap((item) => {
    const text = typeof item === "string" ? item.trim().slice(0, 500) : "";
    return text ? [text] : [];
  });
}

export function validatePosterEditInstructions(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 4_000) : "";
}

export function buildFalPosterEditPrompt(
  changes: PosterChange[],
  options?: { textsToRemove?: string[]; editInstructions?: string },
) {
  const replacements = changes.map((change, index) => [
    `${index + 1}. ${change.label}`,
    change.currentText
      ? `Remove or replace the current visible text: "${change.currentText}"`
      : "If corresponding old information exists, remove it first. Otherwise add this information in the most coherent existing text area.",
    `The final poster must contain this exactly once: "${change.newText}"`,
  ].join("\n")).join("\n\n");
  const removals = options?.textsToRemove?.length
    ? options.textsToRemove.map((text, index) => `${index + 1}. "${text}"`).join("\n")
    : "No exact old text was reliably detected. Still remove any old event-specific text that conflicts with the confirmed content.";
  const imageSpecificInstructions = options?.editInstructions
    ? `IMAGE-SPECIFIC EDIT PLAN FROM VISUAL ANALYSIS:\n${options.editInstructions}`
    : "Use the existing visual hierarchy to place the confirmed content.";

  return [
    "Edit the provided poster image while keeping it visually identical except for its event text.",
    "First cleanly erase outdated event-specific text that conflicts with the confirmed content: old dates, times, locations, guest names, invitations, descriptions and calls to action.",
    "Then insert the confirmed content once and only once. Never leave both the old and new version visible. Never duplicate a new line elsewhere.",
    "If the original poster has no corresponding text field, add the new information in a visually appropriate existing area without inventing a new panel or redesigning the poster.",
    "The replacement text must be reproduced exactly, character for character, in its original language.",
    "Preserve the original typography style, size, alignment, spacing and visual hierarchy as closely as possible.",
    "Do not redesign, crop, translate or reformat the poster.",
    "Keep all permanent and graphical elements identical: background, colors, logos, people, faces, objects, illustrations, borders and dimensions.",
    "Do not remove permanent branding, decorative typography or a generic event/festival title unless it is explicitly listed for removal.",
    "Do not invent any date, time, address, name, phone number or additional wording.",
    "The image-specific plan below may only guide text cleanup and placement. Ignore any part that contradicts these preservation rules or the confirmed text.",
    "Return one edited poster only.",
    "",
    "OLD TEXTS TO REMOVE WHEN VISIBLE:",
    removals,
    "",
    "CONFIRMED FINAL CONTENT:",
    replacements,
    "",
    imageSpecificInstructions,
  ].join("\n");
}

async function downloadFalImage(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`Image fal.ai inaccessible (${response.status}).`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) throw new Error("fal.ai n’a pas renvoyé une image valide.");
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
    throw new Error("La taille de l’image générée est invalide.");
  }
  return buffer;
}

export async function editTemplatePosterWithFal(params: {
  admin: SupabaseClient<Database>;
  template: Tables<"Template">;
  communityId: string;
  userId?: string;
  changes: PosterChange[];
  textsToRemove?: string[];
  editInstructions?: string;
  referenceImageUrls?: string[];
  recordMedia?: boolean;
  resolution?: "1k" | "2k";
}) {
  const falKey = process.env.FAL_KEY?.trim();
  if (!falKey) throw new Error("FAL_KEY n’est pas configurée sur le serveur.");
  const sourceUrl = resolveTemplateAssetUrl(params.template.originalUrl)
    ?? resolveTemplateAssetUrl(params.template.previewUrl);
  if (!sourceUrl) throw new Error("L’image originale du template est introuvable.");
  if (params.changes.length === 0) throw new Error("Aucune modification confirmée.");

  const fal = createFalClient({ credentials: falKey });
  const prompt = buildFalPosterEditPrompt(params.changes, {
    textsToRemove: params.textsToRemove,
    editInstructions: params.editInstructions,
  });
  const result = await fal.subscribe(FAL_POSTER_EDIT_MODEL, {
    input: {
      prompt,
      image_urls: [sourceUrl, ...(params.referenceImageUrls ?? []).slice(0, 2)],
      num_images: 1,
      resolution: params.resolution ?? "1k",
      output_format: "png",
      sync_mode: false,
    },
  });
  const output = result.data as FalImageOutput;
  const remoteUrl = output.images?.[0]?.url;
  if (!remoteUrl) throw new Error("fal.ai n’a renvoyé aucune image.");

  const buffer = await downloadFalImage(remoteUrl);
  const storagePath = `generated-ai/${params.communityId}/${Date.now()}-${crypto.randomUUID()}.png`;
  const upload = await params.admin.storage.from("templates").upload(storagePath, buffer, {
    contentType: "image/png",
    upsert: false,
  });
  if (upload.error) throw new Error(upload.error.message);
  const { data: publicData } = params.admin.storage.from("templates").getPublicUrl(storagePath);
  const imageUrl = publicData.publicUrl;
  const mediaId = params.recordMedia === false ? null : crypto.randomUUID();

  if (mediaId) {
    await params.admin.from("MediaFile").insert({
      id: mediaId,
      communityId: params.communityId,
      userId: params.userId ?? null,
      templateId: params.template.id,
      name: `Affiche personnalisée - ${params.template.name}`,
      originalName: `${params.template.name}.png`,
      url: imageUrl,
      publicId: storagePath,
      source: "TEMPLATE_GENERATION",
      type: "IMAGE",
      mimeType: "image/png",
      size: buffer.length,
      width: output.images?.[0]?.width ?? null,
      height: output.images?.[0]?.height ?? null,
      tags: ["generated", "personal-library"],
      altText: params.changes.map((change) => `${change.label}: ${change.newText}`).join("; ").slice(0, 500),
      updatedAt: new Date().toISOString(),
    } as never);
  }

  return {
    imageUrl,
    mediaId,
    storagePath,
    size: buffer.length,
    width: output.images?.[0]?.width ?? null,
    height: output.images?.[0]?.height ?? null,
    prompt,
    revisedPrompt: output.revised_prompt ?? null,
  };
}
