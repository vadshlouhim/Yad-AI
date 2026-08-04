import type { PosterTextBlock, PosterTextPriority } from "./composition";

export const TEMPLATE_LAYOUT_ANALYSIS_VERSION = 1;

export type TemplateLayoutStatus = "PENDING" | "ANALYZING" | "REVIEW" | "READY" | "FAILED";
export type TemplateZonePriority = PosterTextPriority;

export interface TemplateEditableZone {
  id: string;
  label: string;
  variableKey: string;
  variableType: string;
  defaultText: string;
  x: number;
  y: number;
  width: number;
  height: number;
  align: "left" | "center" | "right";
  fontSize: number;
  minFontSize: number;
  color: string;
  fontFamily: string;
  overflow: "shrink" | "wrap" | "truncate" | "hide";
  priority: TemplateZonePriority;
  maxCharacters: number;
  locked: boolean;
}

export interface ZoneAssignmentResult {
  zoneTexts: Record<string, string>;
  usedTextBlocks: PosterTextBlock[];
  omittedBlockIds: string[];
  warnings: string[];
}

const VALID_VARIABLE_KEYS = new Set([
  "SHABBAT_TIMES",
  "HOLIDAY_TIMES",
  "DATE",
  "TIME",
  "USER_LOGO",
  "BET_DIN_NAME",
  "TITLE",
  "SUBTITLE",
  "MESSAGE",
  "LOCATION",
  "CONTACT",
  "CUSTOM_TEXT",
]);

function numberInRange(value: unknown, fallback: number, minimum: number, maximum: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(maximum, Math.max(minimum, number));
}

function normalizeColor(value: unknown) {
  const color = String(value ?? "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toUpperCase() : "#FFFFFF";
}

function defaultPriority(variableKey: string): TemplateZonePriority {
  if (variableKey === "TITLE") return "main";
  if (["DATE", "TIME", "LOCATION", "SHABBAT_TIMES", "HOLIDAY_TIMES", "BET_DIN_NAME"].includes(variableKey)) {
    return "important";
  }
  return "complementary";
}

function defaultMaximumCharacters(variableKey: string, width: number, height: number) {
  const area = width * height;
  if (variableKey === "TITLE") return Math.round(numberInRange(area * 0.16, 72, 36, 110));
  if (["DATE", "TIME", "LOCATION", "CONTACT"].includes(variableKey)) {
    return Math.round(numberInRange(area * 0.2, 64, 24, 100));
  }
  return Math.round(numberInRange(area * 0.28, 140, 48, 280));
}

export function normalizeTemplateZones(input: unknown): TemplateEditableZone[] {
  if (!Array.isArray(input)) return [];

  return input.slice(0, 30).flatMap((value, index) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const item = value as Record<string, unknown>;
    const width = numberInRange(item.width, 60, 1, 100);
    const height = numberInRange(item.height, 14, 1, 100);
    const variableCandidate = String(item.variableKey ?? item.type ?? "MESSAGE").trim().toUpperCase();
    const variableKey = VALID_VARIABLE_KEYS.has(variableCandidate) ? variableCandidate : "MESSAGE";
    const preferredFontSize = numberInRange(item.fontSize, 42, 8, 180);
    const minimumFontSize = numberInRange(
      item.minFontSize,
      Math.max(14, Math.round(preferredFontSize * 0.48)),
      10,
      preferredFontSize,
    );
    const priorityCandidate = String(item.priority ?? "");
    const priority = priorityCandidate === "main" || priorityCandidate === "important" || priorityCandidate === "complementary"
      ? priorityCandidate
      : defaultPriority(variableKey);
    const overflowCandidate = String(item.overflow ?? "shrink");
    const overflow = overflowCandidate === "wrap" || overflowCandidate === "truncate" || overflowCandidate === "hide"
      ? overflowCandidate
      : "shrink";
    const alignCandidate = String(item.align ?? "center");
    const align = alignCandidate === "left" || alignCandidate === "right" ? alignCandidate : "center";

    return [{
      id: String(item.id ?? `zone_${index + 1}`).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100),
      label: String(item.label ?? `Zone ${index + 1}`).trim().slice(0, 100) || `Zone ${index + 1}`,
      variableKey,
      variableType: String(item.variableType ?? "TEXT").trim().slice(0, 40) || "TEXT",
      defaultText: String(item.defaultText ?? "").trim().slice(0, 500),
      x: Math.min(100 - width, numberInRange(item.x, 10, 0, 100)),
      y: Math.min(100 - height, numberInRange(item.y, 10, 0, 100)),
      width,
      height,
      align,
      fontSize: preferredFontSize,
      minFontSize: minimumFontSize,
      color: normalizeColor(item.color),
      fontFamily: String(item.fontFamily ?? "Arial, Helvetica, sans-serif").trim().slice(0, 160) || "Arial, Helvetica, sans-serif",
      overflow,
      priority,
      maxCharacters: Math.round(numberInRange(
        item.maxCharacters,
        defaultMaximumCharacters(variableKey, width, height),
        12,
        500,
      )),
      locked: Boolean(item.locked),
    }];
  });
}

export function validateTemplateZoneGeometry(zones: TemplateEditableZone[]) {
  const issues: string[] = [];
  const ids = new Set<string>();
  for (const zone of zones) {
    if (!zone.id || ids.has(zone.id)) issues.push(`Identifiant de zone invalide ou dupliqué : ${zone.id || "vide"}.`);
    ids.add(zone.id);
    if (zone.x < 0 || zone.y < 0 || zone.x + zone.width > 100 || zone.y + zone.height > 100) {
      issues.push(`La zone « ${zone.label} » dépasse le modèle.`);
    }
  }
  return issues;
}

function normalizedRole(block: PosterTextBlock) {
  return `${block.role} ${block.id}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
}

function isRole(block: PosterTextBlock, expression: RegExp) {
  return expression.test(normalizedRole(block));
}

function matchScore(zone: TemplateEditableZone, block: PosterTextBlock) {
  const key = zone.variableKey;
  const fallback = block.priority === "important" ? 15 : block.priority === "complementary" ? 10 : 5;
  if (key === "TITLE") return isRole(block, /title|titre|event|course|holiday|paracha|parasha|nom/) || block.priority === "main" ? 120 : 5;
  if (key === "DATE") return isRole(block, /date|jour/) ? 120 : fallback;
  if (key === "TIME") return isRole(block, /time|heure|horaire|entry|entree|exit|sortie|allumage|havdala/) ? 120 : fallback;
  if (key === "LOCATION") return isRole(block, /location|lieu|address|adresse|salle|city|ville/) ? 120 : fallback;
  if (key === "CONTACT") return isRole(block, /contact|phone|telephone|inscription|registration|action|reservation/) ? 120 : fallback;
  if (key === "BET_DIN_NAME") return isRole(block, /organization|organisation|structure|community|communaute/) ? 120 : fallback;
  if (key === "SHABBAT_TIMES" || key === "HOLIDAY_TIMES") {
    return isRole(block, /date|time|heure|horaire|entry|entree|exit|sortie|allumage|havdala|paracha|parasha/) ? 110 : fallback;
  }
  if (key === "SUBTITLE") return block.priority === "important" || isRole(block, /speaker|intervenant|detail/) ? 70 : 20;
  if (key === "MESSAGE" || key === "CUSTOM_TEXT") {
    if (zone.priority === "main") return block.priority === "main" ? 110 : block.priority === "important" ? 55 : 20;
    if (zone.priority === "important") return block.priority === "important" ? 95 : block.priority === "main" ? 70 : 35;
    return block.priority === "complementary" ? 75 : block.priority === "important" ? 60 : 40;
  }
  return 0;
}

function shortenDisplayText(text: string, maximum: number) {
  const normalized = text.replace(/[ \t]+/g, " ").trim();
  if (normalized.length <= maximum) return normalized;
  const excerpt = normalized.slice(0, Math.max(1, maximum - 1));
  const boundary = excerpt.lastIndexOf(" ");
  return `${excerpt.slice(0, boundary >= Math.round(maximum * 0.55) ? boundary : excerpt.length).trimEnd()}…`;
}

function mustPreserveExactText(block: PosterTextBlock) {
  return isRole(block, /date|jour|time|heure|horaire|location|lieu|address|adresse|contact|phone|telephone|speaker|intervenant|rabbin|rav|price|prix|tarif|montant/);
}

function addToZone(params: {
  zone: TemplateEditableZone;
  candidates: PosterTextBlock[];
  usedIds: Set<string>;
  allowMultiple: boolean;
}) {
  const { zone, candidates, usedIds, allowMultiple } = params;
  const ranked = candidates
    .filter((block) => !usedIds.has(block.id))
    .map((block, index) => ({ block, index, score: matchScore(zone, block) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score
      || (left.block.priority === "main" ? -1 : left.block.priority === "important" ? 0 : 1)
        - (right.block.priority === "main" ? -1 : right.block.priority === "important" ? 0 : 1)
      || left.index - right.index);

  const selected: PosterTextBlock[] = [];
  let characters = 0;
  for (const { block } of ranked) {
    if (!allowMultiple && selected.length > 0) break;
    const budget = block.priority === "important" ? Math.round(zone.maxCharacters * 1.6) : zone.maxCharacters;
    const remaining = budget - characters - (selected.length > 0 ? 1 : 0);
    if (remaining < 8) break;
    let text = block.text.trim();
    if (text.length > remaining) {
      if (block.priority === "complementary") continue;
      if (mustPreserveExactText(block)) {
        if (selected.length > 0) continue;
      } else {
        text = shortenDisplayText(text, remaining);
      }
    }
    if (!text) continue;
    selected.push({ ...block, text });
    usedIds.add(block.id);
    characters += text.length + (selected.length > 1 ? 1 : 0);
  }
  return selected;
}

export function assignPosterTextBlocksToZones(
  rawZones: TemplateEditableZone[],
  blocks: PosterTextBlock[],
): ZoneAssignmentResult {
  const zones = normalizeTemplateZones(rawZones);
  const candidates = blocks.filter((block) => block.text.trim().length > 0);
  const usedIds = new Set<string>();
  const displayedBlocks: PosterTextBlock[] = [];
  const zoneTexts: Record<string, string> = {};
  const genericKeys = new Set(["SUBTITLE", "MESSAGE", "CUSTOM_TEXT"]);
  const orderedZones = [
    ...zones.filter((zone) => !genericKeys.has(zone.variableKey)),
    ...zones.filter((zone) => genericKeys.has(zone.variableKey)),
  ];

  for (const zone of orderedZones) {
    if (zone.variableType.toUpperCase().includes("IMAGE") || zone.variableKey === "USER_LOGO") continue;
    const hasStrongCandidate = candidates.some((block) => !usedIds.has(block.id) && matchScore(zone, block) >= 100);
    const allowMultiple = ((genericKeys.has(zone.variableKey) || !hasStrongCandidate) && zone.priority !== "main")
      || zone.variableKey === "SHABBAT_TIMES"
      || zone.variableKey === "HOLIDAY_TIMES";
    const selected = addToZone({ zone, candidates, usedIds, allowMultiple });
    if (selected.length === 0) continue;
    displayedBlocks.push(...selected);
    zoneTexts[zone.id] = selected.map((block) => block.text).join("\n");
  }

  const omitted = candidates.filter((block) => !usedIds.has(block.id));
  const omittedComplementary = omitted.filter((block) => block.priority === "complementary").length;
  const omittedImportant = omitted.length - omittedComplementary;
  const warnings: string[] = [];
  if (omittedComplementary > 0) warnings.push(`${omittedComplementary} information(s) secondaire(s) masquée(s) pour préserver la lisibilité.`);
  if (omittedImportant > 0) warnings.push(`${omittedImportant} information(s) essentielle(s) n’ont pas de zone compatible sur ce modèle.`);

  return {
    zoneTexts,
    usedTextBlocks: displayedBlocks,
    omittedBlockIds: omitted.map((block) => block.id),
    warnings,
  };
}

export function buildBlocksFromZoneTexts(
  zones: TemplateEditableZone[],
  zoneTexts: Record<string, string>,
): PosterTextBlock[] {
  return normalizeTemplateZones(zones).flatMap((zone) => {
    const text = zoneTexts[zone.id]?.trim();
    if (!text || zone.variableType.toUpperCase().includes("IMAGE")) return [];
    return [{ id: zone.id, text, role: zone.variableKey.toLocaleLowerCase("en"), priority: zone.priority }];
  });
}
