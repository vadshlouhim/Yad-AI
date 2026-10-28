/** Where a template's own logo sits, as fractions (0–1) of the poster width and height. */
export type LogoZone = { x: number; y: number; width: number; height: number };

const isFraction = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;

/** The zone is stored in the template's `design` JSON as `{ type: "logoZone", x, y, width, height }`. */
export function getTemplateLogoZone(template: { design?: unknown } | null | undefined): LogoZone | null {
  const items = Array.isArray(template?.design) ? template.design : [];
  const entry = items.find((item): item is Record<string, unknown> => typeof item === "object" && item !== null && (item as Record<string, unknown>).type === "logoZone");
  return entry ? parseLogoZone(entry) : null;
}

export function parseLogoZone(value: unknown): LogoZone | null {
  if (typeof value !== "object" || value === null) return null;
  const { x, y, width, height } = value as Record<string, unknown>;
  if (!isFraction(x) || !isFraction(y) || !isFraction(width) || !isFraction(height)) return null;
  if (width < 0.02 || height < 0.02 || x + width > 1.001 || y + height > 1.001) return null;
  return { x, y, width, height };
}

/** Replaces (or removes, with `null`) the logo zone while keeping any other design entries. */
export function withLogoZone(design: unknown, zone: LogoZone | null) {
  const others = (Array.isArray(design) ? design : []).filter((item) => !(typeof item === "object" && item !== null && (item as Record<string, unknown>).type === "logoZone"));
  return zone ? [...others, { type: "logoZone", ...zone }] : others;
}

export function describeLogoZone(zone: LogoZone) {
  const percent = (value: number) => `${Math.round(value * 100)}%`;
  return `from ${percent(zone.x)} to ${percent(zone.x + zone.width)} of the width and from ${percent(zone.y)} to ${percent(zone.y + zone.height)} of the height`;
}
