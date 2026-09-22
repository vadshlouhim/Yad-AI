import sharp from "sharp";

export type TemplateImageVariantKind = "thumbnail" | "preview";

const PRESETS: Record<TemplateImageVariantKind, { width: number; quality: number; minQuality: number; targetBytes: number }> = {
  thumbnail: { width: 480, quality: 74, minQuality: 58, targetBytes: 150 * 1024 },
  preview: { width: 1280, quality: 82, minQuality: 68, targetBytes: 500 * 1024 },
};

export interface OptimizedTemplateImage {
  buffer: Buffer;
  contentType: "image/webp";
  width: number;
  height: number;
  size: number;
  quality: number;
}

export async function optimizeTemplateImage(
  input: Buffer,
  kind: TemplateImageVariantKind,
): Promise<OptimizedTemplateImage> {
  const preset = PRESETS[kind];
  const source = sharp(input, { failOn: "warning", limitInputPixels: 80_000_000 }).rotate();
  let quality = preset.quality;
  let lastResult: Awaited<ReturnType<typeof source.toBuffer>> | null = null;

  while (quality >= preset.minQuality) {
    const result = await source
      .clone()
      .resize({ width: preset.width, withoutEnlargement: true, fit: "inside" })
      .webp({ quality, effort: 4, smartSubsample: true })
      .toBuffer({ resolveWithObject: true });
    lastResult = result;
    if (result.data.byteLength <= preset.targetBytes) break;
    quality -= 6;
  }

  if (!lastResult) throw new Error("La variante optimisée n'a pas pu être créée.");
  return {
    buffer: lastResult.data,
    contentType: "image/webp",
    width: lastResult.info.width,
    height: lastResult.info.height,
    size: lastResult.data.byteLength,
    quality: Math.max(quality, preset.minQuality),
  };
}

export async function optimizeTemplateImages(input: Buffer) {
  const [thumbnail, preview] = await Promise.all([
    optimizeTemplateImage(input, "thumbnail"),
    optimizeTemplateImage(input, "preview"),
  ]);
  return { thumbnail, preview };
}
