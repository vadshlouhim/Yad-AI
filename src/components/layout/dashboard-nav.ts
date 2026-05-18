import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BookOpen,
  Bot,
  Calendar,
  CalendarDays,
  Clock3,
  Globe,
  HelpCircle,
  History,
  Image,
  LayoutDashboard,
  Mail,
  MessageCircle,
  MessageSquare,
  Settings,
  Share2,
  ShoppingBag,
  Video,
  Zap,
} from "lucide-react";

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: LucideIcon | null;
  description?: string;
  badge?: string;
  action?: { label: string; href: string };
  external?: boolean;
  isQuickAction?: boolean;
}

export interface DashboardNavSection {
  section: string;
  items: DashboardNavItem[];
}

export interface DashboardDesktopCategory {
  section: string;
  icon: LucideIcon;
  items: DashboardNavItem[];
}

export const DASHBOARD_SECTION_STYLES: Record<string, { label: string; itemActive: string }> = {
  "GESTION DES RESEAUX SOCIAUX": {
    label: "text-emerald-300",
    itemActive: "bg-emerald-700 text-white shadow-sm",
  },
  "MESSAGERIE CONNECTEE": {
    label: "text-cyan-300",
    itemActive: "bg-cyan-700 text-white shadow-sm",
  },
  "ASSISTANT IA": {
    label: "text-blue-300",
    itemActive: "bg-blue-600 text-white shadow-sm",
  },
  "RESEAUX SOCIAUX": {
    label: "text-emerald-300",
    itemActive: "bg-emerald-700 text-white shadow-sm",
  },
  "ASSISTANT PERSONNEL": {
    label: "text-cyan-300",
    itemActive: "bg-cyan-700 text-white shadow-sm",
  },
  RESSOURCES: {
    label: "text-violet-300",
    itemActive: "bg-violet-600 text-white shadow-sm",
  },
  "BANQUE VISUELLE": {
    label: "text-amber-300",
    itemActive: "bg-amber-600 text-white shadow-sm",
  },
  SERVICES: {
    label: "text-rose-300",
    itemActive: "bg-rose-600 text-white shadow-sm",
  },
  PARAMETRES: {
    label: "text-slate-300",
    itemActive: "bg-slate-600 text-white shadow-sm",
  },
};

export const DASHBOARD_TOP_ITEM: DashboardNavItem = {
  href: "/dashboard/notifications",
  label: "Notification",
  icon: Bell,
};

export const DASHBOARD_NAV_ITEMS: DashboardNavSection[] = [
  {
    section: "ASSISTANT IA",
    items: [{ href: "/dashboard/assistant", label: "Assistent IA", icon: Bot }],
  },
  {
    section: "RESEAUX SOCIAUX",
    items: [
      { href: "/dashboard/settings/channels", label: "Connecter mes reseaux", icon: Share2 },
      { href: "/dashboard/automations", label: "Automatisations", icon: Zap },
      { href: "/dashboard/messaging", label: "Messagerie", icon: MessageSquare },
      { href: "/dashboard/publications", label: "Historique des publications", icon: History },
    ],
  },
  {
    section: "ASSISTANT PERSONNEL",
    items: [{ href: "/dashboard/events", label: "Agenda et quotidien", icon: CalendarDays }],
  },
  {
    section: "RESSOURCES",
    items: [
      { href: "/dashboard/torah", label: "Cours de Torah IA", icon: BookOpen },
      { href: "/dashboard/hebrew-calendar", label: "Calendrier hebraique", icon: Calendar },
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
      { href: "/dashboard/clip-recap", label: "Clip recap", icon: Video },
      { href: "https://boutique.shalom-ia.com", label: "Boutique", icon: ShoppingBag, external: true },
      { href: "/dashboard/website", label: "Creation site web", icon: Globe },
    ],
  },
  {
    section: "PARAMETRES",
    items: [
      { href: "/dashboard/settings", label: "Parametres", icon: Settings },
      { href: "/help", label: "Aide & FAQ", icon: HelpCircle },
      { href: "mailto:contact@shalom-ia.com", label: "Contact", icon: Mail },
    ],
  },
];

export const MOBILE_PRIMARY_NAV: DashboardNavItem[] = [
  { href: "/dashboard/overview", label: "Accueil", icon: LayoutDashboard },
  { href: "/dashboard/assistant", label: "Assistant IA", icon: Bot },
  { href: "/dashboard/events", label: "Personnel", icon: Calendar },
  { href: "/dashboard/settings", label: "Reglages", icon: Settings },
];

export const DASHBOARD_DESKTOP_CATEGORIES: DashboardDesktopCategory[] = [
  {
    section: "RESEAUX SOCIAUX",
    icon: Share2,
    items: [
      { href: "/dashboard/settings/channels", label: "Connecter mes reseaux", icon: Share2 },
      { href: "/dashboard/automations", label: "Automatisations", icon: Zap },
      { href: "/dashboard/publications", label: "Historique des publications", icon: History },
    ],
  },
  {
    section: "MESSAGERIE",
    icon: MessageSquare,
    items: [
      { href: "/dashboard/messaging", label: "Messagerie", icon: MessageSquare },
      {
        href: "/dashboard/whatsapp",
        label: "WhatsApp",
        description: "Automatisation WhatsApp",
        icon: MessageCircle,
      },
    ],
  },
  {
    section: "AGENDA ET QUOTIDIEN",
    icon: CalendarDays,
    items: [{ href: "/dashboard/events", label: "Agenda et quotidien", icon: CalendarDays }],
  },
  {
    section: "RESSOURCES",
    icon: BookOpen,
    items: [
      { href: "/dashboard/torah", label: "Cours de Torah IA", icon: BookOpen },
      { href: "/dashboard/templates", label: "Affiches", icon: Image },
      { href: "/dashboard/clip-recap", label: "Clip recap", icon: Video },
      { href: "https://boutique.shalom-ia.com", label: "Boutique", icon: ShoppingBag, external: true },
      { href: "/dashboard/website", label: "Creation site web", icon: Globe },
    ],
  },
  {
    section: "PARAMETRES",
    icon: Settings,
    items: [
      { href: "/dashboard/settings", label: "Parametres", icon: Settings },
      { href: "/help", label: "Aide & FAQ", icon: HelpCircle },
      { href: "mailto:contact@shalom-ia.com", label: "Contact", icon: Mail },
    ],
  },
];
