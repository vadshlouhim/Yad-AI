export type TemplateAvailability = "AI_ONLY" | "AI_AND_CANVA" | "CANVA_ONLY";

export interface TemplateAvailabilityFields {
  supportsAi: boolean;
  canvaUrl?: string | null;
}

export function templateAvailability(template: TemplateAvailabilityFields): TemplateAvailability {
  if (template.supportsAi && template.canvaUrl) return "AI_AND_CANVA";
  if (template.supportsAi) return "AI_ONLY";
  return "CANVA_ONLY";
}

export function hasCanva(template: Pick<TemplateAvailabilityFields, "canvaUrl">) {
  return Boolean(template.canvaUrl);
}

export function normalizeCanvaUrl(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  const raw = String(value).trim();
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Le lien Canva n'est pas une URL valide.");
  }

  const hostname = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || (hostname !== "canva.com" && !hostname.endsWith(".canva.com"))) {
    throw new Error("Utilisez un lien HTTPS officiel canva.com.");
  }

  url.hash = "";
  return url.toString();
}

export function assertTemplateDestination(fields: TemplateAvailabilityFields & { isActive?: boolean }) {
  if (fields.isActive !== false && !fields.supportsAi && !fields.canvaUrl) {
    throw new Error("Une affiche active doit être disponible avec l'IA, Canva, ou les deux.");
  }
}
