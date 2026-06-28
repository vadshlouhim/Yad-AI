import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BookOpen,
  Bot,
  Calendar,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Camera,
  Clock3,
  Globe,
  Gift,
  HandHeart,
  HelpCircle,
  History,
  Image,
  LayoutDashboard,
  Library,
  Mail,
  Plane,
  Plus,
  Search,
  Settings,
  Share2,
  ShoppingBag,
  Star,
  Video,
  Zap,
} from "lucide-react";
import React from "react";

// Official colored brand icons for the sidebar
export const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => {
  return React.createElement(
    "svg",
    {
      viewBox: "0 0 24 24",
      className: props.className,
      fill: "#25D366",
      xmlns: "http://www.w3.org/2000/svg"
    },
    React.createElement("path", {
      d: "M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.517 2.266 2.27 3.51 5.284 3.507 8.49-.006 6.66-5.344 11.997-11.957 11.997-2.005-.001-3.973-.5-5.739-1.453L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.859-4.42 9.863-9.864.002-2.634-1.02-5.11-2.881-6.974C16.592 1.897 14.1 1.87 11.999 1.87c-5.439 0-9.861 4.421-9.865 9.867-.001 1.733.46 3.424 1.336 4.921l-.988 3.597 3.7-.978zM17.15 14.5c-.282-.141-1.67-.824-1.928-.918-.258-.095-.447-.141-.636.141-.189.282-.731.918-.897 1.107-.166.189-.333.213-.615.072-1.048-.523-1.83-.984-2.525-2.18-.184-.316.184-.294.526-.976.059-.118.03-.222-.015-.316-.045-.094-.447-1.077-.612-1.472-.16-.388-.323-.336-.447-.342-.116-.006-.25-.007-.386-.007-.136 0-.356.05-.543.254-.187.204-.714.698-.714 1.701 0 1.004.73 1.976.832 2.113.102.136 1.436 2.193 3.48 3.076.486.209.866.335 1.161.429.489.156.935.134 1.286.082.392-.058 1.205-.493 1.376-.97.171-.476.171-.885.12-.97-.051-.085-.19-.136-.472-.277z"
    })
  );
};

export const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => {
  return React.createElement(
    "svg",
    {
      viewBox: "0 0 24 24",
      className: props.className,
      stroke: "#E1306C",
      fill: "none",
      strokeWidth: 2,
      xmlns: "http://www.w3.org/2000/svg"
    },
    React.createElement("rect", { x: 2, y: 2, width: 20, height: 20, rx: 5, ry: 5 }),
    React.createElement("path", { d: "M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" }),
    React.createElement("line", { x1: 17.5, y1: 6.5, x2: 17.51, y2: 6.5 })
  );
};

export const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => {
  return React.createElement(
    "svg",
    {
      viewBox: "0 0 24 24",
      className: props.className,
      fill: "#1877F2",
      xmlns: "http://www.w3.org/2000/svg"
    },
    React.createElement("path", {
      d: "M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"
    })
  );
};

export const TelegramIcon = (props: React.SVGProps<SVGSVGElement>) => {
  return React.createElement(
    "svg",
    {
      viewBox: "0 0 24 24",
      className: props.className,
      fill: "#0088cc",
      xmlns: "http://www.w3.org/2000/svg"
    },
    React.createElement("path", {
      d: "M22.422 1.32a1.328 1.328 0 00-1.284-.092L1.51 9.074a1.31 1.31 0 00-.142 2.378L5.91 13.53l12.44-8.082c.162-.105.352.12.214.258l-10.156 10.19-.364 5.342c.036.56.326.83.676.83a1.18 1.18 0 00.866-.396l2.544-2.456 5.27 3.882c.974.536 2.03-.024 2.226-1.156l2.946-13.886a1.324 1.324 0 00-.746-1.368z"
    })
  );
};

export const EmailIcon = (props: React.SVGProps<SVGSVGElement>) => {
  return React.createElement(
    "svg",
    {
      viewBox: "0 0 24 24",
      className: props.className,
      stroke: "#EA4335",
      fill: "none",
      strokeWidth: 2,
      xmlns: "http://www.w3.org/2000/svg"
    },
    React.createElement("path", { d: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" }),
    React.createElement("polyline", { points: "22,6 12,13 2,6" })
  );
};

// Logo Google « G » multicolore officiel
export const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => {
  return React.createElement(
    "svg",
    { viewBox: "0 0 24 24", className: props.className, xmlns: "http://www.w3.org/2000/svg" },
    React.createElement("path", {
      fill: "#4285F4",
      d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z",
    }),
    React.createElement("path", {
      fill: "#34A853",
      d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z",
    }),
    React.createElement("path", {
      fill: "#FBBC05",
      d: "M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z",
    }),
    React.createElement("path", {
      fill: "#EA4335",
      d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z",
    })
  );
};

export const ResourcePlusIcon = (props: React.SVGProps<SVGSVGElement>) => {
  return React.createElement(
    "span",
    {
      className: `relative inline-flex ${props.className ?? ""}`,
    },
    React.createElement(BookOpen, { className: "h-full w-full" }),
    React.createElement(Plus, {
      className: "absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-emerald-500 p-[1px] text-white shadow-sm",
    })
  );
};

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: LucideIcon | React.ComponentType<React.SVGProps<SVGSVGElement>> | null;
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
  EMAIL: {
    label: "text-cyan-300",
    itemActive: "bg-cyan-700 text-white shadow-sm",
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
  "CAMPAGNE DE DONS": {
    label: "text-rose-300",
    itemActive: "bg-rose-600 text-white shadow-sm",
  },
  RESSOURCES: {
    label: "text-violet-300",
    itemActive: "bg-violet-600 text-white shadow-sm",
  },
  "RESSOURCES & SERVICES": {
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
  label: "Notifications",
  icon: Bell,
};

export const DASHBOARD_NAV_ITEMS: DashboardNavSection[] = [
  {
    section: "ASSISTANT IA",
    items: [{ href: "/dashboard/assistant", label: "Assistant IA", icon: Bot }],
  },
  {
    section: "RESEAUX SOCIAUX",
    items: [
      { href: "/dashboard/automations", label: "Automatisations", icon: Zap },
      { href: "/dashboard/whatsapp", label: "WhatsApp", icon: WhatsAppIcon },
      { href: "/dashboard/instagram", label: "Instagram", icon: InstagramIcon },
      { href: "/dashboard/facebook", label: "Facebook", icon: FacebookIcon },
      { href: "/dashboard/publish/telegram", label: "Telegram", icon: TelegramIcon },
      { href: "/dashboard/publications", label: "Historique des publications", icon: History },
    ],
  },
  {
    section: "ASSISTANT PERSONNEL",
    items: [
      { href: "/dashboard/events", label: "Agenda connecté IA", icon: CalendarDays },
    ],
  },
  {
    section: "RESSOURCES",
    items: [
      { href: "/dashboard/resources", label: "Mes Ressources", icon: ResourcePlusIcon },
      { href: "/dashboard/community-library", label: "Bibliothèque communautaire", icon: Library },
      { href: "/dashboard/torah", label: "Cours de Torah IA", icon: BookOpen },
      { href: "/dashboard/hebrew-calendar", label: "Calendrier hebraique", icon: Calendar },
    ],
  },
  {
    section: "CLIPS VIDEO",
    items: [
      { href: "/dashboard/clip-recap", label: "Clip récap AI", icon: Video },
    ],
  },
  {
    section: "BANQUE VISUELLE",
    items: [
      { href: "/dashboard/templates", label: "Affiches", icon: Image },
      { href: "/dashboard/shabbat-times-auto", label: "Horaires de Chabbat", icon: Clock3 },
      { href: "/dashboard/jewish-holidays-auto", label: "Fetes juives et Hassidiques", icon: Gift },
    ],
  },
  {
    section: "CAMPAGNE DE DONS",
    items: [
      { href: "/dashboard/donation-campaign", label: "Campagne de dons", icon: HandHeart },
    ],
  },
  {
    section: "SERVICES",
    items: [
      { href: "/dashboard/boutique", label: "Boutique", icon: ShoppingBag },
      { href: "/dashboard/website", label: "Creation site web", icon: Globe },
      { href: "/dashboard/referencement", label: "Referencement Google et IA", icon: Search },
      {
        href: "/dashboard/assistance-indemnisation-aerienne",
        label: "Assistance Indemnisations",
        icon: Plane,
      },
    ],
  },
  {
    section: "PARAMETRES",
    items: [
      { href: "/dashboard/settings?section=contacts", label: "Ajoutez mes contacts", icon: Plus },
      { href: "/dashboard/settings", label: "Parametres", icon: Settings },
      { href: "/help", label: "Aide & FAQ", icon: HelpCircle },
    ],
  },
];

export const MOBILE_PRIMARY_NAV: DashboardNavItem[] = [
  { href: "/dashboard/overview", label: "Accueil", icon: LayoutDashboard },
  { href: "/dashboard/assistant", label: "Assistant IA", icon: Bot },
  { href: "/dashboard/events", label: "Agenda IA", icon: Calendar },
  { href: "/dashboard/settings", label: "Reglages", icon: Settings },
];

export const DASHBOARD_DESKTOP_CATEGORIES: DashboardDesktopCategory[] = [
  {
    section: "RESEAUX SOCIAUX",
    icon: Share2,
    items: [
      { href: "/dashboard/automations", label: "Automatisations", icon: Zap },
      { href: "/dashboard/whatsapp", label: "WhatsApp", icon: WhatsAppIcon },
      { href: "/dashboard/instagram", label: "Instagram", icon: InstagramIcon },
      { href: "/dashboard/facebook", label: "Facebook", icon: FacebookIcon },
      { href: "/dashboard/publish/telegram", label: "Telegram", icon: TelegramIcon },
      { href: "/dashboard/publications", label: "Historique des publications", icon: History },
    ],
  },
  {
    section: "AGENDA ET QUOTIDIEN",
    icon: CalendarDays,
    items: [
      { href: "/dashboard/shabbat-times-auto", label: "Horaires de Chabbat", icon: Clock3 },
      { href: "/dashboard/jewish-holidays-auto", label: "Fetes juives et Hassidiques", icon: Gift },
      { href: "/dashboard/event-reminders-auto", label: "Automatisation J-10 / J-5", icon: CalendarClock },
      { href: "/dashboard/event-recap-auto", label: "Récap automatique après événement", icon: Camera },
      { href: "/dashboard/weekly-images-auto", label: "Cette semaine en images", icon: Image },
      { href: "/dashboard/monthly-program-recap-auto", label: "Programme & récap du mois", icon: CalendarRange },
    ],
  },
  {
    section: "EMAIL",
    icon: Mail,
    items: [
      { href: "/dashboard/email", label: "Email", icon: Mail },
      { href: "/dashboard/google-reviews", label: "Avis Google", icon: Star },
    ],
  },
  {
    section: "CLIPS VIDEO",
    icon: Video,
    items: [{ href: "/dashboard/clip-recap", label: "Clip récap AI", icon: Video }],
  },
  {
    section: "CAMPAGNE DE DONS",
    icon: HandHeart,
    items: [
      { href: "/dashboard/donation-campaign", label: "Campagne de dons", icon: HandHeart },
      { href: "/dashboard/donation-campaign/visuals", label: "Visuels & Publications", icon: Share2 },
    ],
  },
  {
    section: "RESSOURCES & SERVICES",
    icon: BookOpen,
    items: [
      { href: "/dashboard/resources", label: "Mes Ressources", icon: ResourcePlusIcon },
      { href: "/dashboard/community-library", label: "Bibliothèque communautaire", icon: Library },
      { href: "/dashboard/torah", label: "Cours de Torah IA", icon: BookOpen },
      { href: "/dashboard/templates", label: "Affiches", icon: Image },
      { href: "/dashboard/boutique", label: "Boutique", icon: ShoppingBag },
      { href: "/dashboard/website", label: "Creation site web", icon: Globe },
      { href: "/dashboard/referencement", label: "Referencement Google et IA", icon: Search },
      {
        href: "/dashboard/assistance-indemnisation-aerienne",
        label: "Assistance Indemnisations",
        icon: Plane,
      },
    ],
  },
  {
    section: "PARAMETRES",
    icon: Settings,
    items: [
      { href: "/dashboard/settings?section=contacts", label: "Ajoutez mes contacts", icon: Plus },
      { href: "/dashboard/settings", label: "Parametres", icon: Settings },
      { href: "/help", label: "Aide & FAQ", icon: HelpCircle },
    ],
  },
];
