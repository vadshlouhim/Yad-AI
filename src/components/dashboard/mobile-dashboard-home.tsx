"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ArrowRight,
  Bell,
  BookOpen,
  BotMessageSquare,
  CalendarDays,
  CalendarRange,
  ChevronDown,
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
  Zap,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { HOME_EASYCOM_AGENTS, type EasyComAgent } from "@/lib/agents";
import {
  getOfficialDashboardMenuSections,
  FacebookIcon,
  InstagramIcon,
  OFFICIAL_MENU_SECTION_STYLES,
  WhatsAppIcon,
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
  href?: string;
  sectionKey?: string;
  wide?: boolean;
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
    key: "automations",
    title: "Automatiser",
    icon: Zap,
    className: "bg-[#2f7e88]",
    href: "/dashboard/automations",
  },
  {
    key: "publish",
    title: "Publier partout en un clic",
    icon: Megaphone,
    className: "bg-[#2962ff]",
    href: "/dashboard/social-networks",
  },
  {
    key: "torah",
    title: "Cours de Torah",
    icon: BookOpen,
    className: "bg-[#80652d]",
    href: "/dashboard/torah",
  },
  {
    key: "newsletter-paper",
    title: "Le Newsletter",
    icon: FileText,
    className: "bg-[#7b61ff]",
    href: "/dashboard/newsletter",
  },
  {
    key: "contacts",
    title: "Contacts",
    icon: Users,
    className: "bg-[#ff6b5e]",
    href: "/dashboard/contacts",
  },
  {
    key: "visuals",
    title: "Affiches & Visuels",
    icon: ImageIcon,
    className: "bg-[#e84393]",
    sectionKey: "visuals",
  },
  { key: "targeted", title: "Communication ciblée", icon: Target, className: "bg-[#a25064]", href: "/dashboard/communication-ciblee" },
  { key: "email", title: "Email", icon: Mail, className: "bg-[#a34d72]", href: "/dashboard/email" },
  { key: "reviews", title: "Avis Google", icon: Star, className: "bg-[#b07b32]", href: "/dashboard/google-reviews" },
  { key: "whatsapp", title: "WhatsApp", icon: MessageSquare, className: "bg-[#357e62]", href: "/dashboard/whatsapp" },
  { key: "website", title: "Création de site web", icon: Globe2, className: "bg-[#426d9e]", href: "/dashboard/website" },
  { key: "seo", title: "Référencement IA", icon: Search, className: "bg-[#596d9a]", href: "/dashboard/referencement" },
  { key: "shop", title: "Boutique & articles", icon: ShoppingBag, className: "bg-[#a86639]", href: "/dashboard/boutique" },
  { key: "assistance", title: "Assistance indemnisation", icon: Plane, className: "bg-[#586c8d]", href: "/dashboard/assistance-indemnisation-aerienne" },
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
  automations: "from-[#0faeb3] via-[#08a7ad] to-[#07949f]",
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
      window.setTimeout(() => setHomeNotice("Vous avez déjà 8 modules. Retirez-en un avant d’en ajouter un autre."), 0);
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
    if (from === to) return;
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
      <section className="relative overflow-hidden rounded-b-[46%_2.4rem] bg-[radial-gradient(circle_at_68%_9%,#6822b5_0%,#421388_38%,#210763_100%)] px-5 pb-9 pt-[max(1.2rem,env(safe-area-inset-top))] text-white shadow-[0_18px_35px_rgba(43,8,104,0.2)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_46%,rgba(116,52,213,0.24),transparent_31%),radial-gradient(circle_at_82%_60%,rgba(92,44,171,0.3),transparent_28%)]" />

        <div className="relative flex items-center justify-between gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_8px_24px_rgba(9,2,34,0.28)] ring-1 ring-white/60">
            {communityLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={communityLogo} alt={`Logo ${communityName}`} className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-black text-[#421388]">{communityName.slice(0, 2).toUpperCase()}</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href={resolveHref("/dashboard/events", basePath)}
              aria-label="Ouvrir l’Agenda IA"
              className="relative flex size-12 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white backdrop-blur-sm transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
              className="relative flex size-12 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white backdrop-blur-sm transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
                className="flex h-12 items-center gap-2 rounded-full bg-white/10 px-2.5 pr-3.5 text-white ring-1 ring-white/10 backdrop-blur-sm transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#a352e2] to-[#6730b6] text-xs font-black shadow-inner shadow-white/10">
                  {userAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={userAvatar} alt={userName} className="h-full w-full object-cover" />
                  ) : (
                    userName.slice(0, 2).toUpperCase()
                  )}
                </span>
                <ChevronDown className={cn("size-5 transition-transform", profileOpen && "rotate-180")} />
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

        <h1 className="relative mt-4 text-[clamp(2rem,9.2vw,2.85rem)] font-black leading-none tracking-[-0.045em]">
          Bienvenue, {firstName}
        </h1>

        <div className="relative mt-7">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex shrink-0 items-center gap-2.5 text-[1.35rem] font-extrabold tracking-[-0.025em]">
              <Sparkles className="size-6 shrink-0 fill-[#ffba13] text-[#ffba13]" />
              <span>Vos agents IA</span>
            </h2>
            <button
              type="button"
              onClick={scrollAgentsForward}
              aria-label="Afficher les agents IA suivants"
              className="flex size-11 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/10 backdrop-blur-sm transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ArrowRight className="size-5" />
            </button>
          </div>
        </div>

        <div
          ref={agentsScrollerRef}
          className="relative -mr-5 mt-3 snap-x snap-mandatory overflow-x-auto pb-2 pr-5 scroll-smooth [scrollbar-width:none] motion-reduce:scroll-auto [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex w-max gap-3 pr-5">
            {featuredAgents.map((agent) => {
              const accent = AGENT_ACCENTS[agent.slug] ?? AGENT_ACCENTS.david;
              const AccentIcon = accent.icon;
              return (
                <Link
                  key={agent.slug}
                  href={`${resolveHref("/dashboard/assistant", basePath)}?agent=${encodeURIComponent(agent.slug)}&prefill=${encodeURIComponent(getAgentPrompt(agent))}`}
                  className="relative h-[142px] w-[167px] shrink-0 snap-start overflow-hidden rounded-[1.6rem] border border-white/20 bg-white/[0.055] shadow-[0_12px_22px_rgba(17,2,58,0.2)] backdrop-blur-sm transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <span className={cn("absolute right-3 top-3 z-20 flex size-9 items-center justify-center rounded-full text-white shadow-lg", accent.surface)}>
                    <AccentIcon className="size-[18px] stroke-[2.4]" />
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={agent.image}
                    alt=""
                    aria-hidden="true"
                    className="absolute -bottom-1 left-0 h-[137px] w-[94px] object-contain object-bottom drop-shadow-[0_10px_12px_rgba(8,1,30,0.28)]"
                  />
                  <span className="absolute bottom-3 left-[88px] right-2 z-10 flex min-h-[58px] flex-col justify-end text-left">
                    <span className="block text-[16px] font-black leading-tight">{agent.name}</span>
                    <span className="mt-1 block break-words text-[11px] font-semibold leading-[1.25] text-white/90">{agent.role}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

      </section>

      <section className="px-5 pb-4 pt-7">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2.5 text-[clamp(1.55rem,7vw,2rem)] font-black leading-tight tracking-[-0.045em]">
          <Sparkles className="size-7 fill-[#ffb20b] text-[#ffb20b]" />
          Que souhaitez-vous faire ?
          </h2>
          {editMode ? <button type="button" onClick={() => setEditMode(false)} className="min-h-10 rounded-full bg-[#421388] px-4 text-xs font-black text-white shadow-sm">Terminé</button> : null}
        </div>
        {editMode ? <p className="mt-2 text-xs font-semibold text-slate-500">Maintenez et faites glisser un module pour changer son ordre. Touchez × pour le retirer.</p> : null}

        <div className="mt-4 grid grid-cols-2 gap-3.5">
          {visibleActions.map((action) => {
            const Icon = action.icon;
            const content = (
              <>
                {action.key === "publish" ? (
                  <span className="relative flex items-center gap-3 text-white" aria-label="Facebook, Instagram et WhatsApp">
                    <FacebookIcon className="size-[clamp(2rem,8vw,3.2rem)] !fill-white" />
                    <InstagramIcon className="size-[clamp(2rem,8vw,3.2rem)] !fill-none !stroke-white" />
                    <WhatsAppIcon className="size-[clamp(2rem,8vw,3.2rem)] !fill-white" />
                  </span>
                ) : <Icon className="relative size-[clamp(2.25rem,10vw,4rem)] shrink-0 stroke-[2]" />}
                <span className="relative min-w-0 max-w-full whitespace-normal text-[clamp(1rem,4.2vw,1.4rem)] font-black leading-[1.15] tracking-[-0.02em]">
                  {action.key === "contacts" ? (
                    <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
                      Contacts
                      <span className="inline-flex size-7 items-center justify-center rounded-lg bg-white text-[0.68rem] font-black tracking-normal text-[#075fdf] shadow-sm ring-1 ring-white/70">
                        AI
                      </span>
                    </span>
                  ) : action.key === "newsletter-paper" ? (
                    <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
                      Le Newsletter
                      <span className="inline-flex size-7 items-center justify-center rounded-lg bg-white text-[0.62rem] font-black tracking-normal text-[#172b48] shadow-sm ring-1 ring-white/70">
                        PDF
                      </span>
                    </span>
                  ) : action.title}
                </span>
              </>
            );
            const className = cn(
              "relative flex min-h-[118px] items-center gap-2 overflow-hidden rounded-[1.8rem] border border-white/25 px-3 py-5 text-left text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.32),inset_0_-1px_0_rgba(0,0,0,0.12),0_14px_28px_rgba(30,41,59,0.16)] transition-[transform,box-shadow] duration-200 active:scale-[0.975] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_5px_12px_rgba(30,41,59,0.16)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#36506d]/25 max-[520px]:min-h-[132px] max-[520px]:flex-col max-[520px]:justify-center max-[520px]:gap-2.5 max-[520px]:text-center",
              action.className,
              action.wide && "col-span-2 min-h-[96px] justify-center"
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
            const removable = editMode && homeModules.length > 0;
            const cardContent = <>
              {removable ? <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); removeHomeModule(action.key); }} className="absolute right-2 top-2 z-20 flex size-7 items-center justify-center rounded-full bg-white text-slate-700 shadow-md" aria-label={`Retirer ${action.title}`}><X className="size-4" /></button> : null}
              {editMode ? <span className="absolute left-2 top-2 z-20 flex size-7 items-center justify-center rounded-full bg-black/15 text-white"><GripVertical className="size-4" /></span> : null}
              {content}
            </>;

            if (action.href) {
              return (
                <Link key={action.key} href={resolveHref(action.href, basePath)} className={cn(className, editMode && "animate-[pulse_1.4s_ease-in-out_infinite]")} onClick={(event) => { if (editMode) event.preventDefault(); }} {...sharedProps}>
                  {cardContent}
                </Link>
              );
            }

            return (
              <button
                key={action.key}
                type="button"
                onClick={() => { if (!editMode && action.sectionKey) openSection(action.sectionKey); }}
                className={className}
                {...sharedProps}
              >
                {cardContent}
              </button>
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
          : "Email & Avis";

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
                        ? "Communication automatiser"
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
                          className="group relative flex min-h-[92px] items-center gap-4 overflow-hidden rounded-[1.55rem] bg-gradient-to-br from-[#0878ee] via-[#0668e8] to-[#064bd8] px-5 py-4 text-left text-white shadow-[0_15px_30px_rgba(6,88,220,0.28)] transition active:scale-[0.985] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300/50"
                        >
                          <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(255,255,255,0.16),transparent_34%),radial-gradient(circle_at_0%_100%,rgba(255,255,255,0.08),transparent_38%)]" aria-hidden="true" />
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
                            ? "from-[#ec3f85] to-[#d52a72]"
                            : item.href === "/dashboard/facebook"
                              ? "from-[#2678e8] to-[#1557c8]"
                              : "from-[#7130d8] to-[#5420ad]";
                        return (
                          <Link
                            key={item.href}
                            href={resolveHref(item.href, basePath)}
                            className={cn(
                              "relative flex min-h-[94px] flex-col items-center justify-center gap-2.5 overflow-hidden rounded-[1.35rem] bg-gradient-to-br px-3 py-4 text-center text-white shadow-[0_10px_22px_rgba(35,20,80,0.15)] transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#421388]/20",
                              buttonTone
                            )}
                          >
                            <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(255,255,255,0.15),transparent_38%)]" aria-hidden="true" />
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
                  <div className="grid grid-cols-2 gap-3">
                    {section.items.map((item, index) => {
                      const ItemIcon = item.icon;
                      const isLastOddItem = section.items.length % 2 === 1 && index === section.items.length - 1;
                      const buttonTone =
                        item.href === "/dashboard/shabbat-times-auto"
                          ? "from-[#f7b514] to-[#e89200]"
                          : item.href === "/dashboard/hayom-yom-sefer-hamitsvot"
                            ? "from-[#11aeb3] to-[#078e9b]"
                            : item.href === "/dashboard/jewish-birthdays"
                              ? "from-[#ef4f8b] to-[#d72e70]"
                              : item.href === "/dashboard/event-reminders-auto"
                                ? "from-[#2678e8] to-[#1557c8]"
                                : "from-[#bb3bd5] to-[#8625b5]";
                      return (
                        <Link
                          key={item.href}
                          href={resolveHref(item.href, basePath)}
                          className={cn(
                            "relative flex min-h-[112px] flex-col items-center justify-center gap-3 overflow-hidden rounded-[1.4rem] bg-gradient-to-br px-3 py-4 text-center text-white shadow-[0_11px_24px_rgba(35,20,80,0.15)] transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#421388]/20",
                            buttonTone,
                            isLastOddItem && "col-span-2 min-h-[96px] flex-row px-5"
                          )}
                        >
                          <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(255,255,255,0.16),transparent_38%),radial-gradient(circle_at_0%_100%,rgba(255,255,255,0.08),transparent_40%)]" aria-hidden="true" />
                          <span className="relative flex size-11 shrink-0 items-center justify-center rounded-[0.95rem] bg-white shadow-sm ring-1 ring-white/70">
                            {ItemIcon ? <ItemIcon className={cn("size-5", item.iconClass ?? "text-[#421388]")} /> : null}
                          </span>
                          <span className="relative max-w-full text-[clamp(0.85rem,3.8vw,1rem)] font-black uppercase leading-[1.16] tracking-[-0.015em]">
                            {item.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                ) : isCompactGridSection ? (
                  <div className="grid grid-cols-2 gap-3">
                    {section.items.map((item, index) => {
                      const ItemIcon = item.icon;
                      const buttonTones: Record<string, string[]> = {
                        torah: ["from-[#f7b514] to-[#e89200]", "from-[#14a7a4] to-[#087f85]"],
                        visuals: ["from-[#7130d8] to-[#5420ad]", "from-[#ec3f85] to-[#cc286e]"],
                        contacts: ["from-[#2678e8] to-[#1557c8]", "from-[#ff5357] to-[#df343e]"],
                        email: ["from-[#ed3d82] to-[#cb286b]", "from-[#f4a914] to-[#df8300]"],
                      };
                      const tones = buttonTones[section.key] ?? buttonTones.visuals;
                      const isLastOddItem = section.items.length % 2 === 1 && index === section.items.length - 1;
                      return (
                        <Link
                          key={item.href}
                          href={resolveHref(item.href, basePath)}
                          className={cn(
                            "relative flex min-h-[112px] flex-col items-center justify-center gap-3 overflow-hidden rounded-[1.4rem] bg-gradient-to-br px-3 py-4 text-center text-white shadow-[0_11px_24px_rgba(35,20,80,0.15)] transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#421388]/20",
                            tones[index % tones.length],
                            isLastOddItem && "col-span-2 min-h-[96px] flex-row px-5"
                          )}
                        >
                          <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(255,255,255,0.16),transparent_38%),radial-gradient(circle_at_0%_100%,rgba(255,255,255,0.08),transparent_40%)]" aria-hidden="true" />
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
