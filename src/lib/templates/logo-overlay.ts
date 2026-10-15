import sharp from "sharp";

const MAX_LOGO_BYTES = 8 * 1024 * 1024;
const MAX_INPUT_PIXELS = 80_000_000;

export async function compositeOfficialLogo(
  posterBuffer: Buffer,
  logoBuffer: Buffer,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const poster = sharp(posterBuffer, {
    failOn: "warning",
    limitInputPixels: MAX_INPUT_PIXELS,
  }).rotate();
  const metadata = await poster.metadata();
  const width = metadata.width;
  const height = metadata.height;
  if (!width || !height) throw new Error("Dimensions de l’affiche invalides.");

  const margin = Math.max(12, Math.round(Math.min(width, height) * 0.025));
  const padding = Math.max(8, Math.round(Math.min(width, height) * 0.012));
  const maxLogoWidth = Math.max(48, Math.round(width * 0.16));
  const maxLogoHeight = Math.max(36, Math.round(height * 0.1));
  const logo = await sharp(logoBuffer, {
    failOn: "warning",
    limitInputPixels: MAX_INPUT_PIXELS,
  })
    .rotate()
    .resize({
      width: maxLogoWidth,
      height: maxLogoHeight,
      fit: "inside",
      withoutEnlargement: false,
    })
    .png()
    .toBuffer({ resolveWithObject: true });

  const plateWidth = logo.info.width + padding * 2;
  const plateHeight = logo.info.height + padding * 2;
  const plate = await sharp({
    create: {
      width: plateWidth,
      height: plateHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0.94 },
    },
  })
    .composite([{ input: logo.data, left: padding, top: padding }])
    .png()
    .toBuffer();

  const output = await poster
    .composite([
      {
        input: plate,
        left: Math.max(0, width - plateWidth - margin),
        top: margin,
      },
    ])
    .png()
    .toBuffer();

  return { buffer: output, width, height };
}

export async function overlayOfficialLogoFromUrl(
  posterBuffer: Buffer,
  logoUrl: string,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const response = await fetch(logoUrl, {
    signal: AbortSignal.timeout(20_000),
    headers: { Accept: "image/*" },
  });
  if (!response.ok) {
    throw new Error(`Logo officiel inaccessible (${response.status}).`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    throw new Error("Le logo officiel n’est pas une image valide.");
  }
  const logoBuffer = Buffer.from(await response.arrayBuffer());
  if (!logoBuffer.length || logoBuffer.length > MAX_LOGO_BYTES) {
    throw new Error("La taille du logo officiel est invalide.");
  }
  return compositeOfficialLogo(posterBuffer, logoBuffer);
}
