import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import type { Database, Tables } from "@/types/database.types";
import { resolveTemplateAssetUrl } from "./shared";
import {
  PosterCompositionError,
  hashTextBlocks,
  type PosterCompositionPlan,
  type PosterTextBlock,
} from "./composition";
import { buildAdaptiveTextOverlaySvg } from "./text-layout";
import {
  assignPosterTextBlocksToZones,
  buildBlocksFromZoneTexts,
  normalizeTemplateZones,
} from "./zones";

type TemplateRow = Tables<"Template">;

async function fetchImageBuffer(imageUrl: string): Promise<Buffer> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Impossible de télécharger le template original (${response.status})`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    throw new Error("Le template original n'est pas une image valide");
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function renderTemplatePoster(params: {
  admin: SupabaseClient<Database>;
  template: TemplateRow;
  communityId: string;
  textBlocks: PosterTextBlock[];
  previousPlan?: PosterCompositionPlan;
  zoneTexts?: Record<string, string>;
}) {
  const { admin, template, communityId, textBlocks } = params;
  const originalUrl = resolveTemplateAssetUrl(template.originalUrl);
  if (!originalUrl) {
    throw new PosterCompositionError(
      "TEMPLATE_SOURCE_REQUIRED",
      "Le fichier original de ce template doit être téléversé avant sa personnalisation.",
    );
  }

  const zones = normalizeTemplateZones(template.design);
  if (template.layoutStatus !== "READY" || zones.length === 0) {
    throw new PosterCompositionError(
      "TEMPLATE_LAYOUT_REQUIRED",
      "Cette affiche doit encore être préparée et validée par l’administrateur.",
    );
  }

  const sourceBuffer = await fetchImageBuffer(originalUrl);
  const metadata = await sharp(sourceBuffer, { failOn: "error" }).metadata();
  if (!metadata.width || !metadata.height) {
    throw new PosterCompositionError("TEMPLATE_SOURCE_REQUIRED", "Impossible de lire le template original.");
  }

  const knownZoneIds = new Set(zones.map((zone) => zone.id));
  const correctedZoneTexts = params.zoneTexts
    ? Object.fromEntries(
        Object.entries(params.zoneTexts)
          .filter(([zoneId, text]) => knownZoneIds.has(zoneId) && typeof text === "string" && text.trim().length > 0)
          .map(([zoneId, text]) => [zoneId, text.trim().slice(0, 2_000)]),
      )
    : null;
  const assignment = correctedZoneTexts
    ? {
        zoneTexts: correctedZoneTexts,
        usedTextBlocks: buildBlocksFromZoneTexts(zones, correctedZoneTexts),
        omittedBlockIds: [] as string[],
        warnings: [] as string[],
      }
    : assignPosterTextBlocksToZones(zones, textBlocks);

  if (Object.keys(assignment.zoneTexts).length === 0) {
    throw new PosterCompositionError(
      "INVALID_TEXT_BLOCKS",
      "Aucune information pertinente ne correspond aux zones de cette affiche.",
    );
  }

  const overlay = buildAdaptiveTextOverlaySvg(
    zones,
    assignment.zoneTexts,
    metadata.width,
    metadata.height,
  );
  const outputBuffer = await sharp(sourceBuffer, { failOn: "error" })
    .composite([{ input: overlay.buffer, top: 0, left: 0 }])
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
  const renderedBlocks = buildBlocksFromZoneTexts(zones, overlay.renderedTexts);
  if (renderedBlocks.length === 0) {
    throw new PosterCompositionError(
      "INVALID_TEXT_BLOCKS",
      "Les informations essentielles n’ont pas pu être affichées lisiblement sur ce modèle.",
    );
  }

  const warnings = [...assignment.warnings, ...overlay.warnings];
  const textHash = hashTextBlocks(renderedBlocks);
  const storagePath = `generated/${communityId}/${template.id}-${Date.now()}-${crypto.randomUUID()}.png`;
  const upload = await admin.storage.from("templates").upload(storagePath, outputBuffer, {
    contentType: "image/png",
    upsert: false,
  });
  if (upload.error) throw new Error(upload.error.message);

  const { data: publicUrl } = admin.storage.from("templates").getPublicUrl(storagePath);
  return {
    imageUrl: publicUrl.publicUrl,
    storagePath,
    promptUsed: "Composition déterministe dans les zones validées du modèle.",
    width: metadata.width,
    height: metadata.height,
    size: outputBuffer.length,
    plan: null,
    visualReport: {
      passed: true,
      score: 100,
      issues: warnings.map((message, index) => ({
        code: "CONTENT_ADAPTED",
        message,
        blockId: `warning_${index + 1}`,
      })),
    },
    textHash,
    alreadyPresentBlockIds: [] as string[],
    zoneTexts: overlay.renderedTexts,
    usedTextBlocks: renderedBlocks,
    omittedBlockIds: assignment.omittedBlockIds,
    warnings,
  };
}

export type { PosterCompositionPlan, PosterTextBlock } from "./composition";
export {
  PosterCompositionError,
  hashTextBlocks,
  normalizeFixedText,
  recordToPosterTextBlocks,
  validateCompositionPlanInput,
  validateTextBlocks,
} from "./composition";
