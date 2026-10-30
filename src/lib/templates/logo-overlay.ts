import sharp from "sharp";
import type { LogoZone } from "./logo-zone";

const MAX_LOGO_BYTES = 8 * 1024 * 1024;
const MAX_INPUT_PIXELS = 80_000_000;
// Colour distance under which a pixel counts as background, and the width of the soft edge after it.
const BACKGROUND_TOLERANCE = 42;
const SOFT_EDGE = 26;

export type LogoOverlayOptions = {
  whitePlate?: boolean;
};

/**
 * Makes a plain (white or single-colour) logo background transparent, flooding in from the edges so
 * that the same colour inside the logo is kept. Logos that are already transparent, or whose
 * corners do not share one colour (a photo, a gradient), are returned unchanged.
 */
export async function removeUniformBackground(logoBuffer: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(logoBuffer, { failOn: "warning", limitInputPixels: MAX_INPUT_PIXELS })
    .rotate()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const pixel = (x: number, y: number) => (y * width + x) * 4;
  const corners = [pixel(0, 0), pixel(width - 1, 0), pixel(0, height - 1), pixel(width - 1, height - 1)];
  if (corners.some((offset) => data[offset + 3] < 200)) return sharp(logoBuffer).rotate().png().toBuffer();

  const background = [0, 1, 2].map((channel) => Math.round(corners.reduce((sum, offset) => sum + data[offset + channel], 0) / corners.length));
  const distance = (offset: number) => Math.hypot(data[offset] - background[0], data[offset + 1] - background[1], data[offset + 2] - background[2]);
  if (corners.some((offset) => distance(offset) > BACKGROUND_TOLERANCE)) return sharp(logoBuffer).rotate().png().toBuffer();

  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  const push = (x: number, y: number) => {
    const index = y * width + x;
    if (visited[index]) return;
    visited[index] = 1;
    queue[tail++] = index;
  };
  for (let x = 0; x < width; x++) { push(x, 0); push(x, height - 1); }
  for (let y = 0; y < height; y++) { push(0, y); push(width - 1, y); }

  while (head < tail) {
    const index = queue[head++];
    const offset = index * 4;
    const gap = distance(offset);
    if (gap > BACKGROUND_TOLERANCE + SOFT_EDGE) continue;
    // Fully clear the background, and fade the anti-aliased rim so edges stay smooth.
    data[offset + 3] = gap <= BACKGROUND_TOLERANCE ? 0 : Math.round(data[offset + 3] * ((gap - BACKGROUND_TOLERANCE) / SOFT_EDGE));
    if (gap > BACKGROUND_TOLERANCE) continue;
    const x = index % width;
    const y = (index - x) / width;
    if (x > 0) push(x - 1, y);
    if (x < width - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < height - 1) push(x, y + 1);
  }

  return sharp(data, { raw: { width, height, channels: 4 } }).trim({ threshold: 1 }).png().toBuffer()
    // trim fails on a fully transparent image: keep the untrimmed result then.
    .catch(() => sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer());
}

/**
 * Places the official logo inside the template's logo zone when one is known, otherwise in the
 * top-right corner. Shabbat posters can opt into a white visibility plate while other poster flows
 * keep their existing transparent treatment.
 */
export async function compositeOfficialLogo(
  posterBuffer: Buffer,
  logoBuffer: Buffer,
  zone?: LogoZone | null,
  options: LogoOverlayOptions = {},
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
  const box = zone
    ? { left: Math.round(zone.x * width), top: Math.round(zone.y * height), width: Math.max(16, Math.round(zone.width * width)), height: Math.max(16, Math.round(zone.height * height)) }
    : null;
  const platePadding = options.whitePlate
    ? Math.max(8, Math.round(Math.min(width, height) * 0.012))
    : 0;
  const maxLogoWidth = box
    ? Math.max(16, Math.round(box.width * (options.whitePlate ? 0.78 : 0.92)))
    : Math.max(48, Math.round(width * 0.16));
  const maxLogoHeight = box
    ? Math.max(16, Math.round(box.height * (options.whitePlate ? 0.66 : 0.92)))
    : Math.max(36, Math.round(height * 0.1));
  const logo = await sharp(await removeUniformBackground(logoBuffer), { limitInputPixels: MAX_INPUT_PIXELS })
    .resize({
      width: maxLogoWidth,
      height: maxLogoHeight,
      fit: "inside",
      withoutEnlargement: false,
    })
    .png()
    .toBuffer({ resolveWithObject: true });

  const requestedPlateWidth = logo.info.width + platePadding * 2;
  const requestedPlateHeight = logo.info.height + platePadding * 2;
  const plateWidth = options.whitePlate
    ? Math.min(requestedPlateWidth, box ? Math.round(box.width * 0.94) : width - margin * 2)
    : 0;
  const plateHeight = options.whitePlate
    ? Math.min(requestedPlateHeight, box ? Math.round(box.height * 0.94) : height - margin * 2)
    : 0;
  const visualWidth = options.whitePlate ? plateWidth : logo.info.width;
  const visualHeight = options.whitePlate ? plateHeight : logo.info.height;
  const visualLeft = box
    ? box.left + Math.round((box.width - visualWidth) / 2)
    : width - visualWidth - margin;
  const visualTop = box
    ? box.top + Math.round((box.height - visualHeight) / 2)
    : margin;
  const safeVisualLeft = Math.min(Math.max(0, visualLeft), Math.max(0, width - visualWidth));
  const safeVisualTop = Math.min(Math.max(0, visualTop), Math.max(0, height - visualHeight));
  const logoLeft = safeVisualLeft + Math.round((visualWidth - logo.info.width) / 2);
  const logoTop = safeVisualTop + Math.round((visualHeight - logo.info.height) / 2);

  const plate = options.whitePlate
    ? Buffer.from(`
      <svg width="${plateWidth}" height="${plateHeight}" viewBox="0 0 ${plateWidth} ${plateHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="3" width="${Math.max(1, plateWidth - 4)}" height="${Math.max(1, plateHeight - 4)}" rx="${Math.max(4, Math.round(Math.min(plateWidth, plateHeight) * 0.08))}" fill="#000000" fill-opacity="0.14"/>
        <rect x="1" y="1" width="${Math.max(1, plateWidth - 4)}" height="${Math.max(1, plateHeight - 4)}" rx="${Math.max(4, Math.round(Math.min(plateWidth, plateHeight) * 0.08))}" fill="#ffffff" stroke="#e5e7eb" stroke-width="2"/>
      </svg>`)
    : null;

  const output = await poster
    .composite([
      ...(plate ? [{ input: plate, left: safeVisualLeft, top: safeVisualTop }] : []),
      {
        input: logo.data,
        left: Math.min(Math.max(0, logoLeft), Math.max(0, width - logo.info.width)),
        top: Math.min(Math.max(0, logoTop), Math.max(0, height - logo.info.height)),
      },
    ])
    .png()
    .toBuffer();

  return { buffer: output, width, height };
}

export async function overlayOfficialLogoFromUrl(
  posterBuffer: Buffer,
  logoUrl: string,
  zone?: LogoZone | null,
  options: LogoOverlayOptions = {},
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
  return compositeOfficialLogo(posterBuffer, logoBuffer, zone, options);
}
