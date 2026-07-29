import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/types/database.types";
import { resolveTemplateAssetUrl } from "./shared";
import {
  composePosterWithVisualValidation,
  PosterCompositionError,
  type PosterCompositionPlan,
  type PosterTextBlock,
} from "./composition";

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
}) {
  const { admin, template, communityId, textBlocks, previousPlan } = params;
  const originalUrl = resolveTemplateAssetUrl(template.originalUrl);
  if (!originalUrl) {
    throw new PosterCompositionError(
      "TEMPLATE_SOURCE_REQUIRED",
      "Le fichier original de ce template doit être téléversé avant sa personnalisation.",
    );
  }

  const sourceBuffer = await fetchImageBuffer(originalUrl);
  const composed = await composePosterWithVisualValidation({
    originalUrl,
    sourceBuffer,
    blocks: textBlocks,
    previousPlan,
  });
  const storagePath = `generated/${communityId}/${template.id}-${Date.now()}-${crypto.randomUUID()}.png`;
  const upload = await admin.storage
    .from("templates")
    .upload(storagePath, composed.outputBuffer, {
      contentType: "image/png",
      upsert: false,
    });

  if (upload.error) throw new Error(upload.error.message);

  const { data: publicUrl } = admin.storage.from("templates").getPublicUrl(storagePath);
  return {
    imageUrl: publicUrl.publicUrl,
    storagePath,
    promptUsed: "Composition typographique dynamique sur source originale verrouillée.",
    width: composed.width,
    height: composed.height,
    size: composed.outputBuffer.length,
    plan: composed.plan,
    visualReport: composed.visualReport,
    textHash: composed.textHash,
    alreadyPresentBlockIds: composed.alreadyPresentBlockIds,
  };
}

export type {
  PosterCompositionPlan,
  PosterTextBlock,
} from "./composition";
export {
  PosterCompositionError,
  hashTextBlocks,
  normalizeFixedText,
  recordToPosterTextBlocks,
  validateCompositionPlanInput,
  validateTextBlocks,
} from "./composition";
