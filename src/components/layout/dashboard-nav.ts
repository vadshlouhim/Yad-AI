import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, Share2, Zap, MessageSquare, Clock,
  Bot, Calendar, BookOpen, Image, Video, ShoppingBag,
  Globe, Plus, Settings, HelpCircle, Mail, History,
  CalendarDays,
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
  PRINCIPALE: {
    label: "text-sky-300",
    itemActive: "bg-sky-600 text-white shadow-sm",
  },
  "RÉSEAUX SOCIAUX": {
    label: "text-emerald-300",
    itemActive: "bg-emerald-700 text-white shadow-sm",
  },
  "ASSISTANT PERSONNEL": {
    label: "text-blue-300",
    itemActive: "bg-blue-600 text-white shadow-sm",
  },
  RESSOURCES: {
    label: "text-violet-300",
    itemActive: "bg-violet-600 text-white shadow-sm",
  },
  "BANQUE VISUELLE": {
    label: "text-amber-300",
    itemActive: "bg-amber-600 text-white shadow-sm",
  },
  "SERVICES COMPLÉMENTAIRES": {
    label: "text-rose-300",
    itemActive: "bg-rose-600 text-white shadow-sm",
  },
  "ACTIONS RAPIDES": {
    label: "text-slate-400",
    itemActive: "bg-slate-700 text-white shadow-sm",
  },
};

export const DASHBOARD_NAV_ITEMS: DashboardNavSection[] = [
  {
    section: "PRINCIPALE",
    items: [
      { href: "/dashboard/overview", label: "Tableau de bord", icon: LayoutDashboard },
    ],
  },
  {
    section: "RÉSEAUX SOCIAUX",
    items: [
      { href: "/dashboard/settings/channels", label: "Connecter mes réseaux", icon: Share2 },
      {
        href: "/dashboard/automations",
        label: "Mes automatisations",
        icon: Zap,
        action: { label: "+ Créer", href: "/dashboard/automations?new=1" },
      },
      {
        href: "/dashboard/messaging",
        label: "Messagerie",
        icon: MessageSquare,
        action: { label: "+ Contacts", href: "/dashboard/messaging/contacts" },
      },
      { href: "/dashboard/publications", label: "Historique des publications", icon: History },
    ],
  },
  {
    section: "ASSISTANT PERSONNEL",
    items: [
      {
        href: "/dashboard/assistant",
        label: "Assistant IA",
        icon: Bot,
        action: { label: "Mon quotidien", href: "/dashboard/assistant?routine=1" },
      },
      { href: "/dashboard/events", label: "Voir mon agenda", icon: Calendar },
    ],
  },
  {
    section: "RESSOURCES",
    items: [
      { href: "/dashboard/torah", label: "Cours de Torah IA", icon: BookOpen },
      { href: "/dashboard/hebrew-calendar", label: "Calendrier hébraïque", icon: CalendarDays },
    ],
  },
  {
    section: "BANQUE VISUELLE",
    items: [
      { href: "/dashboard/hebrew-calendar?tab=shabbat", label: "Horaires de Chabbat", icon: Clock },
      { href: "/dashboard/templates", label: "Affiches préremplies", icon: Image },
    ],
  },
  {
    section: "SERVICES COMPLÉMENTAIRES",
    items: [
      { href: "/dashboard/clip-recap", label: "Clip récap", icon: Video },
      { href: "https://boutique.shalom-ia.com", label: "Boutique", icon: ShoppingBag, external: true },
      { href: "/dashboard/website", label: "Création site web", icon: Globe },
    ],
  },
  {
    section: "ACTIONS RAPIDES",
    items: [
      { href: "/dashboard/automations?new=1", label: "Créer une automatisation", icon: Plus, isQuickAction: true },
      { href: "/dashboard/content/new", label: "Créer une publication", icon: Plus, isQuickAction: true },
      { href: "/dashboard/settings", label: "Paramètres", icon: Settings },
      { href: "/help", label: "Aide & FAQ", icon: HelpCircle },
      { href: "mailto:contact@shalom-ia.com", label: "Contact", icon: Mail },
    ],
  },
];

export const MOBILE_PRIMARY_NAV: DashboardNavItem[] = [
  { href: "/dashboard/overview", label: "Accueil", icon: LayoutDashboard },
  { href: "/dashboard/assistant", label: "Assistant", icon: Bot },
  { href: "/dashboard/events", label: "Agenda", icon: Calendar },
  { href: "/dashboard/settings", label: "Réglages", icon: Settings },
];
