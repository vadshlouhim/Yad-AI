import {
  Calendar,
  FileText,
  Send,
  Zap,
  Library,
  ShoppingBag,
  BarChart3,
  Settings,
  Bot,
  Building2,
} from "lucide-react";

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: typeof Bot | typeof Calendar | typeof FileText | typeof Send | typeof Zap | typeof Library | typeof ShoppingBag | typeof BarChart3 | typeof Settings | typeof Building2 | null;
  badge?: string;
}

export interface DashboardNavSection {
  section: string;
  items: DashboardNavItem[];
}

export const DASHBOARD_SECTION_STYLES: Record<string, {
  label: string;
  itemActive: string;
}> = {
  Principal: {
    label: "text-sky-300",
    itemActive: "bg-sky-600 text-white shadow-sm",
  },
  Communication: {
    label: "text-emerald-300",
    itemActive: "bg-emerald-600 text-white shadow-sm",
  },
  Ressources: {
    label: "text-violet-300",
    itemActive: "bg-violet-600 text-white shadow-sm",
  },
  Paramètres: {
    label: "text-amber-300",
    itemActive: "bg-amber-600 text-white shadow-sm",
  },
};

export const DASHBOARD_NAV_ITEMS: DashboardNavSection[] = [
  {
    section: "Principal",
    items: [
      { href: "/dashboard/assistant", label: "Assistant IA", icon: Bot, badge: "IA" },
      { href: "/dashboard/overview", label: "Dashboard", icon: BarChart3 },
    ],
  },
  {
    section: "Communication",
    items: [
      { href: "/dashboard/events", label: "Mon agenda", icon: Calendar },
      { href: "/dashboard/content", label: "Contenu & automatisations", icon: FileText },
      { href: "/dashboard/publications", label: "Historique des publications", icon: Send },
    ],
  },
  {
    section: "Ressources",
    items: [
      { href: "/dashboard/templates", label: "Affiches", icon: Library },
      { href: "/dashboard/hebrew-calendar", label: "Calendrier hébraïque", icon: Calendar },
      { href: "/dashboard/articles", label: "Articles", icon: ShoppingBag },
      { href: "/dashboard/media", label: "Médiathèque", icon: null },
      { href: "/dashboard/stats", label: "Statistiques", icon: null },
    ],
  },
  {
    section: "Paramètres",
    items: [
      { href: "/dashboard/community", label: "Ma communauté", icon: Building2 },
      { href: "/dashboard/settings", label: "Paramètres", icon: Settings },
    ],
  },
] as const;

export const MOBILE_PRIMARY_NAV: DashboardNavItem[] = [
  { href: "/dashboard/assistant", label: "Assistant", icon: Bot },
  { href: "/dashboard/overview", label: "Dashboard", icon: BarChart3 },
  { href: "/dashboard/events", label: "Agenda", icon: Calendar },
  { href: "/dashboard/settings", label: "Réglages", icon: Settings },
] as const;
