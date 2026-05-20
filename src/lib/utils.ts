import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistance, isToday, isTomorrow, isPast } from "date-fns";
import { fr } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formatage de dates en français
export function formatDate(date: Date | string, pattern = "d MMMM yyyy") {
  return format(new Date(date), pattern, { locale: fr });
}

export function formatDateTime(date: Date | string) {
  return format(new Date(date), "d MMMM yyyy 'à' HH:mm", { locale: fr });
}

export function formatRelative(date: Date | string) {
  return formatDistance(new Date(date), new Date(), {
    addSuffix: true,
    locale: fr,
  });
}

export function formatEventDate(date: Date | string): string {
  const d = new Date(date);
  if (isToday(d)) return `Aujourd'hui à ${format(d, "HH:mm")}`;
  if (isTomorrow(d)) return `Demain à ${format(d, "HH:mm")}`;
  return formatDateTime(d);
}

export function isEventPast(date: Date | string): boolean {
  return isPast(new Date(date));
}

// Génération de slug
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

// Troncature de texte
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

// Formatage de taille de fichier
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "Ko", "Mo", "Go"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Génération d'initiales
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

// Validation URL
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Couleurs par catégorie d'événement
export const EVENT_CATEGORY_COLORS: Record<string, string> = {
  SHABBAT: "bg-blue-100 text-blue-800 border-blue-200",
  HOLIDAY: "bg-amber-100 text-amber-800 border-amber-200",
  COURSE: "bg-green-100 text-green-800 border-green-200",
  PRAYER: "bg-purple-100 text-purple-800 border-purple-200",
  COMMUNITY: "bg-indigo-100 text-indigo-800 border-indigo-200",
  YOUTH: "bg-pink-100 text-pink-800 border-pink-200",
  CULTURAL: "bg-cyan-100 text-cyan-800 border-cyan-200",
  FUNDRAISING: "bg-orange-100 text-orange-800 border-orange-200",
  ANNOUNCEMENT: "bg-gray-100 text-gray-800 border-gray-200",
  OTHER: "bg-slate-100 text-slate-800 border-slate-200",
};

// Labels français pour les enums
export const EVENT_CATEGORY_LABELS: Record<string, string> = {
  SHABBAT: "Chabbat",
  HOLIDAY: "Fête",
  COURSE: "Cours",
  PRAYER: "Prière",
  COMMUNITY: "Communautaire",
  YOUTH: "Jeunesse",
  CULTURAL: "Culture",
  FUNDRAISING: "Collecte",
  ANNOUNCEMENT: "Annonce",
  OTHER: "Autre",
};

export const EVENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  READY: "Prêt",
  SCHEDULED: "Programmé",
  PUBLISHED: "Publié",
  COMPLETED: "Terminé",
  ARCHIVED: "Archivé",
};

export const CHANNEL_LABELS: Record<string, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  WHATSAPP: "WhatsApp",
  TELEGRAM: "Telegram",
  EMAIL: "Email",
  WEB: "Site web",
};

export const CONTENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  AI_PROPOSAL: "Proposition IA",
  READY_TO_PUBLISH: "Prêt à publier",
  PENDING_VALIDATION: "En attente de validation",
  APPROVED: "Approuvé",
  PUBLISHED: "Publié",
  ARCHIVED: "Archivé",
};

export const PUBLICATION_STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  SCHEDULED: "Programmé",
  PUBLISHING: "Publication en cours",
  PUBLISHED: "Publié",
  FAILED: "Échec",
  CANCELLED: "Annulé",
  FALLBACK_READY: "Export prêt",
};
