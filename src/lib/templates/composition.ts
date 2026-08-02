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
const LAYOUT_VALIDATION_FAILED_MESSAGE =
  "La mise en page automatique n’a pas trouvé assez d’espace libre pour tous les textes. Raccourcissez-les et répartissez les informations sur plusieurs lignes avec la touche Entrée, ou choisissez un modèle plus aéré.";

export type PosterLayoutIssueCode =
  | "PLAN_NOT_DIFFERENT"
  | "INVALID_BLOCK_REFERENCE"
  | "OUT_OF_BOUNDS"
  | "FONT_BELOW_MINIMUM"
  | "EXCESSIVE_LETTER_SPACING"
  | "EXCESSIVE_OUTLINE"
  | "EXCESSIVE_SHADOW"
  | "BOX_TOO_SMALL"
  | "PROTECTED_REGION_OVERLAP"
  | "TEXT_OVERLAP"
  | "MISSING_BLOCKS";

export class PosterLayoutValidationError extends Error {
  constructor(
    readonly code: PosterLayoutIssueCode,
    message: string,
    readonly blockId?: string,
  ) {
    super(message);
    this.name = "PosterLayoutValidationError";
  }
}

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
  const blockRequirements = getBlockPlacementRequirements(blocks, width, height);
  return `Tu es un directeur artistique chargé de placer uniquement des textes sur un fond verrouillé.

Dimensions originales: ${width} x ${height}px. Format: ${formatHint(width, height)}.
Tentative: ${attempt}/${MAX_ATTEMPTS}.
Blocs exacts (tu peux les lire pour calculer leur encombrement, mais elements doit référencer uniquement blockId):
${JSON.stringify(blocks)}
Contraintes calculées par bloc:
${JSON.stringify(blockRequirements)}

Contraintes absolues:
- Le fond, les images, logos, cadres, couleurs et textes existants sont intouchables.
- Détecte tous les textes fixes et toutes les régions à protéger.
- Les rectangles protégés doivent épouser la matière occupée. Un cadre creux doit être décrit comme frame, sans interdire son intérieur vide.
- Place chaque bloc fourni, sauf s'il est déjà présent avec une égalité textuelle stricte.
- La liste des blockId obligatoires est exactement: ${blocks.map((block) => block.id).join(", ")}.
- Avant de répondre, vérifie qu'aucun blockId obligatoire n'est oublié ou dupliqué.
- Aucune reformulation, traduction, correction, suppression ou invention.
- Les coordonnées sont en pixels dans les dimensions originales.
- Respecte des marges propres, une hiérarchie claire et un contraste élevé.
- Cherche les espaces libres sur toute la surface avant de choisir les coordonnées.
- Si un plan précédent chevauche un élément protégé, déplace entièrement le bloc concerné vers une autre zone libre; ne l'agrandis pas au même endroit.
- Si deux textes se chevauchent, répartis-les dans des zones distinctes avec une marge visible entre leurs rectangles.
- Adapte la largeur des boîtes pour provoquer des retours à la ligne lisibles sans créer de collision verticale.
- fontFamily doit être noto-sans, dejavu-sans ou arial.
- Les tailles minimales sont: main ${minimumFontSize("main", width, height)}px, important ${minimumFontSize("important", width, height)}px, complementary ${minimumFontSize("complementary", width, height)}px.
- Chaque boîte doit être assez haute pour toutes les lignes du texte exact à la taille choisie.
- Si un problème BOX_TOO_SMALL est signalé, reprends la hauteur minimale indiquée et ajoute au moins 12% de marge verticale.
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

export function getBlockPlacementRequirements(
  blocks: PosterTextBlock[],
  width: number,
  height: number,
) {
  const margin = Math.max(8, Math.round(Math.min(width, height) * 0.012));
  const availableWidth = Math.max(1, width - margin * 2);

  return blocks.map((block) => {
    const minimum = minimumFontSize(block.priority, width, height);
    const linesAtFullWidth = wrapExactText(block.text, availableWidth, minimum, 0).length;
    return {
      blockId: block.id,
      priority: block.priority,
      minimumFontSize: minimum,
      linesAtFullWidth,
      minimumHeightAtFullWidth: Math.ceil(linesAtFullWidth * minimum * 0.9),
    };
  });
}

export function findDefinitelyOverflowingBlockIds(
  blocks: PosterTextBlock[],
  width: number,
  height: number,
) {
  const margin = Math.max(8, Math.round(Math.min(width, height) * 0.012));
  const availableHeight = Math.max(1, height - margin * 2);
  return getBlockPlacementRequirements(blocks, width, height)
    .filter((requirement) => requirement.minimumHeightAtFullWidth > availableHeight)
    .map((requirement) => requirement.blockId);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function repairPosterCompositionPlan(params: {
  plan: PosterCompositionPlan;
  blocks: PosterTextBlock[];
  width: number;
  height: number;
}): PosterCompositionPlan {
  const { plan, blocks, width, height } = params;
  const blockMap = new Map(blocks.map((block) => [block.id, block]));
  const margin = Math.max(8, Math.round(Math.min(width, height) * 0.012));
  const maximumBoxHeight = Math.max(1, height - margin * 2);

  return {
    ...plan,
    elements: plan.elements.map((element) => {
      const block = blockMap.get(element.blockId);
      if (!block) return element;

      const minimum = minimumFontSize(block.priority, width, height);
      let fontSize = Math.max(element.fontSize, minimum);
      let letterSpacing = clamp(
        element.letterSpacing,
        -fontSize * 0.12,
        fontSize * 0.12,
      );
      const calculateRequiredHeight = () => Math.ceil(
        wrapExactText(block.text, element.width, fontSize, letterSpacing).length
          * fontSize
          * element.lineHeight,
      );
      let requiredHeight = calculateRequiredHeight();

      // Conserver autant que possible la boîte proposée par l'analyse visuelle.
      // Une réduction progressive évite de l'agrandir immédiatement et de créer
      // des chevauchements avec les autres textes ou les zones protégées.
      while (requiredHeight > element.height && fontSize > minimum) {
        fontSize -= 1;
        letterSpacing = clamp(element.letterSpacing, -fontSize * 0.12, fontSize * 0.12);
        requiredHeight = calculateRequiredHeight();
      }

      if (requiredHeight > maximumBoxHeight) {
        fontSize = minimum;
        letterSpacing = clamp(element.letterSpacing, -fontSize * 0.12, fontSize * 0.12);
        requiredHeight = calculateRequiredHeight();
      }

      const boxHeight = Math.min(maximumBoxHeight, Math.max(element.height, requiredHeight));
      const centeredY = element.y - (boxHeight - element.height) / 2;
      const y = clamp(centeredY, margin, height - margin - boxHeight);
      const outline = element.outline
        ? {
            ...element.outline,
            width: Math.min(element.outline.width, fontSize * 0.04),
          }
        : undefined;
      const shadow = element.shadow
        ? {
            ...element.shadow,
            opacity: Math.min(element.shadow.opacity, 0.35),
            offsetX: clamp(element.shadow.offsetX, -fontSize * 0.06, fontSize * 0.06),
            offsetY: clamp(element.shadow.offsetY, -fontSize * 0.06, fontSize * 0.06),
            blur: Math.min(element.shadow.blur, fontSize * 0.12),
          }
        : undefined;

      return {
        ...element,
        y,
        height: boxHeight,
        fontSize,
        letterSpacing,
        outline,
        shadow,
      };
    }),
  };
}

function layoutValidationError(
  code: PosterLayoutIssueCode,
  message: string,
  blockId?: string,
): never {
  throw new PosterLayoutValidationError(code, message, blockId);
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
    layoutValidationError(
      "PLAN_NOT_DIFFERENT",
      "La nouvelle disposition est trop proche du plan précédent; déplace ou redimensionne matériellement les blocs.",
    );
  }

  for (const element of plan.elements) {
    const block = blockMap.get(element.blockId);
    if (!block || plannedIds.has(element.blockId) || !requiredIds.has(element.blockId)) {
      layoutValidationError(
        "INVALID_BLOCK_REFERENCE",
        `La référence ${element.blockId} est invalide, déjà utilisée ou correspond à un texte fixe.`,
        element.blockId,
      );
    }
    if (
      element.x < margin
      || element.y < margin
      || element.x + element.width > width - margin
      || element.y + element.height > height - margin
    ) {
      layoutValidationError(
        "OUT_OF_BOUNDS",
        `Le bloc ${element.blockId} dépasse les marges de ${margin}px du template.`,
        element.blockId,
      );
    }

    const minimum = minimumFontSize(block.priority, width, height);
    if (element.fontSize < minimum) {
      layoutValidationError(
        "FONT_BELOW_MINIMUM",
        `Le bloc ${element.blockId} utilise ${element.fontSize}px, sous le minimum de ${minimum}px.`,
        element.blockId,
      );
    }
    if (Math.abs(element.letterSpacing) > element.fontSize * 0.12) {
      layoutValidationError(
        "EXCESSIVE_LETTER_SPACING",
        `L'espacement du bloc ${element.blockId} dépasse 12% de la taille de police.`,
        element.blockId,
      );
    }
    if (element.outline && element.outline.width > element.fontSize * 0.04) {
      layoutValidationError(
        "EXCESSIVE_OUTLINE",
        `Le contour du bloc ${element.blockId} dépasse 4% de la taille de police.`,
        element.blockId,
      );
    }
    if (element.shadow && (
      element.shadow.opacity > 0.35
      || Math.abs(element.shadow.offsetX) > element.fontSize * 0.06
      || Math.abs(element.shadow.offsetY) > element.fontSize * 0.06
      || element.shadow.blur > element.fontSize * 0.12
    )) {
      layoutValidationError(
        "EXCESSIVE_SHADOW",
        `L'ombre du bloc ${element.blockId} dépasse les limites autorisées.`,
        element.blockId,
      );
    }

    const lines = wrapExactText(block.text, element.width, element.fontSize, element.letterSpacing);
    const requiredHeight = Math.ceil(lines.length * element.fontSize * element.lineHeight);
    if (requiredHeight > element.height) {
      layoutValidationError(
        "BOX_TOO_SMALL",
        `Le bloc ${element.blockId} produit ${lines.length} ligne(s) et demande au moins ${requiredHeight}px de hauteur; la boîte en fournit ${element.height}px.`,
        element.blockId,
      );
    }
    if (plan.protectedRegions.some(
      (region) => isSolidProtectedRegion(region, width, height) && rectanglesOverlap(element, region, 2),
    )) {
      layoutValidationError(
        "PROTECTED_REGION_OVERLAP",
        `Le bloc ${element.blockId} recouvre une région protégée; déplace-le dans un espace libre.`,
        element.blockId,
      );
    }
    if (plan.elements.some((other) => other !== element && rectanglesOverlap(element, other, 2))) {
      layoutValidationError(
        "TEXT_OVERLAP",
        `Le bloc ${element.blockId} recouvre un autre texte; sépare les boîtes.`,
        element.blockId,
      );
    }
    plannedIds.add(element.blockId);
  }

  const missingIds = [...requiredIds].filter((id) => !plannedIds.has(id));
  if (missingIds.length > 0) {
    layoutValidationError(
      "MISSING_BLOCKS",
      `Ajoute un élément distinct pour chacun de ces blockId obligatoires: ${missingIds.join(", ")}.`,
      missingIds[0],
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

function issueFromCompositionFailure(error: unknown): VisualQualityIssue {
  if (error instanceof PosterLayoutValidationError) {
    return {
      code: error.code,
      message: error.message,
      blockId: error.blockId,
    };
  }
  if (error instanceof PosterCompositionError) {
    return { code: error.code, message: error.message };
  }
  return {
    code: "INVALID_LAYOUT",
    message: error instanceof Error ? error.message : "Plan invalide",
  };
}

function actionableLayoutMessage(issue?: VisualQualityIssue) {
  if (!issue) return LAYOUT_VALIDATION_FAILED_MESSAGE;
  if (issue.code === "BOX_TOO_SMALL" || issue.code === "OUT_OF_BOUNDS" || issue.code === "FONT_BELOW_MINIMUM") {
    return "Un ou plusieurs textes ne tiennent pas lisiblement dans l’espace disponible. Raccourcissez-les et écrivez chaque information sur une ligne séparée avec la touche Entrée.";
  }
  if (issue.code === "PROTECTED_REGION_OVERLAP" || issue.code === "TEXT_OVERLAP") {
    return "Les textes se chevauchent ou recouvrent un élément important du modèle. Répartissez les informations sur plusieurs lignes, réduisez leur longueur ou choisissez un modèle plus aéré.";
  }
  if (issue.code === "LOW_CONTRAST") {
    return "Le contraste du texte est insuffisant sur ce modèle. Réessayez pour obtenir une autre disposition ou choisissez un modèle avec une zone de texte plus claire.";
  }
  return LAYOUT_VALIDATION_FAILED_MESSAGE;
}

function debugPlanSummary(attempt: number, plan: PosterCompositionPlan) {
  return {
    attempt,
    detectedFixedTextCount: plan.detectedFixedTexts.length,
    protectedRegionCount: plan.protectedRegions.length,
    elements: plan.elements.map((element) => ({
      blockId: element.blockId,
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      fontSize: element.fontSize,
    })),
  };
}

function debugReportSummary(attempt: number, report: VisualQualityReport) {
  return {
    attempt,
    passed: report.passed,
    score: report.score,
    issues: report.issues.map(({ code, blockId }) => ({ code, blockId })),
  };
}

function debugFailureDetails(error: unknown) {
  if (error instanceof z.ZodError) {
    return {
      name: error.name,
      issues: error.issues.map((issue) => ({
        code: issue.code,
        path: issue.path.join("."),
        expected: "expected" in issue ? issue.expected : undefined,
      })),
    };
  }
  if (error instanceof OpenAI.APIError) {
    return {
      name: error.name,
      status: error.status,
      code: error.code,
      type: error.type,
    };
  }
  return {
    name: error instanceof Error ? error.name : "UnknownError",
  };
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
  const definitelyOverflowingBlockIds = findDefinitelyOverflowingBlockIds(
    blocks,
    metadata.width,
    metadata.height,
  );
  if (definitelyOverflowingBlockIds.length > 0) {
    if (process.env.POSTER_COMPOSITION_DEBUG === "1") {
      console.warn("[Poster Composition] Definite overflow", JSON.stringify({
        blockIds: definitelyOverflowingBlockIds,
        width: metadata.width,
        height: metadata.height,
      }));
    }
    throw new PosterCompositionError("TEXT_TOO_LONG", TEXT_TOO_LONG_MESSAGE);
  }
  const openrouter = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  });
  let previousPlan = params.previousPlan;
  let previousIssues: VisualQualityIssue[] | undefined;
  let lastFailure: unknown;
  let lastVisualIssues: VisualQualityIssue[] | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let attemptedPlan: PosterCompositionPlan | undefined;
    try {
      const requestedPlan = await requestCompositionPlan({
        openrouter,
        imageUrl: params.originalUrl,
        width: metadata.width,
        height: metadata.height,
        blocks,
        attempt,
        previousPlan,
        previousIssues,
      });
      const plan = repairPosterCompositionPlan({
        plan: requestedPlan,
        blocks,
        width: metadata.width,
        height: metadata.height,
      });
      attemptedPlan = plan;
      if (process.env.POSTER_COMPOSITION_DEBUG === "1") {
        console.warn("[Poster Composition] Plan", JSON.stringify(debugPlanSummary(attempt, plan)));
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
        console.warn(
          "[Poster Composition] Visual report",
          JSON.stringify(debugReportSummary(attempt, visualReport)),
        );
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
      lastFailure = undefined;
      lastVisualIssues = visualReport.issues;
      previousPlan = plan;
      previousIssues = visualReport.issues;
    } catch (error) {
      lastFailure = error;
      lastVisualIssues = undefined;
      if (attemptedPlan) {
        previousPlan = attemptedPlan;
      }
      previousIssues = [issueFromCompositionFailure(error)];
      if (process.env.POSTER_COMPOSITION_DEBUG === "1") {
        console.warn("[Poster Composition] Attempt failed", JSON.stringify({
          attempt,
          issues: previousIssues.map(({ code, blockId }) => ({ code, blockId })),
          failure: debugFailureDetails(error),
        }));
      }
    }
  }

  if (lastFailure instanceof PosterCompositionError) throw lastFailure;
  if (lastFailure instanceof PosterLayoutValidationError) {
    throw new PosterCompositionError(
      "LAYOUT_VALIDATION_FAILED",
      actionableLayoutMessage(issueFromCompositionFailure(lastFailure)),
    );
  }
  if (lastFailure instanceof OpenAI.APIError || lastFailure instanceof z.ZodError) {
    throw new PosterCompositionError(
      "VISION_UNAVAILABLE",
      "Le service de composition visuelle n’a pas répondu correctement. Réessayez dans quelques instants.",
    );
  }
  if (lastVisualIssues?.length) {
    throw new PosterCompositionError(
      "LAYOUT_VALIDATION_FAILED",
      actionableLayoutMessage(lastVisualIssues[0]),
    );
  }

  throw new PosterCompositionError(
    "LAYOUT_VALIDATION_FAILED",
    LAYOUT_VALIDATION_FAILED_MESSAGE,
  );
}
