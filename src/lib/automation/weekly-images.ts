import { getNextWeeklyRunAt } from "./shabbat-times";

export const WEEKLY_IMAGES_AUTOMATION_NAME = "Cette semaine en images";
export const WEEKLY_IMAGES_TEMPLATE_CATEGORY = "Cette semaine en images";

export const DEFAULT_WEEKLY_IMAGES_TIME = "10:00";
export const DEFAULT_WEEKLY_IMAGES_DAY = 5; // vendredi
export const DEFAULT_TIMEZONE = "Europe/Paris";
export const MAX_WEEKLY_PHOTOS = 10;

export const WEEKLY_IMAGES_CHANNELS = ["INSTAGRAM", "FACEBOOK", "WHATSAPP"] as const;
export type WeeklyImagesChannel = (typeof WEEKLY_IMAGES_CHANNELS)[number];

// Les 3 fonds disponibles (mises en page recréées en HTML/CSS, format carré 1080).
export const WEEKLY_IMAGE_STYLES = [
  { id: "grid", name: "Grille classique", subtitle: "Les moments forts de notre communauté" },
  { id: "magazine", name: "Magazine", subtitle: "Cours • événements • vie communautaire" },
  { id: "scrapbook", name: "Moments partagés", subtitle: "Retour sur les plus beaux moments" },
] as const;

export type WeeklyImageStyleId = (typeof WEEKLY_IMAGE_STYLES)[number]["id"];

export function isWeeklyImageStyleId(value: unknown): value is WeeklyImageStyleId {
  return typeof value === "string" && WEEKLY_IMAGE_STYLES.some((s) => s.id === value);
}

export type WeeklyImagesStatus = "active" | "paused";

export type WeeklyImagesSettings = {
  status: WeeklyImagesStatus;
  notificationDay: number; // 0 = dimanche … 6 = samedi
  notificationTime: string; // "HH:MM" (heure locale Europe/Paris)
  timezone: string;
  selectedBackgroundTemplateId: string | null;
  channels: WeeklyImagesChannel[];
};

export type WeeklyImagesRun = {
  id: string;
  publishedAt: string; // ISO
  photoCount: number;
  channels: WeeklyImagesChannel[];
  visualUrls: string[];
  draftId?: string;
};

export type WeeklyImagesHistory = WeeklyImagesRun[];

export const DEFAULT_WEEKLY_IMAGES_SETTINGS: WeeklyImagesSettings = {
  status: "active",
  notificationDay: DEFAULT_WEEKLY_IMAGES_DAY,
  notificationTime: DEFAULT_WEEKLY_IMAGES_TIME,
  timezone: DEFAULT_TIMEZONE,
  selectedBackgroundTemplateId: null,
  channels: ["INSTAGRAM", "FACEBOOK", "WHATSAPP"],
};

export const WEEKLY_DAY_LABELS: Record<number, string> = {
  0: "Dimanche",
  1: "Lundi",
  2: "Mardi",
  3: "Mercredi",
  4: "Jeudi",
  5: "Vendredi",
  6: "Samedi",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

/** Prochaine occurrence hebdomadaire (jour + heure) en UTC. */
export function nextWeeklyImagesRunAt(settings: WeeklyImagesSettings, from = new Date()): Date {
  return getNextWeeklyRunAt({
    dayOfWeek: settings.notificationDay,
    time: settings.notificationTime,
    timezone: settings.timezone || DEFAULT_TIMEZONE,
    from,
  });
}

export function getWeeklyImagesSettings(triggerConfig: unknown): WeeklyImagesSettings | null {
  if (!isRecord(triggerConfig)) return null;
  const value = triggerConfig.weeklyImagesSettings;
  if (!isRecord(value)) return null;
  return value as unknown as WeeklyImagesSettings;
}

export function getWeeklyImagesHistory(triggerConfig: unknown): WeeklyImagesHistory {
  if (!isRecord(triggerConfig)) return [];
  const value = triggerConfig.weeklyImagesHistory;
  return Array.isArray(value) ? (value as WeeklyImagesHistory) : [];
}

/** Texte de publication par défaut, avec le nom de la structure et la ville. */
export function defaultWeeklyImagesCaption(params: { communityName?: string | null; city?: string | null }): string {
  const city = params.city?.trim();
  if (city) return `Retour en images sur les événements de cette semaine avec le Beth Habad de ${city}.`;
  const name = params.communityName?.trim();
  if (name) return `Retour en images sur les événements de cette semaine avec ${name}.`;
  return "Retour en images sur les événements de cette semaine.";
}
