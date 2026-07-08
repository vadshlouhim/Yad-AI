import {
  Calendar,
  Users,
  FileText,
  Send,
  Zap,
  Star,
  Bell,
  Radio,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { PanelEntity } from "@/lib/ai/assistant/panels";

// Présentation par entité des panneaux interactifs de l'assistant
// (icône d'en-tête + palette du badge de statut).

export const PANEL_ENTITY_CONFIG: Record<PanelEntity, { icon: LucideIcon; badgeClass: string }> = {
  event: { icon: Calendar, badgeClass: "bg-blue-50 text-blue-700" },
  contact: { icon: Users, badgeClass: "bg-emerald-50 text-emerald-700" },
  draft: { icon: FileText, badgeClass: "bg-amber-50 text-amber-700" },
  publication: { icon: Send, badgeClass: "bg-violet-50 text-violet-700" },
  automation: { icon: Zap, badgeClass: "bg-indigo-50 text-indigo-700" },
  review: { icon: Star, badgeClass: "bg-yellow-50 text-yellow-700" },
  notification: { icon: Bell, badgeClass: "bg-rose-50 text-rose-700" },
  channel: { icon: Radio, badgeClass: "bg-green-50 text-green-700" },
  settings: { icon: Settings, badgeClass: "bg-slate-100 text-slate-600" },
};

/** Badges d'état négatif (échec, non connecté…) → palette rouge. */
export function badgeClassFor(entity: PanelEntity, badge: string | undefined): string {
  if (!badge) return PANEL_ENTITY_CONFIG[entity].badgeClass;
  if (/échec|non connecté|sans réponse|non lue|indisponible/i.test(badge)) {
    return "bg-red-50 text-red-600";
  }
  return PANEL_ENTITY_CONFIG[entity].badgeClass;
}
