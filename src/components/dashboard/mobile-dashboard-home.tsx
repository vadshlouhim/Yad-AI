"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ArrowRight,
  Bell,
  BookOpen,
  BotMessageSquare,
  Cake,
  CalendarDays,
  CalendarRange,
  Camera,
  ChevronDown,
  Clock3,
  CreditCard,
  FileText,
  Image as ImageIcon,
  LogOut,
  Mail,
  Megaphone,
  Settings,
  Sparkles,
  Target,
  Globe2,
  GripVertical,
  MessageSquare,
  Plane,
  Search,
  ShoppingBag,
  Star,
  User,
  Users,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { DASHBOARD_MODULE_COLORS } from "./dashboard-module-colors";
import { MOBILE_ACTION_CARD_CLASS, MOBILE_HOME_HEADER_CLASS } from "@/components/presentation/platform-style";
import { HOME_EASYCOM_AGENTS, type EasyComAgent } from "@/lib/agents";
import {
  getOfficialDashboardMenuSections,
  OFFICIAL_MENU_SECTION_STYLES,
  type OfficialDashboardMenuSection,
} from "@/components/layout/dashboard-nav";
import { MOBILE_HOME_DEFAULT_MODULES, MOBILE_HOME_MODULES, MOBILE_HOME_MAX_MODULES, type MobileHomeModuleKey } from "@/lib/mobile-dashboard/modules";

type MobileDashboardHomeProps = {
  firstName: string;
  userName: string;
  userAvatar?: string | null;
  communityName: string;
  communityLogo?: string | null;
  communityType?: string | null;
  unreadNotifications: number;
  basePath?: "/dashboard" | "/demo";
};

type ActionCard = {
  key: MobileHomeModuleKey;
  title: string;
  icon: typeof Megaphone;
  className: string;
  iconClassName?: string;
  href?: string;
  sectionKey?: string;
  columns?: 2 | 3 | 6;
  density?: "standard" | "slim" | "compact";
  badge?: string;
  badgeClassName?: string;
};

const FEATURED_AGENT_SLUGS = [
  "dov",
  "david",
  "shmouel",
  "levik",
  "barouh",
  "zalman",
  "avi",
  "tsemah",
] as const;

const ACTION_CARDS: ActionCard[] = [
  {
    key: "shabbat-times",
    title: "Horaires de Chabbat & Fêtes",
    icon: Clock3,
    className: "bg-[#0b9ba0] text-white",
    iconClassName: "text-[#2f7e88]",
    href: "/dashboard/shabbat-times-auto",
    badge: "Publication automatique",
    badgeClassName: "text-[#8a2d22]",
    columns: 3,
    density: "slim",
  },
  {
    key: "publish",
    title: "Publier partout en un clic",
    icon: Megaphone,
    className: "bg-[#1261df] text-white",
    iconClassName: "text-[#2962ff]",
    href: "/dashboard/social-networks",
    badge: "Tous vos réseaux",
    badgeClassName: "text-[#1746a2]",
    columns: 3,
  },
  {
    key: "torah",
    title: "Cours de Torah",
    icon: BookOpen,
    className: "bg-[#ee9400] text-white",
    iconClassName: "text-[#ea580c]",
    href: "/dashboard/torah",
    badge: "Sources fiables",
    badgeClassName: "text-[#9a3412]",
    columns: 3,
  },
  {
    key: "email-reviews",
    title: "Email & Avis Google",
    icon: Mail,
    className: DASHBOARD_MODULE_COLORS["email-reviews"],
    sectionKey: "email",
    badge: "Intelligents, triés et notifiés",
    badgeClassName: "text-[#334155]",
    columns: 3,
  },
  {
    key: "newsletter-paper",
    title: "Newsletter",
    icon: FileText,
    className: "bg-[#5a1a96] text-white",
    iconClassName: "text-[#7b61ff]",
    href: "/dashboard/newsletter",
    badge: "Imprimable pour Chabbat",
    badgeClassName: "text-[#5b20bc]",
    columns: 3,
  },
  {
    key: "contacts",
    title: "CRM intelligent",
    icon: Users,
    className: DASHBOARD_MODULE_COLORS["contacts"],
    href: "/dashboard/contacts",
    badge: "Connecté",
    badgeClassName: "text-[#075fdf]",
    columns: 3,
  },
  {
    key: "visuals",
    title: "Affiches professionnelles",
    icon: ImageIcon,
    className: "bg-[#d92c75] text-white",
    iconClassName: "text-[#bd1e68]",
    sectionKey: "visuals",
    badge: "+ de 195 modèles",
    badgeClassName: "text-[#5b21b6]",
    columns: 3,
  },
  { key: "daily-study", title: "Hayom Yom & Sefer Hamitsvot", icon: BookOpen, className: "bg-[#168a68] text-white", iconClassName: "text-[#087457]", href: "/dashboard/hayom-yom-sefer-hamitsvot", columns: 3 },
  { key: "birthdays-yahrzeit", title: "Anniversaires & Yahrzeit", icon: Cake, className: "bg-[#f13f53] text-white", iconClassName: "text-[#e73549]", href: "/dashboard/jewish-birthdays", badge: "Intelligent et automatique", badgeClassName: "text-[#1e3a8a]", columns: 3 },
  { key: "event-reminders", title: "Automatisations", icon: CalendarRange, className: "bg-[#4f168e] text-white", iconClassName: "text-[#57199a]", href: "/dashboard/event-reminders-auto", badge: "J-10 / J-5 / J-J", badgeClassName: "text-[#701a75]", columns: 3 },
  { key: "photo-recap", title: "Récap photos", icon: Camera, className: "bg-[#0b9ba0] text-white", iconClassName: "text-[#087c82]", href: "/dashboard/recap-auto", badge: "Vos temps forts", badgeClassName: "text-[#155e75]", columns: 3 },
  { key: "targeted", title: "Communication ciblée", icon: Target, className: DASHBOARD_MODULE_COLORS["targeted"], href: "/dashboard/communication-ciblee", badge: "Ciblage intelligent", badgeClassName: "text-[#155e75]", columns: 3 },
  { key: "email", title: "Email", icon: Mail, className: DASHBOARD_MODULE_COLORS["email"], href: "/dashboard/email" },
  { key: "reviews", title: "Avis Google", icon: Star, className: DASHBOARD_MODULE_COLORS["reviews"], href: "/dashboard/google-reviews" },
  { key: "whatsapp", title: "WhatsApp automatisé", icon: MessageSquare, className: DASHBOARD_MODULE_COLORS["whatsapp"], href: "/dashboard/whatsapp" },
  { key: "website", title: "Création de site web", icon: Globe2, className: DASHBOARD_MODULE_COLORS["website"], href: "/dashboard/website" },
  { key: "seo", title: "Référencement IA", icon: Search, className: DASHBOARD_MODULE_COLORS["seo"], href: "/dashboard/referencement" },
  {
    key: "shop",
    title: "La Boutique d’EasyCom-AI",
    icon: ShoppingBag,
    className: "bg-[#421388] text-white",
    iconClassName: "text-[#421388]",
    href: "/dashboard/boutique",
    badge: "Marketplace juive n° 1",
    badgeClassName: "text-white",
    columns: 6,
  },
  { key: "assistance", title: "Assistance indemnisation", icon: Plane, className: DASHBOARD_MODULE_COLORS["assistance"], href: "/dashboard/assistance-indemnisation-aerienne" },
];

const AGENT_ACCENTS: Record<string, { icon: typeof Sparkles; surface: string }> = {
  mendy: { icon: BotMessageSquare, surface: "bg-[#147af3]" },
  dov: { icon: Sparkles, surface: "bg-[#ed3676]" },
  israel: { icon: BotMessageSquare, surface: "bg-[#11b96a]" },
  david: { icon: CalendarRange, surface: "bg-[#7851d8]" },
  shmouel: { icon: BookOpen, surface: "bg-[#e9a400]" },
  levik: { icon: Mail, surface: "bg-[#e94755]" },
  barouh: { icon: Sparkles, surface: "bg-[#ef8b18]" },
  zalman: { icon: ImageIcon, surface: "bg-[#6f31d7]" },
  avi: { icon: Target, surface: "bg-[#11b956]" },
  tsemah: { icon: Mail, surface: "bg-[#e5338a]" },
};

const MODAL_TONES: Record<string, string> = {
  social: "from-[#0878ee] via-[#0668e8] to-[#064bd8]",
  automations: "from-[#f36756] via-[#df4639] to-[#b9302a]",
  targeted: "from-[#ff4c50] via-[#f63f47] to-[#e9333d]",
  torah: "from-[#ffbd16] via-[#f7ad05] to-[#ee9b00]",
  visuals: "from-[#7130d8] via-[#6d2bc8] to-[#5722b1]",
  contacts: "from-[#0a72ec] via-[#075fdf] to-[#0649cb]",
  email: "from-[#f33967] via-[#ed3262] to-[#dc2860]",
};

function resolveHref(href: string, basePath: "/dashboard" | "/demo") {
  return href.startsWith("/dashboard") ? href.replace("/dashboard", basePath) : href;
}

function getAgentPrompt(agent: EasyComAgent) {
  return `Je souhaite travailler avec ${agent.name}, mon agent spécialisé en ${agent.role.toLowerCase()}. Aide-moi à commencer.`;
}

export function MobileDashboardHome({
  firstName,
  userName,
  userAvatar,
  communityName,
  communityLogo,
  communityType,
  unreadNotifications,
  basePath = "/dashboard",
}: MobileDashboardHomeProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [profileOpen, setProfileOpen] = useState(false);
  const [homeModules, setHomeModules] = useState<MobileHomeModuleKey[]>([...MOBILE_HOME_DEFAULT_MODULES]);
  const [homeLoaded, setHomeLoaded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [draggingKey, setDraggingKey] = useState<MobileHomeModuleKey | null>(null);
  const [undoModule, setUndoModule] = useState<MobileHomeModuleKey | null>(null);
  const [homeNotice, setHomeNotice] = useState<string | null>(null);
  const agentsScrollerRef = useRef<HTMLDivElement>(null);
  const addedModuleRef = useRef(false);
  const moduleKey = searchParams.get("module");
  const sections = useMemo(() => getOfficialDashboardMenuSections(communityType), [communityType]);
  const sectionByKey = useMemo(
    () => new Map(sections.map((section) => [section.key, section])),
    [sections]
  );
  const selectedSection = useMemo(() => {
    if (!moduleKey) return undefined;
    return sectionByKey.get(moduleKey);
  }, [moduleKey, sectionByKey]);
  const featuredAgents = FEATURED_AGENT_SLUGS.flatMap((slug) =>
    HOME_EASYCOM_AGENTS.filter((agent) => agent.slug === slug)
  );
  const actionByKey = useMemo(() => new Map(ACTION_CARDS.map((action) => [action.key, action])), []);
  const visibleActions = homeModules.flatMap((key) => {
    const action = actionByKey.get(key);
    return action ? [action] : [];
  });

  async function persistHomeModules(modules: MobileHomeModuleKey[]) {
    await fetch("/api/dashboard/mobile-home", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modules }),
    });
  }

  useEffect(() => {
    let active = true;
    fetch("/api/dashboard/mobile-home")
      .then((response) => response.ok ? response.json() : null)
      .then((data: { modules?: MobileHomeModuleKey[] } | null) => {
        if (active && Array.isArray(data?.modules)) setHomeModules(data.modules);
      })
      .finally(() => { if (active) setHomeLoaded(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const key = searchParams.get("addModule");
    if (!homeLoaded || !key || addedModuleRef.current) return;
    const moduleToAdd = MOBILE_HOME_MODULES.find((candidate) => candidate.key === key)?.key;
    addedModuleRef.current = true;
    if (!moduleToAdd || homeModules.includes(moduleToAdd)) return;
    if (homeModules.length >= MOBILE_HOME_MAX_MODULES) {
      window.setTimeout(() => setHomeNotice(`Vous avez déjà ${MOBILE_HOME_MAX_MODULES} modules. Retirez-en un avant d’en ajouter un autre.`), 0);
      return;
    }
    const timer = window.setTimeout(() => {
      const next = [...homeModules, moduleToAdd];
      setHomeModules(next);
      setEditMode(true);
      void persistHomeModules(next);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("addModule");
      params.delete("edit");
      router.replace(params.toString() ? `${pathname}?${params}` : pathname, { scroll: false });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [homeLoaded, homeModules, pathname, router, searchParams]);

  function openSection(sectionKey: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("module", sectionKey);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function closeSection() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("module");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function scrollAgentsForward() {
    const scroller = agentsScrollerRef.current;
    if (!scroller) return;
    const reachedEnd = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 12;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scroller.scrollTo({
      left: reachedEnd ? 0 : Math.min(scroller.scrollLeft + 179, scroller.scrollWidth),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function removeHomeModule(key: MobileHomeModuleKey) {
    const next = homeModules.filter((module) => module !== key);
    setHomeModules(next);
    setUndoModule(key);
    void persistHomeModules(next);
  }

  function restoreHomeModule() {
    if (!undoModule || homeModules.length >= MOBILE_HOME_MAX_MODULES) return;
    const next = [...homeModules, undoModule];
    setHomeModules(next);
    setUndoModule(null);
    void persistHomeModules(next);
  }

  function moveHomeModule(from: MobileHomeModuleKey, to: MobileHomeModuleKey) {
    const fixedModules: MobileHomeModuleKey[] = ["shop", "event-reminders", "photo-recap", "torah"];
    if (from === to || fixedModules.includes(from) || fixedModules.includes(to)) return;
    const fromIndex = homeModules.indexOf(from);
    const toIndex = homeModules.indexOf(to);
    if (fromIndex < 0 || toIndex < 0) return;
    const next = [...homeModules];
    next.splice(fromIndex, 1);
    next.splice(toIndex, 0, from);
    setHomeModules(next);
    void persistHomeModules(next);
  }

  return (
    <div className="min-h-full overflow-x-hidden bg-[#fffaf4] text-slate-950 md:hidden">
      <section className={MOBILE_HOME_HEADER_CLASS}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_46%,rgba(116,52,213,0.24),transparent_31%),radial-gradient(circle_at_82%_60%,rgba(92,44,171,0.3),transparent_28%)]" />

        <div className="relative flex items-center justify-between gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_8px_24px_rgba(9,2,34,0.28)] ring-1 ring-white/60">
            {communityLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={communityLogo} alt={`Logo ${communityName}`} className="h-full w-full object-cover" />
            ) : (
            <span className="text-xs font-black text-[#421388]">{communityName.slice(0, 2).toUpperCase()}</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href={resolveHref("/dashboard/events", basePath)}
              aria-label="Ouvrir l’Agenda IA"
              className="relative flex size-10 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white backdrop-blur-sm transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <span className="relative flex size-7 items-center justify-center rounded-full bg-white/16 ring-1 ring-white/15">
                <CalendarDays className="size-4.5 stroke-[2.25]" />
                <span className="absolute -right-1 -top-1 rounded-full bg-[#23c45e] px-1 py-[1px] text-[0.43rem] font-black uppercase leading-none text-white shadow-sm">
                  IA
                </span>
              </span>
            </Link>

            <Link
              href={resolveHref("/dashboard/notifications", basePath)}
              aria-label="Ouvrir les notifications"
              className="relative flex size-10 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white backdrop-blur-sm transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Bell className="size-6 stroke-[2.2]" />
              {unreadNotifications > 0 && (
                <span className="absolute right-0.5 top-0.5 size-3 rounded-full border-2 border-[#421388] bg-[#ff534c]" />
              )}
            </Link>

            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                aria-expanded={profileOpen}
                aria-label="Ouvrir le menu du profil"
                className="flex h-10 items-center gap-1.5 rounded-full bg-white/10 px-1.5 pr-2.5 text-white ring-1 ring-white/10 backdrop-blur-sm transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#a352e2] to-[#6730b6] text-[0.65rem] font-black shadow-inner shadow-white/10">
                  {userAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={userAvatar} alt={userName} className="h-full w-full object-cover" />
                  ) : (
                    userName.slice(0, 2).toUpperCase()
                  )}
                </span>
                <ChevronDown className={cn("size-4 transition-transform", profileOpen && "rotate-180")} />
              </button>

              {profileOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Fermer le menu du profil"
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => setProfileOpen(false)}
                  />
                  <div className="absolute right-0 top-[calc(100%+0.65rem)] z-50 w-60 overflow-hidden rounded-3xl border border-white/20 bg-white p-2 text-slate-700 shadow-2xl shadow-[#1d0752]/30">
                    <div className="border-b border-slate-100 px-3 py-2.5">
                      <p className="truncate text-sm font-bold text-slate-950">{userName}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{communityName}</p>
                    </div>
                    <Link
                      href={resolveHref("/dashboard/settings/billing", basePath)}
                      onClick={() => setProfileOpen(false)}
                      className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm font-semibold transition hover:bg-violet-50 hover:text-[#421388]"
                    >
                      <CreditCard className="size-4" />
                      Abonnement
                    </Link>
                    <Link
                      href={resolveHref("/dashboard/settings?section=profile", basePath)}
                      onClick={() => setProfileOpen(false)}
                      className="flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold transition hover:bg-violet-50 hover:text-[#421388]"
                    >
                      <User className="size-4" />
                      Mon profil
                    </Link>
                    <Link
                      href={resolveHref("/dashboard/settings", basePath)}
                      onClick={() => setProfileOpen(false)}
                      className="flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold transition hover:bg-violet-50 hover:text-[#421388]"
                    >
                      <Settings className="size-4" />
                      Paramètres
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      <LogOut className="size-4" />
                      Se déconnecter
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <h1 className="relative mt-2.5 text-[clamp(1.7rem,7.8vw,2.3rem)] font-black leading-none tracking-[-0.045em]">
          Bienvenue, {firstName}
        </h1>

        <div className="relative mt-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex shrink-0 items-center gap-2 text-[1.12rem] font-extrabold tracking-[-0.025em]">
              <Sparkles className="size-5 shrink-0 fill-[#ffba13] text-[#ffba13]" />
              <span>Vos agents IA</span>
            </h2>
            <button
              type="button"
              onClick={scrollAgentsForward}
              aria-label="Afficher les agents IA suivants"
              className="flex size-9 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/10 backdrop-blur-sm transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ArrowRight className="size-5" />
            </button>
          </div>
        </div>

        <div
          ref={agentsScrollerRef}
          className="relative -mr-5 mt-2 snap-x snap-mandatory overflow-x-auto pr-5 scroll-smooth [scrollbar-width:none] motion-reduce:scroll-auto [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex w-max gap-3 pr-5">
            {featuredAgents.map((agent) => {
              const accent = AGENT_ACCENTS[agent.slug] ?? AGENT_ACCENTS.david;
              const AccentIcon = accent.icon;
              return (
                <Link
                  key={agent.slug}
                  href={`${resolveHref("/dashboard/assistant", basePath)}?agent=${encodeURIComponent(agent.slug)}&prefill=${encodeURIComponent(getAgentPrompt(agent))}`}
                  className="relative h-[112px] w-[150px] shrink-0 snap-start overflow-hidden rounded-[1.35rem] border border-white/20 bg-white/[0.055] shadow-[0_12px_22px_rgba(17,2,58,0.2)] backdrop-blur-sm transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <span className={cn("absolute right-2.5 top-2.5 z-20 flex size-8 items-center justify-center rounded-full text-white shadow-lg", accent.surface)}>
                    <AccentIcon className="size-4 stroke-[2.4]" />
                  </span>
                  <Image
                    src={agent.image}
                    width={94}
                    height={137}
                    sizes="76px"
                    alt=""
                    aria-hidden="true"
                    className="absolute -bottom-1 left-0 h-[108px] w-[76px] object-contain object-bottom drop-shadow-[0_10px_12px_rgba(8,1,30,0.28)]"
                  />
                  <span className="absolute bottom-2.5 left-[71px] right-2 z-10 flex min-h-[46px] flex-col justify-end text-left">
                    <span className="block text-sm font-black leading-tight">{agent.name}</span>
                    <span className="mt-0.5 block break-words text-[10px] font-semibold leading-[1.18] text-white/90">{agent.role}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

      </section>

      <section className="mx-auto w-full max-w-[52rem] px-3 pb-5 pt-4 sm:px-6 sm:pb-7 sm:pt-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black leading-tight tracking-tight text-slate-950 sm:text-2xl">
            Que souhaitez-vous faire ?
          </h2>
          {editMode ? <button type="button" onClick={() => setEditMode(false)} className="min-h-10 rounded-full bg-[#421388] px-4 text-xs font-black text-white shadow-sm">Terminé</button> : null}
        </div>
        {editMode ? <p className="mt-2 text-xs font-semibold text-slate-500">Maintenez et faites glisser un module pour changer son ordre. Touchez × pour le retirer.</p> : null}

        <div className="mt-4 grid grid-cols-6 items-stretch gap-2.5 sm:gap-3">
          {visibleActions.map((action) => {
            const Icon = action.icon;
            const isBottomThree = action.key === "event-reminders" || action.key === "photo-recap" || action.key === "daily-study";
            const isFixedCard = action.key === "shop" || action.key === "torah" || isBottomThree;
            const content = (
              <>
                {action.key === "shop" ? (
                  <>
                    <span className={cn("relative flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-lg sm:size-11", action.iconClassName)}>
                      <ShoppingBag className="size-5 stroke-[2.2] sm:size-[22px]" />
                    </span>
                    <span className="relative min-w-0 flex-1 text-left">
                      <span className="block truncate text-sm font-black leading-tight tracking-[-0.02em] sm:text-base">{action.title}</span>
                      <span className="mt-1 block truncate text-[0.64rem] font-bold leading-tight text-violet-100 sm:text-xs">{action.badge}</span>
                    </span>
                    <span className="relative flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/15 sm:size-9">
                      <ArrowRight className="size-4" />
                    </span>
                  </>
                ) : (
                  <>
                    <span className={cn(
                      "relative flex shrink-0 items-center justify-center bg-white shadow-lg",
                      isBottomThree ? "size-10 rounded-xl sm:size-11 sm:rounded-2xl" : "size-11 rounded-2xl sm:size-12",
                      action.iconClassName ?? "text-slate-800",
                    )}>
                      <Icon className={cn("stroke-[2.15]", isBottomThree ? "size-5 sm:size-6" : "size-6")} />
                    </span>
                    <span className="relative block min-w-0 max-w-full text-center">
                      <span className={cn(
                        "block font-black tracking-[-0.02em]",
                        action.key === "daily-study" ? "line-clamp-3" : "line-clamp-2",
                        isBottomThree ? "text-xs leading-[1.12] sm:text-sm" : "text-sm leading-tight sm:text-base",
                      )}>
                        {action.title}
                      </span>
                      {action.badge && !isBottomThree ? (
                        <span className={cn(
                          "mt-1 block line-clamp-2 text-[0.64rem] font-bold leading-tight text-white/75 sm:text-xs",
                        )}>
                          {action.badge}
                        </span>
                      ) : null}
                    </span>
                  </>
                )}
              </>
            );
            const layoutClassName = cn(
              "relative",
              action.key === "shop" ? "col-span-6" : isBottomThree ? "col-span-2" : "col-span-3",
              action.key === "publish" && "col-start-1 row-start-1",
              action.key === "newsletter-paper" && "col-start-4 row-start-1",
              action.key === "birthdays-yahrzeit" && "col-start-1 row-start-2",
              action.key === "shabbat-times" && "col-start-4 row-start-2",
              action.key === "visuals" && "col-start-1 row-start-3",
              action.key === "torah" && "col-start-4 row-start-3",
              action.key === "shop" && "col-start-1 row-start-4",
              action.key === "event-reminders" && "col-start-1 row-start-5",
              action.key === "photo-recap" && "col-start-3 row-start-5",
              action.key === "daily-study" && "col-start-5 row-start-5",
              editMode && "animate-[pulse_1.4s_ease-in-out_infinite]"
            );
            const cardClassName = cn(
              MOBILE_ACTION_CARD_CLASS,
              "h-full w-full !min-h-[116px] !flex-col !justify-center !gap-2 rounded-[1.65rem] !border-0 px-3 py-3 !text-center shadow-[0_16px_30px_-18px_rgba(15,23,42,0.5)] sm:!min-h-[126px] sm:!gap-3 sm:p-4",
              action.className,
              isBottomThree && "!min-h-[104px] !gap-2 rounded-[1.4rem] px-1.5 py-2.5 sm:!min-h-[118px] sm:!gap-2.5 sm:px-3",
              action.key === "shop" && "!min-h-[72px] !flex-row !justify-start !gap-3 rounded-[1.45rem] px-3.5 py-3 !text-left shadow-[0_16px_30px_-18px_rgba(66,19,136,0.65)] sm:!min-h-[80px] sm:px-5",
              editMode && action.key === "shop" && "pr-12"
            );

            const sharedProps = {
              "data-home-module": action.key,
              onPointerDown: () => {
                if (editMode) setDraggingKey(action.key);
              },
              onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
                if (!editMode || !draggingKey) return;
                const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-home-module]");
                const targetKey = target?.dataset.homeModule as MobileHomeModuleKey | undefined;
                if (targetKey) moveHomeModule(draggingKey, targetKey);
              },
              onPointerUp: () => setDraggingKey(null),
              onPointerCancel: () => setDraggingKey(null),
            };
            const cardContent = <>
              {editMode && !isFixedCard ? <span className="absolute left-2 top-2 z-20 flex size-7 items-center justify-center rounded-full bg-black/15 text-white"><GripVertical className="size-4" /></span> : null}
              {content}
            </>;
            const removeButton = editMode && !isFixedCard ? <button type="button" onClick={() => removeHomeModule(action.key)} className="absolute right-1.5 top-1.5 z-20 flex size-8 items-center justify-center text-white/65 transition hover:text-white active:scale-90 focus-visible:rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70" aria-label={`Retirer ${action.title} de mon accueil`}><X className="size-3.5 drop-shadow-sm" /></button> : null;

            if (action.href?.startsWith("http")) {
              return (
                <div key={action.key} className={layoutClassName} {...sharedProps}>
                  <a href={action.href} className={cardClassName} onClick={(event) => { if (editMode) event.preventDefault(); }}>{cardContent}</a>
                  {removeButton}
                </div>
              );
            }

            if (action.href) {
              return (
                <div key={action.key} className={layoutClassName} {...sharedProps}>
                  <Link href={resolveHref(action.href, basePath)} className={cardClassName} onClick={(event) => { if (editMode) event.preventDefault(); }}>{cardContent}</Link>
                  {removeButton}
                </div>
              );
            }

            return (
              <div key={action.key} className={layoutClassName} {...sharedProps}>
                <button type="button" onClick={() => { if (!editMode && action.sectionKey) openSection(action.sectionKey); }} className={cardClassName}>{cardContent}</button>
                {removeButton}
              </div>
            );
          })}
        </div>
        {undoModule ? <div className="fixed bottom-[6.5rem] left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-bold text-white shadow-xl"><span>Module retiré</span><button type="button" onClick={restoreHomeModule} className="text-[#f2c75c]">Annuler</button></div> : null}
        {homeNotice ? <button type="button" onClick={() => setHomeNotice(null)} className="fixed bottom-[6.5rem] left-1/2 z-50 w-[calc(100%-2rem)] -translate-x-1/2 rounded-2xl bg-slate-950 px-4 py-3 text-left text-xs font-bold text-white shadow-xl">{homeNotice}</button> : null}
      </section>

      <ModuleDialog
        section={selectedSection}
        open={Boolean(selectedSection)}
        basePath={basePath}
        onOpenChange={(open) => {
          if (!open) closeSection();
        }}
      />
    </div>
  );
}

function ModuleDialog({
  section,
  open,
  basePath,
  onOpenChange,
}: {
  section?: OfficialDashboardMenuSection;
  open: boolean;
  basePath: "/dashboard" | "/demo";
  onOpenChange: (open: boolean) => void;
}) {
  const isSocialSection = section?.key === "social";
  const isCommunitySection = section?.key === "automations";
  const isCompactGridSection = Boolean(section && ["torah", "visuals", "contacts", "email"].includes(section.key));
  const style = section
    ? OFFICIAL_MENU_SECTION_STYLES[section.key] ?? OFFICIAL_MENU_SECTION_STYLES.resources
    : OFFICIAL_MENU_SECTION_STYLES.resources;

  const modalTone = section ? MODAL_TONES[section.key] ?? MODAL_TONES.social : MODAL_TONES.social;
  const socialPrimaryItem = isSocialSection
    ? section?.items.find((item) => item.href === "/dashboard/social-networks")
    : undefined;
  const socialSecondaryItems = isSocialSection
    ? section?.items.filter((item) => item.href === "/dashboard/publications") ?? []
    : [];
  const compactGridTitle =
    section?.key === "torah"
      ? "Cours de Torah"
      : section?.key === "visuals"
        ? "Affiches"
        : section?.key === "contacts"
          ? "Contacts"
          : "Email et Avis Google";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[1000] bg-[#170534]/60 backdrop-blur-[3px] data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[1001] flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[2rem] bg-[#fffaf5] shadow-[0_28px_80px_rgba(23,5,52,0.38)] outline-none data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 motion-reduce:animate-none">
          {section && (
            <>
              <div className={cn("relative flex items-start gap-3 bg-gradient-to-br px-5 pb-5 pt-5 text-white", modalTone)}>
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/18 ring-1 ring-white/20">
                  <section.icon className="size-6 text-white" />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <DialogPrimitive.Title className="text-lg font-black uppercase tracking-tight text-white">
                    {isSocialSection
                      ? "Publier partout en un clic"
                      : isCommunitySection
                        ? "Automatiser votre communication"
                        : isCompactGridSection
                          ? section.key === "contacts" ? (
                              <span className="inline-flex items-center gap-2">
                                Contacts
                                <span className="inline-flex size-7 items-center justify-center rounded-lg bg-white text-[0.68rem] font-black tracking-normal text-[#075fdf] shadow-sm">
                                  AI
                                </span>
                              </span>
                            ) : compactGridTitle
                          : section.section}
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className={cn("mt-1 text-sm leading-5 text-white/82", (isSocialSection || isCommunitySection || isCompactGridSection || !section.subtitle) && "sr-only")}>
                    {section.subtitle || `Choisissez une fonction dans ${section.section.toLowerCase()}.`}
                  </DialogPrimitive.Description>
                </div>
                <DialogPrimitive.Close className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/16 text-white ring-1 ring-white/25 transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  <X className="size-5" />
                  <span className="sr-only">Fermer</span>
                </DialogPrimitive.Close>
              </div>

              <div className="overflow-y-auto p-4">
                {isSocialSection ? (
                  <div className="space-y-3">
                    {socialPrimaryItem && (() => {
                      const PrimaryIcon = socialPrimaryItem.icon;
                      return (
                        <Link
                          href={resolveHref(socialPrimaryItem.href, basePath)}
                          className="home-tool-publish group relative flex min-h-[92px] items-center gap-4 overflow-hidden rounded-[1.55rem] px-5 py-4 text-left text-white shadow-[0_15px_30px_rgba(6,88,220,0.28)] transition active:scale-[0.985] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300/50"
                        >
                          <span className="relative flex size-13 shrink-0 items-center justify-center rounded-[1.1rem] bg-white/16 ring-1 ring-white/20">
                            {PrimaryIcon ? <PrimaryIcon className="size-6 text-white" /> : null}
                          </span>
                          <span className="relative min-w-0 flex-1 text-[1.05rem] font-black uppercase leading-tight">Publier sur tous mes réseaux</span>
                          <ArrowRight className="relative size-5 shrink-0 text-white/80 transition group-hover:translate-x-0.5" />
                        </Link>
                      );
                    })()}

                    <div className="grid grid-cols-1 gap-3">
                      {socialSecondaryItems.map((item) => {
                        const ItemIcon = item.icon;
                        const buttonTone =
                          item.href === "/dashboard/instagram"
                            ? DASHBOARD_MODULE_COLORS.visuals
                            : item.href === "/dashboard/facebook"
                              ? DASHBOARD_MODULE_COLORS.publish
                              : DASHBOARD_MODULE_COLORS["newsletter-paper"];
                        return (
                          <Link
                            key={item.href}
                            href={resolveHref(item.href, basePath)}
                            className={cn(
                              "relative flex min-h-[94px] flex-col items-center justify-center gap-2.5 overflow-hidden rounded-[1.35rem] px-3 py-4 text-center text-white shadow-[0_10px_22px_rgba(35,20,80,0.15)] transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#421388]/20",
                              buttonTone
                            )}
                          >
                            <span className="relative flex size-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-white/70">
                              {ItemIcon ? (
                                <ItemIcon className={cn("size-5", item.href === "/dashboard/publications" && "text-[#5b25b8]")} />
                              ) : null}
                            </span>
                            <span className="relative text-sm font-black uppercase leading-tight">
                              {item.href === "/dashboard/publications" ? "Historique des publications" : item.label}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ) : isCommunitySection ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                    {section.items.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={resolveHref(item.href, basePath)}
                          className="group relative flex min-h-[126px] flex-col items-center justify-center gap-3 rounded-[1.4rem] border border-white bg-white px-3 py-4 text-center shadow-[0_12px_28px_rgba(45,22,82,0.09)] ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(45,22,82,0.14)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#421388]/20"
                        >
                          <span className={cn("relative flex size-12 shrink-0 items-center justify-center rounded-[1rem] shadow-sm ring-1 ring-black/5", item.iconSurfaceClass ?? "bg-violet-100")}>
                            {ItemIcon ? <ItemIcon className={cn("size-5", item.iconClass ?? "text-[#421388]")} /> : null}
                          </span>
                          <span className="relative max-w-full text-[clamp(0.78rem,3.45vw,0.94rem)] font-black leading-[1.18] tracking-[-0.015em] text-slate-900">
                            {item.label}
                          </span>
                          <ArrowRight className="absolute right-3 top-3 size-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#421388]" />
                        </Link>
                      );
                    })}
                    </div>

                    <div className="rounded-[1.55rem] bg-[linear-gradient(135deg,#f2eaff,#fff_70%)] p-3 ring-1 ring-violet-100">
                      <Link
                        href={resolveHref("/dashboard/automations", basePath)}
                        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-[1.15rem] bg-[#421388] px-4 py-3 text-sm font-black text-white shadow-[0_12px_26px_rgba(66,19,136,0.28)] transition hover:bg-[#35106f] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#421388]/25"
                      >
                        <Settings className="size-4.5" />
                        Automatisations enregistrées
                        <ArrowRight className="size-4" />
                      </Link>
                    </div>
                  </div>
                ) : isCompactGridSection ? (
                  <div className="grid grid-cols-2 gap-3">
                    {section.items.map((item, index) => {
                      const ItemIcon = item.icon;
                      const buttonTones: Record<string, string[]> = {
                        torah: [DASHBOARD_MODULE_COLORS.reviews, DASHBOARD_MODULE_COLORS.torah],
                        visuals: [DASHBOARD_MODULE_COLORS["newsletter-paper"], DASHBOARD_MODULE_COLORS.visuals],
                        contacts: [DASHBOARD_MODULE_COLORS.publish, DASHBOARD_MODULE_COLORS.automations],
                        email: [DASHBOARD_MODULE_COLORS.email, DASHBOARD_MODULE_COLORS.reviews],
                      };
                      const tones = buttonTones[section.key] ?? buttonTones.visuals;
                      const isLastOddItem = section.items.length % 2 === 1 && index === section.items.length - 1;
                      return (
                        <Link
                          key={item.href}
                          href={resolveHref(item.href, basePath)}
                          className={cn(
                            "relative flex min-h-[112px] flex-col items-center justify-center gap-3 overflow-hidden rounded-[1.4rem] px-3 py-4 text-center text-white shadow-[0_11px_24px_rgba(35,20,80,0.15)] transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#421388]/20",
                            tones[index % tones.length],
                            isLastOddItem && "col-span-2 min-h-[96px] flex-row px-5"
                          )}
                        >
                          <span className="relative flex size-11 shrink-0 items-center justify-center rounded-[0.95rem] bg-white shadow-sm ring-1 ring-white/70">
                            {ItemIcon ? <ItemIcon className={cn("size-5", item.iconClass ?? style.itemIcon)} /> : null}
                          </span>
                          <span className="relative max-w-full text-[clamp(0.88rem,3.8vw,1rem)] font-black uppercase leading-[1.16] tracking-[-0.015em]">
                            {item.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2 rounded-[1.75rem] bg-white p-2.5 shadow-[0_14px_35px_rgba(30,41,59,0.08)] ring-1 ring-slate-200/70">
                    {section.items.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={resolveHref(item.href, basePath)}
                          className="flex min-h-[62px] items-center gap-3 rounded-[1.25rem] px-3 py-2.5 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#421388]/25"
                        >
                          <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl", item.iconSurfaceClass ?? style.iconSurface)}>
                            {ItemIcon ? <ItemIcon className={cn("size-5", item.iconClass ?? style.itemIcon)} /> : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-bold uppercase leading-5 text-slate-900">{item.label}</span>
                            {item.badge && (
                              <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                                {item.badge}
                              </span>
                            )}
                          </span>
                          <ArrowRight className="size-4 shrink-0 text-slate-300" />
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
