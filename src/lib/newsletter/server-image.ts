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

export async function normalizeNewsletterImage(input: Buffer) {
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

