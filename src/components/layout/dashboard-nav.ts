import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, Share2, Zap, MessageSquare,
  Bot, BookOpen, Image, Video, CalendarDays, Calendar,
  ShoppingBag, Globe, Settings, HelpCircle, Mail, History, Clock3,
} from "lucide-react";

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: LucideIcon | null;
  badge?: string;
  action?: { label: string; href: string };
  external?: boolean;
  isQuickAction?: boolean;
}

export interface DashboardNavSection {
  section: string;
  items: DashboardNavItem[];
}

export const DASHBOARD_SECTION_STYLES: Record<string, { label: string; itemActive: string }> = {
  "GESTION DES RÉSEAUX SOCIAUX": {
    label: "text-emerald-300",
    itemActive: "bg-emerald-700 text-white shadow-sm",
  },
  "MESSAGERIE CONNECTÉE": {
    label: "text-cyan-300",
    itemActive: "bg-cyan-700 text-white shadow-sm",
  },
  "ASSISTANT IA": {
    label: "text-blue-300",
    itemActive: "bg-blue-600 text-white shadow-sm",
  },
  "RÉSEAUX SOCIAUX": {
    label: "text-emerald-300",
    itemActive: "bg-emerald-700 text-white shadow-sm",
  },
  "ASSISTANT PERSONNEL": {
    label: "text-cyan-300",
    itemActive: "bg-cyan-700 text-white shadow-sm",
  },
  "RESSOURCES": {
    label: "text-violet-300",
    itemActive: "bg-violet-600 text-white shadow-sm",
  },
  "BANQUE VISUELLE": {
    label: "text-amber-300",
    itemActive: "bg-amber-600 text-white shadow-sm",
  },
  "SERVICES": {
    label: "text-rose-300",
    itemActive: "bg-rose-600 text-white shadow-sm",
  },
};

// Item standalone affiché en haut, avant toutes les sections
export const DASHBOARD_TOP_ITEM: DashboardNavItem = {
  href: "/dashboard/overview",
  label: "Tableau de bord",
  icon: LayoutDashboard,
};

export const DASHBOARD_NAV_ITEMS: DashboardNavSection[] = [
  {
    section: "ASSISTANT IA",
    items: [{ href: "/dashboard/assistant", label: "Assistant IA", icon: Bot }],
  },
  {
    section: "RÉSEAUX SOCIAUX",
    items: [
      { href: "/dashboard/settings/channels", label: "Connecter mes réseaux", icon: Share2 },
      { href: "/dashboard/automations", label: "Automatisations", icon: Zap },
      { href: "/dashboard/messaging", label: "Messagerie", icon: MessageSquare },
      { href: "/dashboard/publications", label: "Historique des publications", icon: History },
    ],
  },
  {
    section: "ASSISTANT PERSONNEL",
    items: [
      { href: "/dashboard/events", label: "Agenda et quotidien", icon: CalendarDays },
    ],
  },
  {
    section: "RESSOURCES",
    items: [
      { href: "/dashboard/torah", label: "Cours de Torah IA", icon: BookOpen },
      { href: "/dashboard/hebrew-calendar", label: "Calendrier hébraïque", icon: Calendar },
    ],
  },
  {
    section: "BANQUE VISUELLE",
    items: [
      { href: "/dashboard/templates", label: "Affiches", icon: Image },
      { href: "/dashboard/hebrew-calendar", label: "Horaires de Chabbat", icon: Clock3 },
    ],
  },
  {
    section: "SERVICES",
    items: [
      { href: "/dashboard/clip-recap", label: "Clip récap", icon: Video },
      { href: "https://boutique.shalom-ia.com", label: "Boutique", icon: ShoppingBag, external: true },
      { href: "/dashboard/website", label: "Création site web", icon: Globe },
    ],
  },
  {
    section: "PARAMÈTRES",
    items: [
      { href: "/dashboard/settings", label: "Paramètres", icon: Settings },
      { href: "/help", label: "Aide & FAQ", icon: HelpCircle },
      { href: "mailto:contact@shalom-ia.com", label: "Contact", icon: Mail },
    ],
  },
];

export const MOBILE_PRIMARY_NAV: DashboardNavItem[] = [
  { href: "/dashboard/overview", label: "Accueil", icon: LayoutDashboard },
  { href: "/dashboard/assistant", label: "Assistant IA", icon: Bot },
  { href: "/dashboard/events", label: "Personnel", icon: Calendar },
  { href: "/dashboard/settings", label: "Réglages", icon: Settings },
];
