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

function line(value: string | undefined, y: number, size: number, weight = 500, family = "PosterBody") {
  if (!value?.trim()) return "";
  return `<text x="540" y="${y}" text-anchor="middle" font-family="${family}" font-size="${size}" font-weight="${weight}">${escapeXml(value.trim())}</text>`;
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
  const bodyFamily = fonts ? "PosterBody" : "Arial, 'Noto Sans Hebrew', sans-serif";
  const titleFamily = fonts && params.locale === "he" ? "PosterTitle" : bodyFamily;
  const svg = Buffer.from(`
    <svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg">
      ${fonts ? `<style>
        @font-face { font-family: PosterBody; src: url(data:font/ttf;base64,${fonts.body}); font-weight: 100 900; }
        @font-face { font-family: PosterTitle; src: url(data:font/ttf;base64,${fonts.title}); font-weight: 300 900; }
      </style>` : ""}
      <rect x="86" y="185" width="908" height="980" rx="36" fill="#ffffff" fill-opacity="0.92" stroke="#7c3aed" stroke-opacity="0.32" stroke-width="3"/>
      <g fill="#24173d" font-family="${bodyFamily}" direction="${direction}" unicode-bidi="embed">
        ${line(params.content.communityName, 275, 34, 600, bodyFamily)}
        ${line(params.content.title, 380, 66, 800, titleFamily)}
        ${line(params.content.subtitle, 455, 42, 700, bodyFamily)}
        ${line(params.content.hebrewDate, 520, 32, 500, bodyFamily)}
        ${line(params.content.gregorianDate, 570, 27, 400, bodyFamily)}
        ${line(params.content.location, 625, 28, 500, bodyFamily)}
        ${params.content.entryTime ? `<text x="540" y="740" text-anchor="middle" font-size="34" font-weight="600">${escapeXml(params.content.entryLabel ?? "")}: <tspan direction="ltr" unicode-bidi="embed" font-size="52" font-weight="800">${escapeXml(params.content.entryTime)}</tspan></text>` : ""}
        ${params.content.exitTime ? `<text x="540" y="825" text-anchor="middle" font-size="34" font-weight="600">${escapeXml(params.content.exitLabel ?? "")}: <tspan direction="ltr" unicode-bidi="embed" font-size="52" font-weight="800">${escapeXml(params.content.exitTime)}</tspan></text>` : ""}
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
  recordMedia?: boolean;
}) {
  const sourceUrl = params.sourceImageUrl ?? resolveTemplateAssetUrl(params.template.originalUrl) ?? resolveTemplateAssetUrl(params.template.previewUrl);
  if (!sourceUrl) throw new Error("L’image originale du modèle est introuvable.");
  const source = params.template.tags?.includes("crop:right-clean") ? await renderReusableHolidayBackground(sourceUrl) : await downloadImage(sourceUrl);
  let buffer = await renderReligiousPoster({ background: source, locale: params.locale, content: params.content, embeddedHebrewFonts: params.template.tags?.includes("source:shabbat-background") });
  let width = 1080;
  let height = 1350;
  if (params.logoUrl) {
    const result = await overlayOfficialLogoFromUrl(buffer, params.logoUrl, getTemplateLogoZone(params.template));
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
