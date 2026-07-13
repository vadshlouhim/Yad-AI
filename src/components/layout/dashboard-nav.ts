import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BookOpen,
  Bot,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Camera,
  Clock3,
  House,
  Globe,
  Gift,
  HandHeart,
  HelpCircle,
  History,
  Image,
  Library,
  Mail,
  Plane,
  Plus,
  Search,
  Settings,
  Settings2,
  Share2,
  ShoppingBag,
  Star,
  Video,
  Zap,
  Sparkles,
} from "lucide-react";
import React from "react";
import { getCommunityProfileLabel } from "@/lib/community/profile-labels";

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

export interface OfficialDashboardMenuItem extends DashboardNavItem {
  disabled?: boolean;
}

export interface OfficialDashboardMenuSection {
  key: string;
  section: string;
  subtitle: string;
  icon: LucideIcon;
  items: OfficialDashboardMenuItem[];
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
  "AGENTS INTELLIGENTS": {
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
  "COURS DE TORAH": {
    label: "text-teal-300",
    itemActive: "bg-teal-600 text-white shadow-sm",
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

export const OFFICIAL_MENU_SECTION_STYLES: Record<
  string,
  {
    accentBar: string;
    iconSurface: string;
    titleClass: string;
    descriptionClass: string;
    itemIcon: string;
    itemHover: string;
    itemActive: string;
  }
> = {
  social: {
    accentBar: "bg-blue-500",
    iconSurface: "bg-blue-50",
    titleClass: "text-blue-700",
    descriptionClass: "text-slate-500",
    itemIcon: "text-blue-600",
    itemHover: "hover:bg-slate-50 hover:text-slate-900",
    itemActive: "bg-blue-50 text-slate-950 ring-1 ring-blue-100",
  },
  automations: {
    accentBar: "bg-violet-500",
    iconSurface: "bg-violet-50",
    titleClass: "text-violet-700",
    descriptionClass: "text-slate-500",
    itemIcon: "text-violet-600",
    itemHover: "hover:bg-slate-50 hover:text-slate-900",
    itemActive: "bg-violet-50 text-slate-950 ring-1 ring-violet-100",
  },
  email: {
    accentBar: "bg-cyan-500",
    iconSurface: "bg-cyan-50",
    titleClass: "text-cyan-700",
    descriptionClass: "text-slate-500",
    itemIcon: "text-cyan-600",
    itemHover: "hover:bg-slate-50 hover:text-slate-900",
    itemActive: "bg-cyan-50 text-slate-950 ring-1 ring-cyan-100",
  },
  donation: {
    accentBar: "bg-orange-500",
    iconSurface: "bg-orange-50",
    titleClass: "text-orange-600",
    descriptionClass: "text-slate-500",
    itemIcon: "text-orange-500",
    itemHover: "hover:bg-slate-50 hover:text-slate-900",
    itemActive: "bg-orange-50 text-slate-950 ring-1 ring-orange-200",
  },
  resources: {
    accentBar: "bg-amber-500",
    iconSurface: "bg-amber-50",
    titleClass: "text-amber-700",
    descriptionClass: "text-slate-500",
    itemIcon: "text-amber-600",
    itemHover: "hover:bg-slate-50 hover:text-slate-900",
    itemActive: "bg-amber-50 text-slate-950 ring-1 ring-amber-100",
  },
  torah: {
    accentBar: "bg-teal-500",
    iconSurface: "bg-teal-50",
    titleClass: "text-teal-700",
    descriptionClass: "text-slate-500",
    itemIcon: "text-teal-600",
    itemHover: "hover:bg-slate-50 hover:text-slate-900",
    itemActive: "bg-teal-50 text-slate-950 ring-1 ring-teal-100",
  },
  clips: {
    accentBar: "bg-rose-500",
    iconSurface: "bg-rose-50",
    titleClass: "text-rose-700",
    descriptionClass: "text-slate-500",
    itemIcon: "text-rose-600",
    itemHover: "hover:bg-slate-50 hover:text-slate-900",
    itemActive: "bg-rose-50 text-slate-950 ring-1 ring-rose-100",
  },
  contacts: {
    accentBar: "bg-emerald-500",
    iconSurface: "bg-emerald-50",
    titleClass: "text-emerald-700",
    descriptionClass: "text-slate-500",
    itemIcon: "text-emerald-600",
    itemHover: "hover:bg-slate-50 hover:text-slate-900",
    itemActive: "bg-emerald-50 text-slate-950 ring-1 ring-emerald-100",
  },
  settings: {
    accentBar: "bg-slate-500",
    iconSurface: "bg-slate-100",
    titleClass: "text-slate-700",
    descriptionClass: "text-slate-500",
    itemIcon: "text-slate-600",
    itemHover: "hover:bg-slate-50 hover:text-slate-900",
    itemActive: "bg-slate-100 text-slate-950 ring-1 ring-slate-200",
  },
};

function getStructureTypeLabel(communityType?: string | null) {
  const label = getCommunityProfileLabel(communityType, "plural").trim();
  if (!label || label.toLowerCase() === "profils") return "";
  return `${label.charAt(0).toLowerCase()}${label.slice(1)}`;
}

export function getOfficialDashboardMenuSections(communityType?: string | null): OfficialDashboardMenuSection[] {
  const structureType = getStructureTypeLabel(communityType);
  const automationsSubtitle = structureType
    ? `Pour les ${structureType}`
    : "Pour vous";
  const resourcesSubtitle = structureType
    ? `Pour les ${structureType}`
    : "Pour vous";

  return [
    {
      key: "social",
      section: "RESEAUX SOCIAUX",
      subtitle: "Publier planifier vos reseaux",
      icon: Share2,
      items: [
        { href: "/dashboard/instagram", label: "Instagram", icon: InstagramIcon },
        { href: "/dashboard/facebook", label: "Facebook", icon: FacebookIcon },
        { href: "/dashboard/whatsapp", label: "WhatsApp", icon: WhatsAppIcon },
        { href: "/dashboard/publish/telegram", label: "Telegram", icon: TelegramIcon },
        { href: "/dashboard/publications", label: "Historique des publications", icon: History },
      ],
    },
    {
      key: "automations",
      section: "PUBLICATIONS AUTOMATIQUES",
      subtitle: automationsSubtitle,
      icon: CalendarRange,
      items: [
        { href: "/dashboard/shabbat-times-auto", label: "Horaires de Chabbat", icon: Clock3 },
        { href: "/dashboard/jewish-holidays-auto", label: "Fetes juives et Hassidiques", icon: Gift },
        { href: "/dashboard/event-reminders-auto", label: "Automatisation J-10 / J-5", icon: CalendarClock },
        { href: "/dashboard/event-recap-auto", label: "Recap automatique apres evenement", icon: Camera },
        { href: "/dashboard/weekly-images-auto", label: "Cette semaine en images", icon: Image },
        { href: "/dashboard/monthly-program-recap-auto", label: "Programme du mois", icon: CalendarRange },
        { href: "/dashboard/automations", label: "Toutes les automatisations", icon: Zap },
      ],
    },
    {
      key: "email",
      section: "EMAIL & AVIS GOOGLE",
      subtitle: "Emails et avis Google geres par l'IA",
      icon: Mail,
      items: [
        { href: "/dashboard/email", label: "Email", icon: Mail },
        { href: "/dashboard/google-reviews", label: "Avis Google", icon: Star },
      ],
    },
    {
      key: "resources",
      section: "RESSOURCES & SERVICES",
      subtitle: resourcesSubtitle,
      icon: BookOpen,
      items: [
        { href: "/dashboard/templates", label: "Affiches", icon: Image },
        { href: "/dashboard/boutique", label: "Boutique", icon: ShoppingBag },
        { href: "/dashboard/website", label: "Creation site web", icon: Globe },
        { href: "/dashboard/referencement", label: "Referencement Google et IA", icon: Search },
        { href: "/dashboard/assistance-indemnisation-aerienne", label: "Assistance indemnisations", icon: Plane },
      ],
    },
    {
      key: "torah",
      section: "COURS DE TORAH",
      subtitle: "Cours et bibliothèque communautaire",
      icon: BookOpen,
      items: [
        { href: "/dashboard/torah", label: "Cours de Torah IA", icon: BookOpen },
        { href: "/dashboard/community-library", label: "Bibliotheque communautaire", icon: Library },
      ],
    },
    {
      key: "contacts",
      section: "CONTACTS",
      subtitle: "Centralises et organises par l'IA",
      icon: Plus,
      items: [
        { href: "/dashboard/contacts", label: "Mes contacts", icon: Plus },
      ],
    },
    {
      key: "donation",
      section: "CAMPAGNE DE DONS",
      subtitle: "Pilotez vos campagnes de collecte de A a Z",
      icon: HandHeart,
      items: [
        { href: "/dashboard/donation-campaign", label: "Campagne de dons", icon: HandHeart, badge: "Bientot disponible", disabled: true },
        { href: "/dashboard/donation-campaign/visuals", label: "Visuels & publications", icon: Share2, badge: "Bientot disponible", disabled: true },
      ],
    },
    {
      key: "clips",
      section: "CLIPS VIDEO",
      subtitle: "Clips video crees instantanement avec l'IA",
      icon: Video,
      items: [
        { href: "/dashboard/clip-recap", label: "Clip video", icon: Video, badge: "Bientot disponible", disabled: true },
      ],
    },
    {
      key: "settings",
      section: "PARAMETRES",
      subtitle: "Parametres & support client",
      icon: Settings,
      items: [
        { href: "/dashboard/settings", label: "Parametres", icon: Settings },
        { href: "/help", label: "Aide & FAQ", icon: HelpCircle },
      ],
    },
  ];
}

export const DASHBOARD_TOP_ITEM: DashboardNavItem = {
  href: "/dashboard/notifications",
  label: "Notifications",
  icon: Bell,
};

export const QUICK_ACCESS_ITEMS = [
  { href: "/dashboard/assistant", label: "Agents intelligents", icon: Bot },
  { href: "/dashboard/overview", label: "Tableau de bord", icon: House },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell, notification: true },
  { href: "/dashboard/events", label: "Agenda connecte IA", icon: CalendarDays },
] as const;

export const DASHBOARD_NAV_ITEMS: DashboardNavSection[] = [
  {
    section: "AGENTS INTELLIGENTS",
    items: [{ href: "/dashboard/assistant", label: "Agents intelligents", icon: Bot }],
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
      { href: "/dashboard/events", label: "Mon Agenda IA", icon: CalendarDays },
    ],
  },
  {
    section: "COURS DE TORAH",
    items: [
      { href: "/dashboard/torah", label: "Cours de Torah IA", icon: BookOpen },
      { href: "/dashboard/community-library", label: "Bibliothèque communautaire", icon: Library },
    ],
  },
  {
    section: "CLIPS VIDEO",
    items: [
      { href: "/dashboard/clip-recap", label: "Clip Video", icon: Video },
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
    section: "CONTACTS",
    items: [
      { href: "/dashboard/contacts", label: "Ajoutez mes contacts", icon: Plus },
    ],
  },
  {
    section: "CAMPAGNE DE DONS",
    items: [
      { href: "/dashboard/donation-campaign", label: "Campagne de dons", icon: HandHeart, badge: "Bientot disponible" },
      { href: "/dashboard/donation-campaign/visuals", label: "Visuels & Publications", icon: Share2, badge: "Bientot disponible" },
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
      { href: "/dashboard/settings", label: "Parametres", icon: Settings },
      { href: "/help", label: "Aide & FAQ", icon: HelpCircle },
    ],
  },
];

export const MOBILE_PRIMARY_NAV: DashboardNavItem[] = [
  { href: "/dashboard/overview", label: "Accueil", icon: House },
  { href: "/dashboard/assistant", label: "Agents IA", icon: Sparkles },
  { href: "/dashboard/events", label: "Agenda IA", icon: CalendarDays },
  { href: "/dashboard/settings", label: "Reglages", icon: Settings2 },
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
      { href: "/dashboard/monthly-program-recap-auto", label: "Programme du mois", icon: CalendarRange },
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
    section: "RESSOURCES & SERVICES",
    icon: BookOpen,
    items: [
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
    section: "CONTACTS",
    icon: Plus,
    items: [
      { href: "/dashboard/contacts", label: "Ajoutez mes contacts", icon: Plus },
    ],
  },
  {
    section: "CAMPAGNE DE DONS",
    icon: HandHeart,
    items: [
      { href: "/dashboard/donation-campaign", label: "Campagne de dons", icon: HandHeart, badge: "Bientot disponible" },
      { href: "/dashboard/donation-campaign/visuals", label: "Visuels & Publications", icon: Share2, badge: "Bientot disponible" },
    ],
  },
  {
    section: "COURS DE TORAH",
    icon: BookOpen,
    items: [
      { href: "/dashboard/torah", label: "Cours de Torah IA", icon: BookOpen },
      { href: "/dashboard/community-library", label: "Bibliothèque communautaire", icon: Library },
    ],
  },
  {
    section: "CLIPS VIDEO",
    icon: Video,
    items: [{ href: "/dashboard/clip-recap", label: "Clip Video", icon: Video }],
  },
  {
    section: "PARAMETRES",
    icon: Settings,
    items: [
      { href: "/dashboard/settings", label: "Parametres", icon: Settings },
      { href: "/help", label: "Aide & FAQ", icon: HelpCircle },
    ],
  },
];
