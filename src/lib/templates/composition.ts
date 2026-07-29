import { createHash } from "node:crypto";
import OpenAI from "openai";
import sharp from "sharp";
import { z } from "zod";

export type PosterTextPriority = "main" | "important" | "complementary";

export interface PosterTextBlock {
  id: string;
  text: string;
  role: string;
  priority: PosterTextPriority;
}

export interface PosterRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedFixedText extends PosterRect {
  text: string;
}

export interface ProtectedRegion extends PosterRect {
  kind: "text" | "logo" | "illustration" | "decoration" | "frame";
  description: string;
}

export interface PosterShadow {
  color: string;
  opacity: number;
  offsetX: number;
  offsetY: number;
  blur: number;
}

export interface PosterOutline {
  color: string;
  width: number;
}

export interface PosterLayoutElement extends PosterRect {
  blockId: string;
  fontFamily: PosterFontFamily;
  fontSize: number;
  fontWeight: number;
  color: string;
  alignment: "left" | "center" | "right";
  lineHeight: number;
  letterSpacing: number;
  outline?: PosterOutline;
  shadow?: PosterShadow;
}

export interface PosterCompositionPlan {
  detectedFixedTexts: DetectedFixedText[];
  protectedRegions: ProtectedRegion[];
  elements: PosterLayoutElement[];
}

export interface VisualQualityIssue {
  code: string;
  message: string;
  blockId?: string;
}

export interface VisualQualityReport {
  passed: boolean;
  score: number;
  issues: VisualQualityIssue[];
}

export interface ValidatedPosterComposition {
  plan: PosterCompositionPlan;
  outputBuffer: Buffer;
  visualReport: VisualQualityReport;
  textHash: string;
  alreadyPresentBlockIds: string[];
  width: number;
  height: number;
}

const FONT_FAMILIES = {
  "noto-sans": '"Noto Sans Hebrew", "Noto Sans", "DejaVu Sans", Arial, sans-serif',
  "dejavu-sans": '"DejaVu Sans", Arial, sans-serif',
  arial: 'Arial, "DejaVu Sans", sans-serif',
} as const;

export type PosterFontFamily = keyof typeof FONT_FAMILIES;

const rectSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().finite().positive(),
  height: z.number().finite().positive(),
});

const detectedFixedTextSchema = rectSchema.extend({
  text: z.string().max(500),
}).strict();

const protectedRegionSchema = rectSchema.extend({
  kind: z.enum(["text", "logo", "illustration", "decoration", "frame"]),
  description: z.string().max(300).default(""),
}).strict();

const layoutElementSchema = rectSchema.extend({
  blockId: z.string().min(1).max(100),
  fontFamily: z.enum(["noto-sans", "dejavu-sans", "arial"]),
  fontSize: z.number().finite().positive(),
  fontWeight: z.number().int().min(400).max(900),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  alignment: z.enum(["left", "center", "right"]),
  lineHeight: z.number().finite().min(0.9).max(2),
  letterSpacing: z.number().finite(),
  outline: z.object({
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    width: z.number().finite().min(0),
  }).optional(),
  shadow: z.object({
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    opacity: z.number().finite().min(0).max(1),
    offsetX: z.number().finite(),
    offsetY: z.number().finite(),
    blur: z.number().finite().min(0),
  }).optional(),
}).strict();

const compositionPlanSchema = z.object({
  detectedFixedTexts: z.array(detectedFixedTextSchema).max(100).default([]),
  protectedRegions: z.array(protectedRegionSchema).max(100).default([]),
  elements: z.array(layoutElementSchema).max(30),
}).strict();

const visualReportSchema = z.object({
  passed: z.boolean(),
  score: z.number().finite().min(0).max(100),
  issues: z.array(z.object({
    code: z.string().min(1).max(80),
    message: z.string().min(1).max(500),
    blockId: z.string().min(1).max(100).optional(),
  })).max(30),
});

const PRIORITY_MINIMUMS: Record<PosterTextPriority, number> = {
  main: 0.045,
  important: 0.035,
  complementary: 0.03,
};

const MAX_ATTEMPTS = 3;
const TEXT_TOO_LONG_MESSAGE =
  "Ces informations sont trop longues pour être intégrées lisiblement dans ce template. Réduisez le texte ou choisissez un autre modèle.";

export class PosterCompositionError extends Error {
  constructor(
    readonly code:
      | "INVALID_TEXT_BLOCKS"
      | "TEMPLATE_SOURCE_REQUIRED"
      | "TEXT_TOO_LONG"
      | "LAYOUT_VALIDATION_FAILED"
      | "VISION_UNAVAILABLE",
    message: string,
  ) {
    super(message);
    this.name = "PosterCompositionError";
  }
}

export function validateTextBlocks(input: unknown): PosterTextBlock[] {
  if (!Array.isArray(input) || input.length === 0 || input.length > 30) {
    throw new PosterCompositionError(
      "INVALID_TEXT_BLOCKS",
      "Renseignez entre 1 et 30 blocs de texte.",
    );
  }

  const ids = new Set<string>();
  return input.map((value, index) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new PosterCompositionError("INVALID_TEXT_BLOCKS", `Le bloc ${index + 1} est invalide.`);
    }
    const block = value as Record<string, unknown>;
    const id = String(block.id ?? "").trim();
    const text = typeof block.text === "string" ? block.text : "";
    const role = String(block.role ?? "").trim();
    const priority = block.priority;

    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id) || ids.has(id)) {
      throw new PosterCompositionError("INVALID_TEXT_BLOCKS", `L'identifiant du bloc ${index + 1} est invalide.`);
    }
    if (!text.trim() || text.length > 10_000) {
      throw new PosterCompositionError("INVALID_TEXT_BLOCKS", `Le texte du bloc ${id} est vide ou trop long.`);
    }
    if (!role || role.length > 100) {
      throw new PosterCompositionError("INVALID_TEXT_BLOCKS", `Le rôle du bloc ${id} est invalide.`);
    }
    if (priority !== "main" && priority !== "important" && priority !== "complementary") {
      throw new PosterCompositionError("INVALID_TEXT_BLOCKS", `La priorité du bloc ${id} est invalide.`);
    }

    ids.add(id);
    return { id, text, role, priority };
  });
}

export function hashTextBlocks(blocks: PosterTextBlock[]): string {
  const canonical = blocks.map(({ id, text, role, priority }) => ({ id, text, role, priority }));
  return createHash("sha256").update(JSON.stringify(canonical), "utf8").digest("hex");
}

export function validateCompositionPlanInput(value: unknown): PosterCompositionPlan {
  const parsed = compositionPlanSchema.safeParse(value);
  if (!parsed.success) {
    throw new PosterCompositionError("INVALID_TEXT_BLOCKS", "Le plan précédent est invalide.");
  }
  return parsed.data;
}

export function recordToPosterTextBlocks(values: Record<string, string>): PosterTextBlock[] {
  const usedIds = new Set<string>();
  return Object.entries(values)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().length > 0)
    .map(([key, text], index) => {
      const normalizedKey = key
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 80) || `block_${index + 1}`;
      let id = normalizedKey;
      let suffix = 2;
      while (usedIds.has(id)) {
        id = `${normalizedKey}_${suffix}`;
        suffix += 1;
      }
      usedIds.add(id);
      const roleKey = key.toLocaleLowerCase("fr");
      const priority: PosterTextPriority = /title|titre|nom|name|paracha|parasha/.test(roleKey)
        ? "main"
        : /date|heure|time|lieu|location|adresse|entry|entree|sortie|exit/.test(roleKey)
          ? "important"
          : "complementary";
      return { id, text, role: key.slice(0, 100), priority };
    });
}

export function normalizeFixedText(value: string): string {
  return value
    .normalize("NFC")
    .toLocaleLowerCase("und")
    .replace(/[.,:;!?'"\-\u2018\u2019\u201c\u201d\u2013\u2014]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectTextDirection(text: string): "ltr" | "rtl" | "bilingual" {
  const hasHebrew = /[\u0590-\u05ff]/u.test(text);
  const hasLatin = /[A-Za-zÀ-ÖØ-öø-ÿ]/u.test(text);
  if (hasHebrew && hasLatin) return "bilingual";
  return hasHebrew ? "rtl" : "ltr";
}

export function minimumFontSize(priority: PosterTextPriority, width: number, height: number) {
  return Math.max(24, Math.ceil(Math.min(width, height) * PRIORITY_MINIMUMS[priority]));
}

function extractJson(raw: string) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? raw.match(/\{[\s\S]*\}/)?.[0];
  if (!candidate) throw new Error("Réponse JSON manquante");
  return JSON.parse(candidate) as unknown;
}

function formatHint(width: number, height: number) {
  const ratio = width / height;
  if (Math.abs(ratio - 1) < 0.08) return "instagram-square";
  if (ratio > 0.72 && ratio < 0.78 && Math.max(width, height) >= 2000) return "a4-portrait";
  return `${width}x${height}`;
}

function buildPlannerPrompt(params: {
  width: number;
  height: number;
  blocks: PosterTextBlock[];
  attempt: number;
  previousPlan?: PosterCompositionPlan;
  previousIssues?: VisualQualityIssue[];
}) {
  const { width, height, blocks, attempt, previousPlan, previousIssues } = params;
  return `Tu es un directeur artistique chargé de placer uniquement des textes sur un fond verrouillé.

Dimensions originales: ${width} x ${height}px. Format: ${formatHint(width, height)}.
Tentative: ${attempt}/${MAX_ATTEMPTS}.
Blocs exacts (tu peux les lire pour calculer leur encombrement, mais elements doit référencer uniquement blockId):
${JSON.stringify(blocks)}

Contraintes absolues:
- Le fond, les images, logos, cadres, couleurs et textes existants sont intouchables.
- Détecte tous les textes fixes et toutes les régions à protéger.
- Les rectangles protégés doivent épouser la matière occupée. Un cadre creux doit être décrit comme frame, sans interdire son intérieur vide.
- Place chaque bloc fourni, sauf s'il est déjà présent avec une égalité textuelle stricte.
- Aucune reformulation, traduction, correction, suppression ou invention.
- Les coordonnées sont en pixels dans les dimensions originales.
- Respecte des marges propres, une hiérarchie claire et un contraste élevé.
- fontFamily doit être noto-sans, dejavu-sans ou arial.
- Les tailles minimales sont: main ${minimumFontSize("main", width, height)}px, important ${minimumFontSize("important", width, height)}px, complementary ${minimumFontSize("complementary", width, height)}px.
- outline.width <= 4% de fontSize.
- shadow.opacity <= 0.35, décalages <= 6% et blur <= 12% de fontSize.
- Le plan ne contient jamais de propriété text, lines, content ou value dans elements.
${previousPlan ? `Plan précédent à remplacer par une disposition matériellement différente:\n${JSON.stringify(previousPlan)}` : ""}
${previousIssues?.length ? `Problèmes à corriger:\n${JSON.stringify(previousIssues)}` : ""}

Réponds uniquement avec ce JSON:
{
  "detectedFixedTexts": [{"text":"texte OCR exact","x":0,"y":0,"width":100,"height":40}],
  "protectedRegions": [{"kind":"logo|illustration|decoration|frame|text","description":"...","x":0,"y":0,"width":100,"height":100}],
  "elements": [{
    "blockId":"id fourni",
    "x":0,"y":0,"width":100,"height":100,
    "fontFamily":"noto-sans","fontSize":40,"fontWeight":700,
    "color":"#FFFFFF","alignment":"center","lineHeight":1.15,"letterSpacing":0,
    "outline":{"color":"#000000","width":1},
    "shadow":{"color":"#000000","opacity":0.25,"offsetX":1,"offsetY":2,"blur":3}
  }]
}`;
}

async function requestCompositionPlan(params: {
  openrouter: OpenAI;
  imageUrl: string;
  width: number;
  height: number;
  blocks: PosterTextBlock[];
  attempt: number;
  previousPlan?: PosterCompositionPlan;
  previousIssues?: VisualQualityIssue[];
}) {
  const response = await params.openrouter.chat.completions.create({
    model: process.env.POSTER_VISION_MODEL ?? "google/gemini-2.5-flash",
    max_tokens: 5000,
    response_format: { type: "json_object" },
    messages: [{
      role: "user",
      content: [
        { type: "text", text: buildPlannerPrompt(params) },
        { type: "image_url", image_url: { url: params.imageUrl } },
      ],
    }],
  });

  return compositionPlanSchema.parse(extractJson(response.choices[0]?.message?.content ?? ""));
}

function rectanglesOverlap(left: PosterRect, right: PosterRect, padding = 0) {
  return left.x < right.x + right.width + padding
    && left.x + left.width + padding > right.x
    && left.y < right.y + right.height + padding
    && left.y + left.height + padding > right.y;
}

function isSolidProtectedRegion(region: ProtectedRegion, canvasWidth: number, canvasHeight: number) {
  if (region.kind === "frame") return false;
  const coverage = (region.width * region.height) / (canvasWidth * canvasHeight);
  return !(region.kind === "decoration" && coverage >= 0.6);
}

function materiallyDifferent(current: PosterCompositionPlan, previous?: PosterCompositionPlan) {
  if (!previous) return true;
  if (current.elements.length !== previous.elements.length) return true;
  return current.elements.some((element) => {
    const old = previous.elements.find((candidate) => candidate.blockId === element.blockId);
    if (!old) return true;
    const centerShift = Math.hypot(
      element.x + element.width / 2 - (old.x + old.width / 2),
      element.y + element.height / 2 - (old.y + old.height / 2),
    );
    return centerShift >= Math.min(element.width, element.height) * 0.2
      || Math.abs(element.width - old.width) >= 12
      || Math.abs(element.height - old.height) >= 12;
  });
}

function approximateCharacterWidth(character: string, fontSize: number) {
  if (/\s/u.test(character)) return fontSize * 0.32;
  if (/[\u0590-\u05ff]/u.test(character)) return fontSize * 0.6;
  if (/[A-ZÀ-ÖØ-Þ0-9]/u.test(character)) return fontSize * 0.62;
  if (/[ilI1.,:;!'"]/u.test(character)) return fontSize * 0.3;
  return fontSize * 0.52;
}

function measureText(text: string, fontSize: number, letterSpacing: number) {
  return [...text].reduce((total, character) => total + approximateCharacterWidth(character, fontSize), 0)
    + Math.max(0, [...text].length - 1) * letterSpacing;
}

export function wrapExactText(text: string, width: number, fontSize: number, letterSpacing: number) {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    if (paragraph === "") {
      lines.push("");
      continue;
    }

    const tokens = paragraph.split(/(\s+)/).filter((token) => token.length > 0);
    let line = "";
    for (const token of tokens) {
      const candidate = `${line}${token}`;
      if (!line || measureText(candidate, fontSize, letterSpacing) <= width) {
        line = candidate;
        continue;
      }

      lines.push(line.trimEnd());
      if (measureText(token, fontSize, letterSpacing) <= width) {
        line = token.trimStart();
        continue;
      }

      let fragment = "";
      for (const character of token) {
        if (fragment && measureText(`${fragment}${character}`, fontSize, letterSpacing) > width) {
          lines.push(fragment);
          fragment = character;
        } else {
          fragment += character;
        }
      }
      line = fragment;
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

export function validatePosterCompositionPlan(params: {
  plan: PosterCompositionPlan;
  blocks: PosterTextBlock[];
  width: number;
  height: number;
  previousPlan?: PosterCompositionPlan;
}) {
  const { plan, blocks, width, height, previousPlan } = params;
  const blockMap = new Map(blocks.map((block) => [block.id, block]));
  const presentNormalized = new Set(
    plan.detectedFixedTexts.map((item) => normalizeFixedText(item.text)).filter(Boolean),
  );
  const alreadyPresentBlockIds = blocks
    .filter((block) => presentNormalized.has(normalizeFixedText(block.text)))
    .map((block) => block.id);
  const requiredIds = new Set(
    blocks.filter((block) => !alreadyPresentBlockIds.includes(block.id)).map((block) => block.id),
  );
  const plannedIds = new Set<string>();
  const margin = Math.max(8, Math.round(Math.min(width, height) * 0.012));

  if (!materiallyDifferent(plan, previousPlan)) {
    throw new Error("La nouvelle disposition est trop proche du plan précédent.");
  }

  for (const element of plan.elements) {
    const block = blockMap.get(element.blockId);
    if (!block || plannedIds.has(element.blockId) || !requiredIds.has(element.blockId)) {
      throw new Error(`Référence de bloc invalide ou dupliquée: ${element.blockId}`);
    }
    if (
      element.x < margin
      || element.y < margin
      || element.x + element.width > width - margin
      || element.y + element.height > height - margin
    ) {
      throw new Error(`Le bloc ${element.blockId} dépasse les marges du template.`);
    }

    const minimum = minimumFontSize(block.priority, width, height);
    if (element.fontSize < minimum) {
      throw new PosterCompositionError(
        "TEXT_TOO_LONG",
        `Le bloc ${element.blockId} utilise ${element.fontSize}px, sous le minimum de ${minimum}px.`,
      );
    }
    if (Math.abs(element.letterSpacing) > element.fontSize * 0.12) {
      throw new Error(`L'espacement du bloc ${element.blockId} est excessif.`);
    }
    if (element.outline && element.outline.width > element.fontSize * 0.04) {
      throw new Error(`Le contour du bloc ${element.blockId} est excessif.`);
    }
    if (element.shadow && (
      element.shadow.opacity > 0.35
      || Math.abs(element.shadow.offsetX) > element.fontSize * 0.06
      || Math.abs(element.shadow.offsetY) > element.fontSize * 0.06
      || element.shadow.blur > element.fontSize * 0.12
    )) {
      throw new Error(`L'ombre du bloc ${element.blockId} est excessive.`);
    }

    const lines = wrapExactText(block.text, element.width, element.fontSize, element.letterSpacing);
    const requiredHeight = Math.ceil(lines.length * element.fontSize * element.lineHeight);
    if (requiredHeight > element.height) {
      throw new PosterCompositionError(
        "TEXT_TOO_LONG",
        `Le bloc ${element.blockId} produit ${lines.length} ligne(s) et demande au moins ${requiredHeight}px de hauteur; la boîte en fournit ${element.height}px.`,
      );
    }
    if (plan.protectedRegions.some(
      (region) => isSolidProtectedRegion(region, width, height) && rectanglesOverlap(element, region, 2),
    )) {
      throw new Error(`Le bloc ${element.blockId} recouvre une région protégée.`);
    }
    if (plan.elements.some((other) => other !== element && rectanglesOverlap(element, other, 2))) {
      throw new Error(`Le bloc ${element.blockId} recouvre un autre texte.`);
    }
    plannedIds.add(element.blockId);
  }

  const missingIds = [...requiredIds].filter((id) => !plannedIds.has(id));
  if (missingIds.length > 0) {
    throw new PosterCompositionError(
      "TEXT_TOO_LONG",
      `Les blocs suivants doivent tous être placés: ${missingIds.join(", ")}.`,
    );
  }

  return alreadyPresentBlockIds;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function lineDirection(line: string, fallback: "ltr" | "rtl" | "bilingual") {
  const firstStrong = line.match(/[A-Za-zÀ-ÖØ-öø-ÿ\u0590-\u05ff]/u)?.[0];
  if (firstStrong && /[\u0590-\u05ff]/u.test(firstStrong)) return "rtl";
  return fallback === "rtl" ? "rtl" : "ltr";
}

function buildOverlaySvg(
  plan: PosterCompositionPlan,
  blocks: PosterTextBlock[],
  width: number,
  height: number,
) {
  const blockMap = new Map(blocks.map((block) => [block.id, block]));
  const filters: string[] = [];
  const elements = plan.elements.map((element, index) => {
    const block = blockMap.get(element.blockId);
    if (!block) throw new Error(`Bloc introuvable: ${element.blockId}`);
    const lines = wrapExactText(block.text, element.width, element.fontSize, element.letterSpacing);
    const direction = detectTextDirection(block.text);
    const anchor = element.alignment === "center" ? "middle" : element.alignment === "right" ? "end" : "start";
    const x = element.alignment === "center"
      ? element.x + element.width / 2
      : element.alignment === "right"
        ? element.x + element.width
        : element.x;
    const lineHeight = element.fontSize * element.lineHeight;
    const totalHeight = lines.length * lineHeight;
    const startY = element.y + (element.height - totalHeight) / 2 + element.fontSize;
    const filterId = `shadow-${index}`;

    if (element.shadow) {
      filters.push(`<filter id="${filterId}" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="${element.shadow.offsetX}" dy="${element.shadow.offsetY}" stdDeviation="${element.shadow.blur / 2}" flood-color="${element.shadow.color}" flood-opacity="${element.shadow.opacity}" />
      </filter>`);
    }

    const stroke = element.outline
      ? `stroke="${element.outline.color}" stroke-width="${element.outline.width}" paint-order="stroke fill"`
      : "";
    const filter = element.shadow ? `filter="url(#${filterId})"` : "";
    const tspans = lines.map((line, lineIndex) => {
      const lineDir = lineDirection(line, direction);
      return `<tspan x="${x}" y="${startY + lineIndex * lineHeight}" direction="${lineDir}" unicode-bidi="plaintext">${escapeXml(line)}</tspan>`;
    }).join("");

    return `<text font-family="${escapeXml(FONT_FAMILIES[element.fontFamily])}" font-size="${element.fontSize}" font-weight="${element.fontWeight}" fill="${element.color}" text-anchor="${anchor}" letter-spacing="${element.letterSpacing}" ${stroke} ${filter}>${tspans}</text>`;
  });

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>${filters.join("")}</defs>
      ${elements.join("")}
    </svg>`,
  );
}

async function assertBackgroundUnchanged(
  sourceBuffer: Buffer,
  outputBuffer: Buffer,
  plan: PosterCompositionPlan,
  width: number,
  height: number,
) {
  const [source, output] = await Promise.all([
    sharp(sourceBuffer).ensureAlpha().raw().toBuffer(),
    sharp(outputBuffer).ensureAlpha().raw().toBuffer(),
  ]);
  const mask = new Uint8Array(width * height);
  for (const element of plan.elements) {
    const padding = Math.ceil(element.fontSize * 0.18);
    const left = Math.max(0, Math.floor(element.x - padding));
    const right = Math.min(width, Math.ceil(element.x + element.width + padding));
    const top = Math.max(0, Math.floor(element.y - padding));
    const bottom = Math.min(height, Math.ceil(element.y + element.height + padding));
    for (let y = top; y < bottom; y += 1) {
      mask.fill(1, y * width + left, y * width + right);
    }
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (mask[y * width + x]) continue;
      const offset = (y * width + x) * 4;
      if (
        source[offset] !== output[offset]
        || source[offset + 1] !== output[offset + 1]
        || source[offset + 2] !== output[offset + 2]
        || source[offset + 3] !== output[offset + 3]
      ) {
        throw new Error("Le rendu a modifié des pixels hors de la couche textuelle.");
      }
    }
  }
}

export async function renderPosterPlanDeterministically(params: {
  sourceBuffer: Buffer;
  plan: PosterCompositionPlan;
  blocks: PosterTextBlock[];
  width: number;
  height: number;
}) {
  const overlay = buildOverlaySvg(params.plan, params.blocks, params.width, params.height);
  const outputBuffer = await sharp(params.sourceBuffer, { failOn: "error" })
    .composite([{ input: overlay, top: 0, left: 0 }])
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
  const metadata = await sharp(outputBuffer).metadata();
  if (metadata.width !== params.width || metadata.height !== params.height) {
    throw new Error("Les dimensions du rendu diffèrent du template original.");
  }
  await assertBackgroundUnchanged(
    params.sourceBuffer,
    outputBuffer,
    params.plan,
    params.width,
    params.height,
  );
  return outputBuffer;
}

async function requestVisualQualityReport(params: {
  openrouter: OpenAI;
  originalUrl: string;
  outputBuffer: Buffer;
  plan: PosterCompositionPlan;
  blocks: PosterTextBlock[];
}) {
  const previewBuffer = await sharp(params.outputBuffer)
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 88 })
    .toBuffer();
  const outputDataUrl = `data:image/jpeg;base64,${previewBuffer.toString("base64")}`;
  const prompt = `Compare le template original et le rendu composé.

Vérifie strictement:
- aucun nouveau texte ne recouvre un texte fixe, logo, illustration, cadre ou élément important;
- tous les textes sont entièrement visibles, lisibles et non tronqués;
- contraste, marges, hiérarchie, équilibre et qualité professionnelle;
- le fond n'a pas été visuellement modifié;
- les textes visibles correspondent aux blocs exacts ci-dessous.

Blocs: ${JSON.stringify(params.blocks)}
Plan: ${JSON.stringify(params.plan)}

Retourne uniquement:
{"passed":true,"score":90,"issues":[{"code":"LOW_CONTRAST","message":"...","blockId":"id optionnel"}]}
passed doit être false dès qu'une correction est nécessaire.`;

  const response = await params.openrouter.chat.completions.create({
    model: process.env.POSTER_VISION_MODEL ?? "google/gemini-2.5-flash",
    max_tokens: 1800,
    response_format: { type: "json_object" },
    messages: [{
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: params.originalUrl } },
        { type: "image_url", image_url: { url: outputDataUrl } },
      ],
    }],
  });

  return visualReportSchema.parse(extractJson(response.choices[0]?.message?.content ?? ""));
}

export async function composePosterWithVisualValidation(params: {
  originalUrl: string;
  sourceBuffer: Buffer;
  blocks: PosterTextBlock[];
  previousPlan?: PosterCompositionPlan;
}): Promise<ValidatedPosterComposition> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new PosterCompositionError(
      "VISION_UNAVAILABLE",
      "Le service d'analyse visuelle n'est pas configuré.",
    );
  }

  const metadata = await sharp(params.sourceBuffer, { failOn: "error" }).metadata();
  if (!metadata.width || !metadata.height) {
    throw new PosterCompositionError("TEMPLATE_SOURCE_REQUIRED", "Impossible de lire le template original.");
  }
  const blocks = validateTextBlocks(params.blocks);
  const textHash = hashTextBlocks(blocks);
  const openrouter = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  });
  let previousPlan = params.previousPlan;
  let previousIssues: VisualQualityIssue[] | undefined;
  let sawTextOverflow = false;
  let hadTechnicallyValidPlan = false;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const plan = await requestCompositionPlan({
        openrouter,
        imageUrl: params.originalUrl,
        width: metadata.width,
        height: metadata.height,
        blocks,
        attempt,
        previousPlan,
        previousIssues,
      });
      if (process.env.POSTER_COMPOSITION_DEBUG === "1") {
        console.warn("[Poster Composition] Plan", JSON.stringify({ attempt, plan }));
      }
      if (hashTextBlocks(blocks) !== textHash) {
        throw new Error("Le hash des textes a changé pendant la planification.");
      }
      const alreadyPresentBlockIds = validatePosterCompositionPlan({
        plan,
        blocks,
        width: metadata.width,
        height: metadata.height,
        previousPlan,
      });
      hadTechnicallyValidPlan = true;
      const outputBuffer = await renderPosterPlanDeterministically({
        sourceBuffer: params.sourceBuffer,
        plan,
        blocks,
        width: metadata.width,
        height: metadata.height,
      });
      if (hashTextBlocks(blocks) !== textHash) {
        throw new Error("Le hash des textes a changé pendant le rendu.");
      }
      const visualReport = await requestVisualQualityReport({
        openrouter,
        originalUrl: params.originalUrl,
        outputBuffer,
        plan,
        blocks,
      });
      if (process.env.POSTER_COMPOSITION_DEBUG === "1") {
        console.warn("[Poster Composition] Visual report", JSON.stringify({ attempt, visualReport }));
      }
      if (hashTextBlocks(blocks) !== textHash) {
        throw new Error("Le hash des textes a changé pendant le contrôle visuel.");
      }
      if (visualReport.passed && visualReport.score >= 80 && visualReport.issues.length === 0) {
        return {
          plan,
          outputBuffer,
          visualReport,
          textHash,
          alreadyPresentBlockIds,
          width: metadata.width,
          height: metadata.height,
        };
      }
      previousPlan = plan;
      previousIssues = visualReport.issues;
    } catch (error) {
      if (error instanceof PosterCompositionError && error.code === "TEXT_TOO_LONG") {
        sawTextOverflow = true;
      }
      previousIssues = [{
        code: error instanceof PosterCompositionError ? error.code : "INVALID_LAYOUT",
        message: error instanceof Error ? error.message : "Plan invalide",
      }];
      if (process.env.POSTER_COMPOSITION_DEBUG === "1") {
        console.warn("[Poster Composition] Attempt failed", JSON.stringify({ attempt, previousIssues }));
      }
    }
  }

  if (sawTextOverflow && !hadTechnicallyValidPlan) {
    throw new PosterCompositionError("TEXT_TOO_LONG", TEXT_TOO_LONG_MESSAGE);
  }
  throw new PosterCompositionError(
    "LAYOUT_VALIDATION_FAILED",
    "Aucune disposition n'a passé le contrôle visuel. Réessayez ou choisissez un autre modèle.",
  );
}
