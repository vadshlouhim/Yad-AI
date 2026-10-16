import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { LibheifDecoder } from "@keeratita/heic-converter";
import sharp, { type Sharp } from "sharp";

export const NEWSLETTER_OUTPUT_BYTES = 4 * 1024 * 1024;
const MAX_EDGE = 2400;
const MAX_INPUT_PIXELS = 80_000_000;
let wasmBinaryPromise: Promise<Buffer> | null = null;

function heicWasmBinary() {
  wasmBinaryPromise ??= readFile(join(process.cwd(), "node_modules", "@keeratita", "heic-converter", "dist", "heic-decoder.wasm"));
  return wasmBinaryPromise;
}

function looksLikeHeif(input: Buffer) {
  if (input.length < 16 || input.toString("ascii", 4, 8) !== "ftyp") return false;
  const brands = input.subarray(8, Math.min(input.length, 48)).toString("ascii");
  return /(heic|heix|hevc|hevx|heim|heis|mif1|msf1)/.test(brands) && !/(avif|avis)/.test(brands);
}

function applyOrientation(image: Sharp, orientation?: number) {
  switch (orientation) {
    case 2: return image.flop();
    case 3: return image.rotate(180);
    case 4: return image.flip();
    case 5: return image.rotate(90).flop();
    case 6: return image.rotate(90);
    case 7: return image.rotate(90).flip();
    case 8: return image.rotate(270);
    default: return image;
  }
}

async function decodeHeic(input: Buffer) {
  const decoder = new LibheifDecoder({ wasmBinary: await heicWasmBinary() });
  try {
    await decoder.initialize();
    const decoded = await decoder.decode(new Uint8Array(input));
    if (!decoded.width || !decoded.height || decoded.width * decoded.height > MAX_INPUT_PIXELS) {
      throw new Error("dimensions");
    }
    return {
      data: Buffer.from(decoded.data),
      width: decoded.width,
      height: decoded.height,
      orientation: decoded.orientation,
    };
  } finally {
    decoder.free();
  }
}

async function newsletterImagePipeline(input: Buffer) {
  let makePipeline: () => Sharp;
  try {
    const metadata = await sharp(input, { animated: false, failOn: "error", limitInputPixels: MAX_INPUT_PIXELS }).metadata();
    if (!metadata.format || !["jpeg", "png", "webp", "gif", "avif", "magick"].includes(metadata.format)) {
      throw new Error("format");
    }
    makePipeline = () => sharp(input, { animated: false, failOn: "error", limitInputPixels: MAX_INPUT_PIXELS }).autoOrient();
  } catch (error) {
    if (!looksLikeHeif(input)) throw error;
    const decoded = await decodeHeic(input);
    makePipeline = () => applyOrientation(sharp(decoded.data, {
      raw: { width: decoded.width, height: decoded.height, channels: 4 },
      limitInputPixels: MAX_INPUT_PIXELS,
    }), decoded.orientation);
  }
  return makePipeline;
}

export async function normalizeNewsletterImage(input: Buffer) {
  const makePipeline = await newsletterImagePipeline(input);

  for (const quality of [86, 78, 68, 58]) {
    const output = await makePipeline()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
    if (output.length <= NEWSLETTER_OUTPUT_BYTES) return output;
  }
  throw new Error("output_too_large");
}

function colorDistance(data: Buffer, offset: number, color: [number, number, number]) {
  return Math.hypot(data[offset] - color[0], data[offset + 1] - color[1], data[offset + 2] - color[2]);
}

/** Remove only a light, uniform background connected to the canvas edge. */
export async function normalizeNewsletterLogo(input: Buffer) {
  const makePipeline = await newsletterImagePipeline(input);
  const { data, info } = await makePipeline()
    .resize({ width: 1000, height: 1000, fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.channels !== 4) throw new Error("logo_channels");

  const cornerRadius = Math.max(1, Math.min(5, Math.floor(Math.min(info.width, info.height) / 20)));
  const samples: Array<[number, number, number]> = [];
  for (const [originX, originY] of [[0, 0], [info.width - cornerRadius, 0], [0, info.height - cornerRadius], [info.width - cornerRadius, info.height - cornerRadius]]) {
    for (let y = originY; y < originY + cornerRadius; y++) for (let x = originX; x < originX + cornerRadius; x++) {
      const offset = (y * info.width + x) * 4;
      if (data[offset + 3] > 220) samples.push([data[offset], data[offset + 1], data[offset + 2]]);
    }
  }
  const background: [number, number, number] = [0, 1, 2].map((channel) => {
    const values = samples.map((sample) => sample[channel]).sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)] ?? 255;
  }) as [number, number, number];
  const luminance = background[0] * 0.2126 + background[1] * 0.7152 + background[2] * 0.0722;
  const uniformCorners = samples.length > 0 && samples.filter((_, index) => index % cornerRadius === 0)
    .every((sample) => Math.hypot(sample[0] - background[0], sample[1] - background[1], sample[2] - background[2]) < 42);

  let removedBackground = false;
  if (luminance >= 175 && uniformCorners) {
    const pixels = info.width * info.height;
    const visited = new Uint8Array(pixels);
    const queue = new Int32Array(pixels);
    let head = 0;
    let tail = 0;
    const enqueue = (index: number) => {
      if (visited[index]) return;
      const offset = index * 4;
      if (data[offset + 3] === 0 || colorDistance(data, offset, background) <= 62) {
        visited[index] = 1;
        queue[tail++] = index;
      }
    };
    for (let x = 0; x < info.width; x++) {
      enqueue(x);
      enqueue((info.height - 1) * info.width + x);
    }
    for (let y = 1; y < info.height - 1; y++) {
      enqueue(y * info.width);
      enqueue(y * info.width + info.width - 1);
    }
    while (head < tail) {
      const index = queue[head++];
      const offset = index * 4;
      const distance = colorDistance(data, offset, background);
      const originalAlpha = data[offset + 3];
      data[offset + 3] = distance <= 24 ? 0 : Math.round(originalAlpha * Math.min(1, (distance - 24) / 38));
      removedBackground ||= data[offset + 3] < originalAlpha;
      const x = index % info.width;
      if (x > 0) enqueue(index - 1);
      if (x + 1 < info.width) enqueue(index + 1);
      if (index >= info.width) enqueue(index - info.width);
      if (index + info.width < pixels) enqueue(index + info.width);
    }
  }

  let logo = sharp(data, { raw: info });
  if (removedBackground) logo = logo.trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 8 });
  let output = await logo.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
  if (output.length > NEWSLETTER_OUTPUT_BYTES) {
    output = await sharp(output).resize({ width: 700, height: 700, fit: "inside", withoutEnlargement: true }).png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
  }
  if (output.length > NEWSLETTER_OUTPUT_BYTES) throw new Error("output_too_large");
  return output;
}

