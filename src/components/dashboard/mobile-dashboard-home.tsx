"use client";

import { useLocale, useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ArrowRight,
  Bell,
  BookOpen,
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
import { ASSISTANT_AGENT } from "@/lib/agents";
import { ComingSoonBanner } from "@/components/coming-soon/coming-soon-banner";
import { useComingSoonGate } from "@/components/dashboard/coming-soon-dialog";
import {
  getOfficialDashboardMenuSections,
  OFFICIAL_MENU_SECTION_STYLES,
  type OfficialDashboardMenuSection,
} from "@/components/layout/dashboard-nav";
import { MOBILE_HOME_DEFAULT_MODULES, MOBILE_HOME_MODULES, MOBILE_HOME_MAX_MODULES, type MobileHomeModuleKey } from "@/lib/mobile-dashboard/modules";
import { useDashboardCopy } from "@/lib/i18n/use-dashboard-copy";

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

const MODAL_TONES: Record<string, string> = {
  social: "from-[#0878ee] via-[#0668e8] to-[#064bd8]",
  automations: "from-[#f36756] via-[#df4639] to-[#b9302a]",
  targeted: "from-[#ff4c50] via-[#f63f47] to-[#e9333d]",
  torah: "from-[#ffbd16] via-[#f7ad05] to-[#ee9b00]",
  visuals: "from-[#7130d8] via-[#6d2bc8] to-[#5722b1]",
  contacts: "from-[#0a72ec] via-[#075fdf] to-[#0649cb]",
  email: "from-[#f33967] via-[#ed3262] to-[#dc2860]",
};

const SECTION_HREFS: Record<string, string> = {
  email: "/dashboard/email",
  visuals: "/dashboard/templates",
};

function resolveHref(href: string, basePath: "/dashboard" | "/demo") {
  return href.startsWith("/dashboard") ? href.replace("/dashboard", basePath) : href;
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
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const tr = useDashboardCopy();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isBlocked, guard, openComingSoon, comingSoonDialog } = useComingSoonGate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [homeModules, setHomeModules] = useState<MobileHomeModuleKey[]>([...MOBILE_HOME_DEFAULT_MODULES]);
  const [homeLoaded, setHomeLoaded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [draggingKey, setDraggingKey] = useState<MobileHomeModuleKey | null>(null);
  const [undoModule, setUndoModule] = useState<MobileHomeModuleKey | null>(null);
  const [homeNotice, setHomeNotice] = useState<string | null>(null);
  const addedModuleRef = useRef(false);
  const moduleKey = searchParams.get("module");
  const sections = useMemo(() => getOfficialDashboardMenuSections(communityType, tr), [communityType, tr]);
  const sectionByKey = useMemo(
    () => new Map(sections.map((section) => [section.key, section])),
    [sections]
  );
  const selectedSection = useMemo(() => {
    if (!moduleKey) return undefined;
    return sectionByKey.get(moduleKey);
  }, [moduleKey, sectionByKey]);
  const actionByKey = useMemo(() => new Map(ACTION_CARDS.map((action) => [action.key, {
    ...action,
    title: tr(action.title),
    badge: action.badge ? tr(action.badge) : action.badge,
  }])), [tr]);
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
      window.setTimeout(() => setHomeNotice(locale === "he" ? `כבר יש לכם ${MOBILE_HOME_MAX_MODULES} מודולים. הסירו אחד לפני הוספת מודול חדש.` : `Vous avez déjà ${MOBILE_HOME_MAX_MODULES} modules. Retirez-en un avant d’en ajouter un autre.`), 0);
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
  }, [homeLoaded, homeModules, locale, pathname, router, searchParams]);

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

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
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
              onClick={guard("/dashboard/events")}
              aria-label={tr("Ouvrir l’Agenda IA")}
              className="relative flex size-10 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white backdrop-blur-sm transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <span className="relative flex size-7 items-center justify-center rounded-full bg-white/16 ring-1 ring-white/15">
                <CalendarDays className="size-4.5 stroke-[2.25]" />
                <span className="absolute -end-1 -top-1 rounded-full bg-[#23c45e] px-1 py-[1px] text-[0.43rem] font-black uppercase leading-none text-white shadow-sm">
                  IA
                </span>
              </span>
            </Link>

            <Link
              href={resolveHref("/dashboard/notifications", basePath)}
              aria-label={tr("Ouvrir les notifications")}
              className="relative flex size-10 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white backdrop-blur-sm transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Bell className="size-6 stroke-[2.2]" />
              {unreadNotifications > 0 && (
                <span className="absolute end-0.5 top-0.5 size-3 rounded-full border-2 border-[#421388] bg-[#ff534c]" />
              )}
            </Link>

            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                aria-expanded={profileOpen}
                aria-label={tr("Ouvrir le menu du profil")}
                className="flex h-10 items-center gap-1.5 rounded-full bg-white/10 px-1.5 pe-2.5 text-white ring-1 ring-white/10 backdrop-blur-sm transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
                    aria-label={locale === "he" ? "סגירת תפריט הפרופיל" : "Fermer le menu du profil"}
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => setProfileOpen(false)}
                  />
                  <div className="absolute end-0 top-[calc(100%+0.65rem)] z-50 w-60 overflow-hidden rounded-3xl border border-white/20 bg-white p-2 text-slate-700 shadow-2xl shadow-[#1d0752]/30">
                    <div className="border-b border-slate-100 px-3 py-2.5">
                      <p className="truncate text-sm font-bold text-slate-950">{userName}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{communityName}</p>
                    </div>
                    <Link
                      href={resolveHref("/dashboard/settings/billing", basePath)}
                      onClick={() => setProfileOpen(false)}
                      className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 py-2 text-start text-sm font-semibold transition hover:bg-violet-50 hover:text-[#421388]"
                    >
                      <CreditCard className="size-4" />
                      {tr("Abonnement")}
                    </Link>
                    <Link
                      href={resolveHref("/dashboard/settings?section=profile", basePath)}
                      onClick={() => setProfileOpen(false)}
                      className="flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold transition hover:bg-violet-50 hover:text-[#421388]"
                    >
                      <User className="size-4" />
                      {tr("Mon profil")}
                    </Link>
                    <Link
                      href={resolveHref("/dashboard/settings", basePath)}
                      onClick={() => setProfileOpen(false)}
                      className="flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold transition hover:bg-violet-50 hover:text-[#421388]"
                    >
                      <Settings className="size-4" />
                      {tr("Paramètres")}
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 py-2 text-start text-sm font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      <LogOut className="size-4" />
                      {tr("Se déconnecter")}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="relative mt-2.5 flex items-end justify-between gap-3">
          <h1 className="min-w-0 text-[clamp(1.7rem,7.8vw,2.3rem)] font-black leading-none tracking-[-0.045em]">
            {t("welcome", { name: firstName })}
          </h1>
          <LanguageSwitcher compact className="shrink-0" />
        </div>

        <Link
          href={resolveHref("/dashboard/assistant", basePath)}
          onClick={guard("/dashboard/assistant")}
          aria-label={tr("Ouvrir l’Assistant EasyCom")}
          className="relative mt-4 flex min-h-[112px] items-center gap-3 overflow-hidden rounded-[1.35rem] border border-white/20 bg-white/[0.055] pe-4 shadow-[0_12px_22px_rgba(17,2,58,0.2)] backdrop-blur-sm transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <Image
            src={ASSISTANT_AGENT.image}
            width={94}
            height={137}
            sizes="84px"
            alt=""
            aria-hidden="true"
            className="-mb-1 h-[112px] w-[84px] shrink-0 self-end object-contain object-bottom drop-shadow-[0_10px_12px_rgba(8,1,30,0.28)]"
          />
          <span className="min-w-0 flex-1 text-start">
            <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-[#ffd04c]">
              <Sparkles className="size-3.5 fill-[#ffba13] text-[#ffba13]" />
              {tr("Votre assistant IA")}
            </span>
            <span className="mt-1 block text-lg font-black leading-tight">{ASSISTANT_AGENT.name} · {tr(ASSISTANT_AGENT.role)}</span>
            <span className="mt-0.5 block text-xs font-semibold leading-5 text-white/85">{tr("Posez votre question, David s’occupe du reste.")}</span>
          </span>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[#421388] shadow-lg">
            <ArrowRight className="rtl-mirror size-5" />
          </span>
        </Link>

      </section>

      <section className="mx-auto w-full max-w-[52rem] px-3 pb-5 pt-4 sm:px-6 sm:pb-7 sm:pt-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black leading-tight tracking-tight text-slate-950 sm:text-2xl">
            {tr("Que souhaitez-vous faire ?")}
          </h2>
          {editMode ? <button type="button" onClick={() => setEditMode(false)} className="min-h-10 rounded-full bg-[#421388] px-4 text-xs font-black text-white shadow-sm">{tr("Terminé")}</button> : null}
        </div>
        {editMode ? <p className="mt-2 text-xs font-semibold text-slate-500">{locale === "he" ? "לחצו לחיצה ארוכה וגררו מודול כדי לשנות את הסדר. לחצו על × כדי להסיר אותו." : "Maintenez et faites glisser un module pour changer son ordre. Touchez × pour le retirer."}</p> : null}

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
                    <span className="relative min-w-0 flex-1 text-start">
                      <span className="block truncate text-sm font-black leading-tight tracking-[-0.02em] sm:text-base">{action.title}</span>
                      <span className="mt-1 block truncate text-[0.64rem] font-bold leading-tight text-violet-100 sm:text-xs">{action.badge}</span>
                    </span>
                    <span className="relative flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/15 sm:size-9">
                      <ArrowRight className="rtl-mirror size-4" />
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
              action.key === "shop" && "!min-h-[72px] !flex-row !justify-start !gap-3 rounded-[1.45rem] px-3.5 py-3 !text-start shadow-[0_16px_30px_-18px_rgba(66,19,136,0.65)] sm:!min-h-[80px] sm:px-5",
              editMode && action.key === "shop" && "pe-12"
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
              {editMode && !isFixedCard ? <span className="absolute start-2 top-2 z-20 flex size-7 items-center justify-center rounded-full bg-black/15 text-white"><GripVertical className="size-4" /></span> : null}
              {content}
            </>;
            const removeButton = editMode && !isFixedCard ? <button type="button" onClick={() => removeHomeModule(action.key)} className="absolute end-1.5 top-1.5 z-20 flex size-8 items-center justify-center text-white/65 transition hover:text-white active:scale-90 focus-visible:rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70" aria-label={locale === "he" ? `הסרת ${action.title} מדף הבית` : `Retirer ${action.title} de mon accueil`}><X className="size-3.5 drop-shadow-sm" /></button> : null;

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
                  <Link href={resolveHref(action.href, basePath)} className={cardClassName} onClick={(event) => { if (editMode) event.preventDefault(); else guard(action.href!)(event); }}>{cardContent}</Link>
                  {removeButton}
                </div>
              );
            }

            return (
              <div key={action.key} className={layoutClassName} {...sharedProps}>
                <button type="button" onClick={() => {
                  if (editMode || !action.sectionKey) return;
                  if (isBlocked(SECTION_HREFS[action.sectionKey] ?? "")) openComingSoon();
                  else openSection(action.sectionKey);
                }} className={cardClassName}>{cardContent}</button>
                {removeButton}
              </div>
            );
          })}
        </div>
        {undoModule ? <div className="fixed bottom-[6.5rem] left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-bold text-white shadow-xl"><span>{tr("Module retiré")}</span><button type="button" onClick={restoreHomeModule} className="text-[#f2c75c]">{tr("Annuler")}</button></div> : null}
        {homeNotice ? <button type="button" onClick={() => setHomeNotice(null)} className="fixed bottom-[6.5rem] left-1/2 z-50 w-[calc(100%-2rem)] -translate-x-1/2 rounded-2xl bg-slate-950 px-4 py-3 text-start text-xs font-bold text-white shadow-xl">{homeNotice}</button> : null}
        {basePath === "/dashboard" ? <div className="mt-5"><ComingSoonBanner onClick={guard("/fonctionnalites-a-venir")} /></div> : null}
      </section>
      {comingSoonDialog}

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
  const locale = useLocale();
  const tr = useDashboardCopy();
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
      ? tr("Cours de Torah")
      : section?.key === "visuals"
        ? locale === "he" ? "מודעות" : "Affiches"
        : section?.key === "contacts"
          ? tr("CONTACTS")
          : locale === "he" ? "אימייל וביקורות Google" : "Email et Avis Google";

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
                      ? tr("Publier partout en un clic")
                      : isCommunitySection
                        ? locale === "he" ? "אוטומציה של התקשורת שלכם" : "Automatiser votre communication"
                        : isCompactGridSection
                          ? section.key === "contacts" ? (
                              <span className="inline-flex items-center gap-2">
                                {tr("CONTACTS")}
                                <span className="inline-flex size-7 items-center justify-center rounded-lg bg-white text-[0.68rem] font-black tracking-normal text-[#075fdf] shadow-sm">
                                  AI
                                </span>
                              </span>
                            ) : compactGridTitle
                          : section.section}
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className={cn("mt-1 text-sm leading-5 text-white/82", (isSocialSection || isCommunitySection || isCompactGridSection || !section.subtitle) && "sr-only")}>
                    {section.subtitle || (locale === "he" ? `בחרו פעולה מתוך ${section.section}.` : `Choisissez une fonction dans ${section.section.toLowerCase()}.`)}
                  </DialogPrimitive.Description>
                </div>
                <DialogPrimitive.Close className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/16 text-white ring-1 ring-white/25 transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  <X className="size-5" />
                  <span className="sr-only">{tr("Fermer")}</span>
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
                          className="home-tool-publish group relative flex min-h-[92px] items-center gap-4 overflow-hidden rounded-[1.55rem] px-5 py-4 text-start text-white shadow-[0_15px_30px_rgba(6,88,220,0.28)] transition active:scale-[0.985] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300/50"
                        >
                          <span className="relative flex size-13 shrink-0 items-center justify-center rounded-[1.1rem] bg-white/16 ring-1 ring-white/20">
                            {PrimaryIcon ? <PrimaryIcon className="size-6 text-white" /> : null}
                          </span>
                          <span className="relative min-w-0 flex-1 text-[1.05rem] font-black uppercase leading-tight">{tr("Publier sur tous mes réseaux")}</span>
                          <ArrowRight className="rtl-mirror relative size-5 shrink-0 text-white/80 transition group-hover:translate-x-0.5" />
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
                              {item.href === "/dashboard/publications" ? tr("Historique des publications") : item.label}
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
                          <ArrowRight className="rtl-mirror absolute end-3 top-3 size-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#421388]" />
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
                        {tr("Automatisations enregistrées")}
                        <ArrowRight className="rtl-mirror size-4" />
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
                          className="flex min-h-[62px] items-center gap-3 rounded-[1.25rem] px-3 py-2.5 text-start transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#421388]/25"
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
                          <ArrowRight className="rtl-mirror size-4 shrink-0 text-slate-300" />
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
