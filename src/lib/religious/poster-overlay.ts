import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/types/database.types";
import type { OutputLocale } from "@/lib/ai/output-locale";
import { resolveTemplateAssetUrl } from "@/lib/templates/shared";
import { overlayOfficialLogoFromUrl } from "@/lib/templates/logo-overlay";
import { getTemplateLogoZone } from "@/lib/templates/logo-zone";
import { readFile } from "node:fs/promises";
import path from "node:path";

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

export type ReligiousPosterContent = {
  title: string;
  subtitle?: string;
  hebrewDate?: string;
  gregorianDate?: string;
  location?: string;
  entryLabel?: string;
  entryTime?: string | null;
  exitLabel?: string;
  exitTime?: string | null;
  communityName?: string;
  extraLines?: string[];
};

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character] ?? character);
}

function line(value: string | undefined, y: number, size: number, weight = 500, family = "PosterBody", fill?: string) {
  if (!value?.trim()) return "";
  return `<text x="540" y="${y}" text-anchor="middle" font-family="${family}" font-size="${size}" font-weight="${weight}"${fill ? ` fill="${fill}"` : ""}>${escapeXml(value.trim())}</text>`;
}

type Rgb = { r: number; g: number; b: number };
export type PosterPalette = { primary: string; accent: string };

const channelLuminance = (channel: number) => {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

function luminance(color: Rgb) {
  return 0.2126 * channelLuminance(color.r) + 0.7152 * channelLuminance(color.g) + 0.0722 * channelLuminance(color.b);
}

function mix(first: Rgb, second: Rgb, secondWeight: number): Rgb {
  const weight = Math.min(1, Math.max(0, secondWeight));
  return {
    r: Math.round(first.r * (1 - weight) + second.r * weight),
    g: Math.round(first.g * (1 - weight) + second.g * weight),
    b: Math.round(first.b * (1 - weight) + second.b * weight),
  };
}

function toHex(color: Rgb) {
  return `#${[color.r, color.g, color.b].map((value) => Math.min(255, Math.max(0, value)).toString(16).padStart(2, "0")).join("")}`;
}

export function posterContrastRatio(first: Rgb, second: Rgb) {
  const lighter = Math.max(luminance(first), luminance(second));
  const darker = Math.min(luminance(first), luminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

function readableOnWhite(color: Rgb) {
  let candidate = color;
  const white = { r: 255, g: 255, b: 255 };
  while (posterContrastRatio(candidate, white) < 4.8) {
    candidate = mix(candidate, { r: 12, g: 18, b: 28 }, 0.12);
  }
  return candidate;
}

/** Selects a representative template accent, then derives two deterministic, readable text colours. */
export async function extractPosterPalette(background: Buffer): Promise<PosterPalette> {
  const { data, info } = await sharp(background, { failOn: "warning", limitInputPixels: 80_000_000 })
    .rotate()
    .resize(48, 60, { fit: "cover" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const buckets = new Map<string, { count: number; r: number; g: number; b: number; saturation: number }>();

  for (let offset = 0; offset < data.length; offset += info.channels) {
    if (data[offset + 3] < 180) continue;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const maximum = Math.max(r, g, b);
    const minimum = Math.min(r, g, b);
    const saturation = maximum === 0 ? 0 : (maximum - minimum) / maximum;
    const lightness = (maximum + minimum) / 510;
    if (lightness < 0.07 || lightness > 0.91 || saturation < 0.08) continue;
    const key = `${Math.round(r / 32)}:${Math.round(g / 32)}:${Math.round(b / 32)}`;
    const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0, saturation: 0 };
    bucket.count += 1;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    bucket.saturation += saturation;
    buckets.set(key, bucket);
  }

  const selected = [...buckets.values()].sort((first, second) => {
    const firstScore = first.count * (0.45 + first.saturation / first.count);
    const secondScore = second.count * (0.45 + second.saturation / second.count);
    return secondScore - firstScore;
  })[0];
  const sampled = selected
    ? { r: Math.round(selected.r / selected.count), g: Math.round(selected.g / selected.count), b: Math.round(selected.b / selected.count) }
    : { r: 139, g: 107, b: 62 };
  const accent = readableOnWhite(sampled);
  const primary = readableOnWhite(mix(accent, { r: 17, g: 24, b: 39 }, 0.72));
  return { primary: toHex(primary), accent: toHex(accent) };
}

let embeddedFonts: Promise<{ body: string; title: string }> | null = null;
function posterFonts() {
  embeddedFonts ??= Promise.all([
    readFile(path.join(process.cwd(), "public", "fonts", "NotoSansHebrew-Variable.ttf")).then((buffer) => buffer.toString("base64")),
    readFile(path.join(process.cwd(), "public", "fonts", "FrankRuhlLibre-Variable.ttf")).then((buffer) => buffer.toString("base64")),
  ]).then(([body, title]) => ({ body, title }));
  return embeddedFonts;
}

export async function renderReligiousPoster(params: {
  background: Buffer;
  locale: OutputLocale;
  content: ReligiousPosterContent;
  embeddedHebrewFonts?: boolean;
}) {
  const direction = params.locale === "he" ? "rtl" : "ltr";
  const extra = (params.content.extraLines ?? []).filter(Boolean).slice(0, 3);
  const fonts = params.embeddedHebrewFonts ? await posterFonts() : null;
  const palette = await extractPosterPalette(params.background);
  const bodyFamily = fonts ? "PosterBody" : "Arial, 'Noto Sans Hebrew', sans-serif";
  const titleFamily = fonts && params.locale === "he" ? "PosterTitle" : bodyFamily;
  const svg = Buffer.from(`
    <svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg">
      ${fonts ? `<style>
        @font-face { font-family: PosterBody; src: url(data:font/ttf;base64,${fonts.body}); font-weight: 100 900; }
        @font-face { font-family: PosterTitle; src: url(data:font/ttf;base64,${fonts.title}); font-weight: 300 900; }
      </style>` : ""}
      <rect x="86" y="185" width="908" height="980" rx="36" fill="#ffffff" fill-opacity="0.96" stroke="${palette.accent}" stroke-opacity="0.48" stroke-width="3"/>
      <g fill="${palette.primary}" font-family="${bodyFamily}" direction="${direction}" unicode-bidi="embed">
        ${line(params.content.communityName, 275, 34, 600, bodyFamily)}
        ${line(params.content.title, 380, 66, 800, titleFamily)}
        ${line(params.content.subtitle, 455, 42, 700, bodyFamily, palette.accent)}
        ${line(params.content.hebrewDate, 520, 32, 500, bodyFamily)}
        ${line(params.content.gregorianDate, 570, 27, 400, bodyFamily)}
        ${line(params.content.location, 625, 28, 500, bodyFamily)}
        ${params.content.entryTime ? `<text x="540" y="740" text-anchor="middle" font-size="34" font-weight="600">${escapeXml(params.content.entryLabel ?? "")}: <tspan direction="ltr" unicode-bidi="embed" font-size="52" font-weight="800" fill="${palette.accent}">${escapeXml(params.content.entryTime)}</tspan></text>` : ""}
        ${params.content.exitTime ? `<text x="540" y="825" text-anchor="middle" font-size="34" font-weight="600">${escapeXml(params.content.exitLabel ?? "")}: <tspan direction="ltr" unicode-bidi="embed" font-size="52" font-weight="800" fill="${palette.accent}">${escapeXml(params.content.exitTime)}</tspan></text>` : ""}
        ${extra.map((value, index) => line(value, 910 + index * 48, 27, 450, bodyFamily)).join("")}
      </g>
    </svg>`);

  return sharp(params.background, { failOn: "warning", limitInputPixels: 80_000_000 })
    .rotate()
    .resize(1080, 1350, { fit: "cover" })
    .composite([{ input: svg, top: 0, left: 0 }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

async function downloadImage(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Image du modèle inaccessible (${response.status}).`);
  const type = response.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) throw new Error("Le modèle ne contient pas une image valide.");
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) throw new Error("La taille de l’image du modèle est invalide.");
  return buffer;
}

export async function renderReusableHolidayBackground(url: string) {
  const normalized = await sharp(await downloadImage(url), { failOn: "warning", limitInputPixels: 80_000_000 }).rotate().resize(1080, 1350, { fit: "cover" }).png().toBuffer();
  const right = await sharp(normalized).extract({ left: 540, top: 100, width: 540, height: 1250 }).resize(540, 1350, { fit: "fill" }).png().toBuffer();
  const left = await sharp(right).flop().png().toBuffer();
  return sharp({ create: { width: 1080, height: 1350, channels: 4, background: "#f8f4ec" } }).composite([{ input: left, left: 0, top: 0 }, { input: right, left: 540, top: 0 }]).png().toBuffer();
}

export async function createReligiousPoster(params: {
  admin: SupabaseClient<Database>;
  template: Tables<"Template">;
  communityId: string;
  userId?: string;
  locale: OutputLocale;
  content: ReligiousPosterContent;
  sourceImageUrl?: string;
  logoUrl?: string;
  logoWhitePlate?: boolean;
  recordMedia?: boolean;
}) {
  const sourceUrl = params.sourceImageUrl ?? resolveTemplateAssetUrl(params.template.originalUrl) ?? resolveTemplateAssetUrl(params.template.previewUrl);
  if (!sourceUrl) throw new Error("L’image originale du modèle est introuvable.");
  const source = params.template.tags?.includes("crop:right-clean") ? await renderReusableHolidayBackground(sourceUrl) : await downloadImage(sourceUrl);
  let buffer = await renderReligiousPoster({ background: source, locale: params.locale, content: params.content, embeddedHebrewFonts: params.template.tags?.includes("source:shabbat-background") });
  let width = 1080;
  let height = 1350;
  if (params.logoUrl) {
    const result = await overlayOfficialLogoFromUrl(buffer, params.logoUrl, getTemplateLogoZone(params.template), {
      whitePlate: params.logoWhitePlate,
    });
    buffer = result.buffer;
    width = result.width;
    height = result.height;
  }
  const storagePath = `generated-religious/${params.communityId}/${Date.now()}-${crypto.randomUUID()}.png`;
  const upload = await params.admin.storage.from("templates").upload(storagePath, buffer, { contentType: "image/png", upsert: false });
  if (upload.error) throw new Error(upload.error.message);
  const { data } = params.admin.storage.from("templates").getPublicUrl(storagePath);
  const mediaId = params.recordMedia === false ? null : crypto.randomUUID();
  if (mediaId) {
    await params.admin.from("MediaFile").insert({
      id: mediaId,
      communityId: params.communityId,
      userId: params.userId ?? null,
      templateId: params.template.id,
      name: `${params.content.title} - ${params.template.name}`,
      originalName: `${params.template.name}.png`,
      url: data.publicUrl,
      publicId: storagePath,
      source: "TEMPLATE_GENERATION",
      type: "IMAGE",
      mimeType: "image/png",
      size: buffer.length,
      width,
      height,
      tags: ["generated", "religious-poster", params.locale],
      altText: [params.content.title, params.content.subtitle, params.content.hebrewDate].filter(Boolean).join(" — ").slice(0, 500),
      updatedAt: new Date().toISOString(),
    }).throwOnError();
  }
  return { imageUrl: data.publicUrl, mediaId, storagePath, size: buffer.length, width, height };
}
