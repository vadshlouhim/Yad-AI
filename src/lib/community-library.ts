export const RESOURCE_CATEGORIES = ["Cours", "Affiche", "Lettre", "Texte WhatsApp"] as const;
export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];

export const RESOURCE_THEMES = [
  "Chabbat",
  "Fêtes juives",
  "Torah",
  "Jeunesse",
  "Famille",
  "Communauté",
  "Campagne de dons",
  "Événements",
] as const;
export type ResourceTheme = (typeof RESOURCE_THEMES)[number];

export const RESOURCE_FILE_TYPES = ["pdf", "image", "text"] as const;
export type ResourceFileType = (typeof RESOURCE_FILE_TYPES)[number];

export type ResourceStatus = "draft" | "published" | "hidden" | "reported";
export type RequestStatus = "open" | "fulfilled" | "closed";
export type RequestUrgency = "low" | "medium" | "high";

export interface CommunityResource {
  id: string;
  communityId: string;
  title: string;
  description: string;
  category: ResourceCategory;
  theme: ResourceTheme;
  keywords: string[];
  language: "fr";
  fileUrl: string;
  fileType: ResourceFileType;
  fileSize: number;
  thumbnailUrl: string | null;
  status: ResourceStatus;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceRequest {
  id: string;
  communityId: string;
  title: string;
  description: string;
  category: ResourceCategory;
  theme: ResourceTheme;
  urgency: RequestUrgency;
  status: RequestStatus;
  aiRefined: boolean;
  createdAt: string;
  updatedAt: string;
}

export const MAX_FILE_SIZE = 15 * 1024 * 1024;

export const ALLOWED_MIME_TYPES: Record<ResourceFileType, string[]> = {
  pdf: ["application/pdf"],
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  text: ["text/plain", "text/html"],
};

export const STORAGE_BUCKET = "community-library";

export function detectFileType(mimeType: string): ResourceFileType | null {
  for (const [type, mimes] of Object.entries(ALLOWED_MIME_TYPES)) {
    if (mimes.includes(mimeType)) return type as ResourceFileType;
  }
  return null;
}

export function isPaidPlan(plan: string | null | undefined): boolean {
  return Boolean(plan && plan !== "FREE_TRIAL");
}

export const CATEGORY_COLORS: Record<ResourceCategory, string> = {
  Cours: "bg-violet-100 text-violet-700",
  Affiche: "bg-blue-100 text-blue-700",
  Lettre: "bg-emerald-100 text-emerald-700",
  "Texte WhatsApp": "bg-green-100 text-green-700",
};

export const THEME_COLORS: Record<ResourceTheme, string> = {
  Chabbat: "bg-amber-100 text-amber-700",
  "Fêtes juives": "bg-rose-100 text-rose-700",
  Torah: "bg-indigo-100 text-indigo-700",
  Jeunesse: "bg-sky-100 text-sky-700",
  Famille: "bg-orange-100 text-orange-700",
  Communauté: "bg-teal-100 text-teal-700",
  "Campagne de dons": "bg-yellow-100 text-yellow-700",
  Événements: "bg-pink-100 text-pink-700",
};

export const URGENCY_LABELS: Record<RequestUrgency, string> = {
  low: "Pas urgent",
  medium: "Moyen terme",
  high: "Urgent",
};
