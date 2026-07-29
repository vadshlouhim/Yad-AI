export interface PosterTextZone {
  id: string;
  label: string;
  type?: string;
  variableKey?: string;
  variableType?: string;
  defaultText: string;
  x: number;
  y: number;
  width: number;
  height: number;
  align?: "left" | "center" | "right";
  fontSize: number;
  color: string;
  fontFamily: string;
}

type FittedText = {
  fontSize: number;
  lineHeight: number;
  lines: string[];
};

const HEBREW_PATTERN = /[\u0590-\u05ff]/;

export class PosterTextOverflowError extends Error {
  readonly code = "TEXT_TOO_LONG";

  constructor(
    readonly zoneId: string,
    readonly zoneLabel: string
  ) {
    super(`Le texte « ${zoneLabel} » est trop long pour rester lisible dans l'emplacement prévu.`);
    this.name = "PosterTextOverflowError";
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function estimateTextWidth(value: string, fontSize: number): number {
  let units = 0;

  for (const character of value) {
    if (character === " ") units += 0.32;
    else if (HEBREW_PATTERN.test(character)) units += 0.62;
    else if (/[A-ZÀ-ÖØ-Þ]/.test(character)) units += 0.64;
    else if (/[0-9]/.test(character)) units += 0.56;
    else if (/[,.;:!?'’"()[\]{}\-–—/\\]/.test(character)) units += 0.34;
    else units += 0.52;
  }

  return units * fontSize;
}

function wrapParagraph(paragraph: string, fontSize: number, maxWidth: number): string[] | null {
  if (paragraph.length === 0) return [""];

  const words = paragraph.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (estimateTextWidth(word, fontSize) > maxWidth) return null;

    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (estimateTextWidth(candidate, fontSize) <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) lines.push(currentLine);
    currentLine = word;
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

function fitText(
  text: string,
  zone: PosterTextZone,
  canvasWidth: number,
  canvasHeight: number
): FittedText | null {
  const zoneWidth = (zone.width / 100) * canvasWidth;
  const zoneHeight = (zone.height / 100) * canvasHeight;
  const preferredFontSize = Math.max(18, Math.round(zone.fontSize));
  const minimumFontSize = Math.min(
    preferredFontSize,
    Math.max(18, Math.round(preferredFontSize * 0.58), Math.round(canvasWidth * 0.012))
  );
  const paragraphs = text.replace(/\r\n?/g, "\n").split("\n");

  for (let fontSize = preferredFontSize; fontSize >= minimumFontSize; fontSize -= 1) {
    const horizontalPadding = Math.max(2, fontSize * 0.18);
    const maxWidth = zoneWidth - horizontalPadding * 2;
    const lineHeight = fontSize * 1.18;
    const lines: string[] = [];

    if (maxWidth <= 0) return null;

    let failed = false;
    for (const paragraph of paragraphs) {
      const wrapped = wrapParagraph(paragraph, fontSize, maxWidth);
      if (!wrapped) {
        failed = true;
        break;
      }
      lines.push(...wrapped);
    }

    if (!failed && lines.length > 0 && lines.length * lineHeight <= zoneHeight) {
      return { fontSize, lineHeight, lines };
    }
  }

  return null;
}

export function isImageZone(zone: PosterTextZone): boolean {
  const key = (zone.variableKey ?? zone.type ?? "").toUpperCase();
  const variableType = (zone.variableType ?? "").toUpperCase();

  return variableType.includes("IMAGE")
    || variableType.includes("PHOTO")
    || key.includes("IMAGE")
    || key.includes("PHOTO")
    || key.includes("LOGO");
}

export function buildTextOverlaySvg(
  zones: PosterTextZone[],
  exactTexts: Record<string, string>,
  canvasWidth: number,
  canvasHeight: number
): Buffer {
  const zoneMarkup = zones
    .map((zone) => {
      const exactText = exactTexts[zone.id];
      if (typeof exactText !== "string" || exactText.trim().length === 0) return "";

      const fitted = fitText(exactText, zone, canvasWidth, canvasHeight);
      if (!fitted) {
        throw new PosterTextOverflowError(zone.id, zone.label);
      }

      const zoneLeft = (zone.x / 100) * canvasWidth;
      const zoneTop = (zone.y / 100) * canvasHeight;
      const zoneWidth = (zone.width / 100) * canvasWidth;
      const zoneHeight = (zone.height / 100) * canvasHeight;
      const containsHebrew = HEBREW_PATTERN.test(exactText);
      const configuredAlign = zone.align ?? "center";
      const align = containsHebrew && configuredAlign === "left" ? "right" : configuredAlign;
      const textAnchor = align === "left" ? "start" : align === "right" ? "end" : "middle";
      const horizontalPadding = Math.max(2, fitted.fontSize * 0.18);
      const startX =
        zoneLeft +
        (align === "left"
          ? horizontalPadding
          : align === "right"
            ? zoneWidth - horizontalPadding
            : zoneWidth / 2);
      const totalTextHeight = fitted.lines.length * fitted.lineHeight;
      const startY =
        zoneTop +
        Math.max(0, (zoneHeight - totalTextHeight) / 2) +
        fitted.fontSize;
      const fontFamily = escapeXml(zone.fontFamily || "Arial, Helvetica, sans-serif");
      const fill = escapeXml(zone.color || "#111827");

      return `
        <text
          x="${startX}"
          y="${startY}"
          text-anchor="${textAnchor}"
          font-family="${fontFamily}"
          font-size="${fitted.fontSize}"
          fill="${fill}"
          font-weight="700"
          direction="${containsHebrew ? "rtl" : "ltr"}"
          unicode-bidi="plaintext"
        >
          ${fitted.lines
            .map(
              (line, index) =>
                `<tspan x="${startX}" dy="${index === 0 ? 0 : fitted.lineHeight}">${escapeXml(line)}</tspan>`
            )
            .join("")}
        </text>
      `;
    })
    .join("");

  return Buffer.from(
    `<svg width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}" xmlns="http://www.w3.org/2000/svg">${zoneMarkup}</svg>`,
    "utf8"
  );
}
