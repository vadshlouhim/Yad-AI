"use client";

import { useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactElement, type ReactNode, type SVGProps } from "react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Cake,
  Camera,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Globe2,
  Headphones,
  Image,
  Mail,
  Plane,
  Settings,
  ShoppingBag,
  Sparkles,
  Target,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  WhatsAppIcon,
  type OfficialDashboardMenuItem,
  type OfficialDashboardMenuSection,
} from "./dashboard-nav";
import { DASHBOARD_MENU_COLORS } from "@/components/dashboard/dashboard-module-colors";
import { MOBILE_HOME_DEFAULT_MODULES, type MobileHomeModuleKey } from "@/lib/mobile-dashboard/modules";
import { useDashboardCopy } from "@/lib/i18n/use-dashboard-copy";

const PERSONALIZABLE_HOME_MODULES = new Set<MobileHomeModuleKey>([
  "publish",
  "newsletter-paper",
  "shabbat-times",
  "event-reminders",
  "daily-study",
  "birthdays-yahrzeit",
  "visuals",
  "photo-recap",
  "torah",
  "targeted",
  "email-reviews",
  "shop",
]);

type ToolGroup = {
  key: string;
  title: string;
  icon: LucideIcon | ((props: SVGProps<SVGSVGElement>) => ReactElement);
  tone: string;
  items: OfficialDashboardMenuItem[];
  description?: string;
  comingSoon?: boolean;
  href?: string;
  wide?: boolean;
  compact?: boolean;
  homeModuleKey?: MobileHomeModuleKey;
  badge?: string;
};

type MobileMainMenuDialogProps = {
  communityName: string;
  sections: OfficialDashboardMenuSection[];
  onClose: () => void;
};

export function MobileMainMenuDialog({ communityName, sections, onClose }: MobileMainMenuDialogProps) {
  const router = useRouter();
  const locale = useLocale();
  const tr = useDashboardCopy();
  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(null);
  const [homeModules, setHomeModules] = useState<MobileHomeModuleKey[] | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    let active = true;
    fetch("/api/dashboard/mobile-home")
      .then((response) => response.ok ? response.json() : null)
      .then((data: { modules?: MobileHomeModuleKey[] } | null) => {
        if (!active) return;
        setHomeModules(Array.isArray(data?.modules) ? data.modules : [...MOBILE_HOME_DEFAULT_MODULES]);
      })
      .catch(() => {
        if (active) setHomeModules([...MOBILE_HOME_DEFAULT_MODULES]);
      });
    return () => { active = false; };
  }, []);

  function beginAddToHome(key?: MobileHomeModuleKey) {
    if (!key) return;
    longPressTimerRef.current = setTimeout(() => {
      suppressClickRef.current = true;
      onClose();
      router.push(`/dashboard/overview?addModule=${encodeURIComponent(key)}&edit=1`);
    }, 520);
  }

  function clearAddToHome() {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  }

  const menu = useMemo(() => {
    const allItems = sections.flatMap((section) => section.items);
    const emailSection = sections.find((section) => section.key === "email");
    const item = (href: string, label: string, icon: LucideIcon): OfficialDashboardMenuItem => {
      const existing = allItems.find((candidate) => candidate.href === href);
      return existing ? { ...existing, label } : { href, label, icon };
    };

    const primaryTools: ToolGroup[] = [
      {
        key: "agenda",
        title: "Mon agenda",
        icon: CalendarDays,
        tone: DASHBOARD_MENU_COLORS["automations"],
        href: "/dashboard/events",
        items: [],
      },
      {
        key: "publish",
        title: "Publier partout en un clic",
        icon: Sparkles,
        tone: DASHBOARD_MENU_COLORS.publish,
        href: "/dashboard/social-networks",
        items: [],
        homeModuleKey: "publish",
      },
      {
        key: "newsletter-paper",
        title: "Newsletter",
        icon: Mail,
        tone: DASHBOARD_MENU_COLORS["newsletter-paper"],
        href: "/dashboard/newsletter",
        items: [],
        homeModuleKey: "newsletter-paper",
      },
      {
        key: "shabbat-times",
        title: "Horaires de Chabbat & Fêtes",
        icon: Clock3,
        tone: DASHBOARD_MENU_COLORS["shabbat-times"],
        href: "/dashboard/shabbat-times-auto",
        items: [],
        homeModuleKey: "shabbat-times",
      },
      {
        key: "event-reminders",
        title: "Automatisations",
        icon: CalendarDays,
        tone: DASHBOARD_MENU_COLORS["event-reminders"],
        href: "/dashboard/event-reminders-auto",
        items: [],
        homeModuleKey: "event-reminders",
      },
      {
        key: "birthdays-yahrzeit",
        title: "Anniversaires & Yahrzeit",
        icon: Cake,
        tone: DASHBOARD_MENU_COLORS["birthdays-yahrzeit"],
        href: "/dashboard/jewish-birthdays",
        items: [],
        homeModuleKey: "birthdays-yahrzeit",
      },
      {
        key: "visuals",
        title: "Affiches professionnelles",
        icon: Image,
        tone: DASHBOARD_MENU_COLORS.visuals,
        href: "/dashboard/templates",
        items: [],
        homeModuleKey: "visuals",
      },
      {
        key: "photo-recap",
        title: "Récap photos",
        icon: Camera,
        tone: DASHBOARD_MENU_COLORS["photo-recap"],
        href: "/dashboard/recap-auto",
        items: [],
        homeModuleKey: "photo-recap",
      },
      {
        key: "torah",
        title: "Cours de Torah",
        icon: BookOpen,
        tone: DASHBOARD_MENU_COLORS.torah,
        href: "/dashboard/torah",
        items: [],
        homeModuleKey: "torah",
      },
      {
        key: "contacts",
        title: "CRM intelligent",
        icon: User,
        tone: DASHBOARD_MENU_COLORS.contacts,
        href: "/dashboard/contacts",
        items: [],
        homeModuleKey: "contacts",
        badge: "Connecté",
      },
      {
        key: "whatsapp",
        title: "WhatsApp automatisé",
        icon: WhatsAppIcon,
        tone: DASHBOARD_MENU_COLORS["whatsapp"],
        items: [],
        href: "/dashboard/whatsapp",
        homeModuleKey: "whatsapp",
        wide: true,
        description: "Préparez et organisez vos envois WhatsApp avec l’assistance de l’IA.",
      },
    ];

    const secondaryTools: ToolGroup[] = [
      {
        key: "daily-study",
        title: "Hayom Yom & Sefer Hamitsvot",
        icon: BookOpen,
        tone: DASHBOARD_MENU_COLORS["daily-study"],
        href: "/dashboard/hayom-yom-sefer-hamitsvot",
        items: [],
        homeModuleKey: "daily-study",
      },
      {
        key: "targeted",
        title: "Communication ciblée",
        icon: Target,
        tone: DASHBOARD_MENU_COLORS.targeted,
        href: "/dashboard/communication-ciblee",
        items: [],
        homeModuleKey: "targeted",
      },
      {
        key: "email-reviews",
        title: "Email & Avis Google",
        icon: Mail,
        tone: DASHBOARD_MENU_COLORS["email-reviews"],
        items: emailSection?.items ?? [],
        homeModuleKey: "email-reviews",
      },
      {
        key: "shop",
        title: "BOUTIQUE EN LIGNE",
        icon: ShoppingBag,
        tone: "border border-[#eadcb8] bg-[linear-gradient(135deg,#fffdf7_0%,#fff3d3_100%)] !text-[#321451]",
        href: "https://linktr.ee/Yadshlouhim",
        items: [],
        homeModuleKey: "shop",
        badge: "Articles et produits pour les communautés",
      },
      {
        key: "compensation",
        title: "Assistance indemnisation",
        icon: Plane,
        tone: DASHBOARD_MENU_COLORS["assistance"],
        href: "/dashboard/assistance-indemnisation-aerienne",
        items: [],
        homeModuleKey: "assistance",
      },
      {
        key: "seo",
        title: "Référencement IA",
        icon: Globe2,
        tone: DASHBOARD_MENU_COLORS["seo"],
        href: "/dashboard/referencement",
        items: [],
        homeModuleKey: "seo",
      },
      {
        key: "website",
        title: "Création de site web",
        icon: Globe2,
        tone: DASHBOARD_MENU_COLORS["website"],
        items: [],
        href: "/dashboard/website",
        homeModuleKey: "website",
        description: "Créez votre site communautaire et améliorez sa visibilité sur Google grâce à l’IA.",
      },
    ];

    const comingSoon: ToolGroup[] = [];

    const account = [
      item("/dashboard/settings", "Paramètres", Settings),
      item("/help", "Support et suggestions", Headphones),
      item("/dashboard/settings?section=profile", "Profil", User),
    ];

    const localizeGroup = (group: ToolGroup): ToolGroup => ({
      ...group,
      title: tr(group.title),
      description: group.description ? tr(group.description) : group.description,
      badge: group.badge ? tr(group.badge) : group.badge,
      items: group.items.map((entry) => ({ ...entry, label: tr(entry.label) })),
    });

    return {
      tools: [...primaryTools, ...secondaryTools].map(localizeGroup),
      primaryTools: primaryTools.map(localizeGroup),
      secondaryTools: secondaryTools.map(localizeGroup),
      comingSoon: comingSoon.filter((group) => group.comingSoon).map(localizeGroup),
      account: account.map((entry) => ({ ...entry, label: tr(entry.label) })),
    };
  }, [sections, tr]);

  const activeGroup = [...menu.tools, ...menu.comingSoon].find((group) => group.key === activeGroupKey) ?? null;
  const activeHomeModuleKeys = new Set(homeModules ?? []);
  const removedHomeTools = menu.tools.filter((group) =>
    group.homeModuleKey
      && PERSONALIZABLE_HOME_MODULES.has(group.homeModuleKey)
      && !activeHomeModuleKeys.has(group.homeModuleKey)
  );

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[1000] bg-[#16052f]/70 backdrop-blur-[4px] md:hidden"
        onClick={onClose}
        aria-label={locale === "he" ? "סגירת הכלים האחרים" : "Fermer les autres outils"}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-tools-title"
        className="fixed left-1/2 top-1/2 z-[1001] flex h-[86dvh] max-h-[50rem] w-[calc(100%-1.25rem)] max-w-[27rem] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[2rem] border border-white/20 bg-[#fffaf4] uppercase shadow-[0_32px_90px_rgba(15,3,45,0.5)] md:hidden"
      >
        <header className="relative shrink-0 overflow-hidden bg-[radial-gradient(circle_at_75%_0%,#6d2abd_0%,#421388_48%,#260767_100%)] px-5 pb-5 pt-[max(1.15rem,env(safe-area-inset-top))] text-white">
          <span className="pointer-events-none absolute -end-10 -top-12 size-36 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              {activeGroup && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveGroupKey(null);
                  }}
                  className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  aria-label={locale === "he" ? "חזרה לכלים האחרים" : "Retour aux autres outils"}
                >
                  <ArrowLeft className="rtl-mirror size-5" />
                </button>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/65">EasyCom IA</p>
                <h1 id="mobile-tools-title" className="mt-0.5 text-[clamp(1.25rem,6vw,1.65rem)] font-black leading-tight tracking-[-0.035em]">
                  {(activeGroup?.title ?? (locale === "he" ? "כלים נוספים" : "AUTRES OUTILS")).toUpperCase()}
                </h1>
              </div>
            </div>
            <button
              type="button"
              autoFocus
              onClick={onClose}
              className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label={locale === "he" ? "סגירת הכלים האחרים" : "Fermer les autres outils"}
            >
              <X className="size-5" />
            </button>
          </div>
          {!activeGroup && <p className="relative mt-1 truncate text-xs font-medium text-white/70">{communityName}</p>}
        </header>

        <div className="flex-1 overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5">
          {activeGroup ? (
            activeGroup.comingSoon ? <ComingSoonDetail group={activeGroup} /> : <Submenu group={activeGroup} onClose={onClose} />
          ) : (
            <>

              <SectionTitle>{tr("Tous les modules")}</SectionTitle>
              {homeModules === null ? (
                <div className="rounded-[1.4rem] border border-violet-100 bg-white px-4 py-6 text-center text-sm font-bold normal-case text-slate-500 shadow-sm">
                  {locale === "he" ? "המודולים שלכם נטענים…" : "Chargement de vos modules…"}
                </div>
              ) : removedHomeTools.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {removedHomeTools.map((group) => (
                    <ToolCard key={group.key} group={group} onOpen={() => setActiveGroupKey(group.key)} onClose={onClose} onLongPressStart={beginAddToHome} onLongPressEnd={clearAddToHome} suppressClickRef={suppressClickRef} />
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.4rem] border border-violet-100 bg-white px-5 py-7 text-center normal-case shadow-sm">
                  <CheckCircle2 className="mx-auto size-8 text-emerald-600" />
                  <p className="mt-3 text-sm font-black text-slate-800">{locale === "he" ? "כל המודולים שלכם נמצאים בדף הבית." : "Tous vos modules sont sur l’accueil."}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{locale === "he" ? "הסירו כרטיס באמצעות האיקס הקטן כדי למצוא אותו כאן." : "Retirez une carte avec sa petite croix pour la retrouver ici."}</p>
                </div>
              )}

              {menu.comingSoon.length > 0 ? (
                <>
                  <SectionTitle>{tr("À venir")}</SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    {menu.comingSoon.map((group) => (
                      <ComingSoonCard key={group.key} group={group} onOpen={() => setActiveGroupKey(group.key)} />
                    ))}
                  </div>
                </>
              ) : null}

              <SectionTitle>{tr("Mon compte")}</SectionTitle>
              <div className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-[0_8px_22px_rgba(35,24,70,0.05)]">
                {menu.account.map((entry, index) => {
                  const Icon = entry.icon;
                  const rowClass = cn(
                    "flex min-h-14 w-full items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-violet-50 active:bg-violet-100",
                    index > 0 && "border-t border-slate-100"
                  );
                  const content = (
                    <>
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-[#421388]">
                        {Icon ? <Icon className="size-[18px]" /> : null}
                      </span>
                      <span className="flex-1 text-start uppercase">{entry.label}</span>
                      <ChevronRight className="rtl-mirror size-4 text-slate-300" />
                    </>
                  );

                  return (
                    <Link
                      key={entry.href}
                      href={entry.href}
                      onClick={onClose}
                      className={rowClass}
                    >
                      {content}
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}

function ToolCard({ group, onOpen, onClose, onLongPressStart, onLongPressEnd, suppressClickRef }: {
  group: ToolGroup;
  onOpen: () => void;
  onClose: () => void;
  onLongPressStart: (key?: MobileHomeModuleKey) => void;
  onLongPressEnd: () => void;
  suppressClickRef: MutableRefObject<boolean>;
}) {
  const Icon = group.icon;
  const className = cn(
    "relative flex min-h-[142px] flex-col items-center justify-center gap-3 overflow-hidden rounded-[1.55rem] px-2.5 py-4 text-center text-white shadow-[0_13px_26px_rgba(35,20,80,0.16)] transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#421388]/20",
    group.tone,
    group.wide && "col-span-2 min-h-[102px] flex-row px-5",
    group.compact && "min-h-[88px] gap-1.5 px-2.5 py-2.5"
  );
  const content = (
    <>
      <Icon className={cn("relative size-10 shrink-0 stroke-[2.1]", group.compact && "size-6")} />
      <span className="relative flex min-w-0 flex-col items-center gap-2">
        <span className={cn("max-w-full text-[clamp(0.78rem,3.45vw,1rem)] font-black uppercase leading-[1.13] tracking-[-0.02em]", group.compact && "text-xs tracking-normal")}>{group.title}</span>
        {group.badge ? <span className="rounded-full bg-white px-2.5 py-1 text-[0.62rem] font-black normal-case tracking-normal text-[#075fdf] shadow-sm ring-1 ring-white/80">{group.badge}</span> : null}
      </span>
    </>
  );

  const pointerProps = {
    onPointerDown: () => onLongPressStart(group.homeModuleKey),
    onPointerUp: onLongPressEnd,
    onPointerLeave: onLongPressEnd,
    onPointerCancel: onLongPressEnd,
  };

  if (group.href?.startsWith("http")) return (
    <a href={group.href} onClick={(event) => {
      if (suppressClickRef.current) {
        event.preventDefault();
        suppressClickRef.current = false;
        return;
      }
      onClose();
    }} className={className} {...pointerProps}>{content}</a>
  );

  return group.href ? (
    <Link href={group.href} onClick={(event) => {
      if (suppressClickRef.current) {
        event.preventDefault();
        suppressClickRef.current = false;
        return;
      }
      onClose();
    }} className={className} {...pointerProps}>{content}</Link>
  ) : (
    <button type="button" onClick={() => {
      if (suppressClickRef.current) { suppressClickRef.current = false; return; }
      onOpen();
    }} className={className} {...pointerProps}>{content}</button>
  );
}

function ComingSoonCard({ group, onOpen }: { group: ToolGroup; onOpen: () => void }) {
  const tr = useDashboardCopy();
  const Icon = group.icon;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "relative flex min-h-[108px] flex-col items-center justify-center gap-2.5 overflow-hidden rounded-[1.4rem] px-3 pb-3 pt-6 text-center text-white shadow-[0_10px_22px_rgba(35,20,80,0.12)] transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#421388]/15",
        group.tone
      )}
    >
      <span className="absolute end-2.5 top-2.5 rounded-full bg-white/90 px-2 py-1 text-[8px] font-black uppercase tracking-wide text-slate-600">{tr("Bientôt")}</span>
      <Icon className="size-8" />
      <span className="text-sm font-black uppercase leading-tight">{group.title}</span>
    </button>
  );
}

function ComingSoonDetail({ group }: { group: ToolGroup }) {
  const tr = useDashboardCopy();
  const locale = useLocale();
  const Icon = group.icon;
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-3 text-center normal-case">
      <span className={cn("flex size-20 items-center justify-center rounded-[1.7rem] text-white shadow-[0_18px_34px_rgba(35,20,80,0.18)]", group.tone)}>
        <Icon className="size-9" />
      </span>
      <span className="mt-5 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-800">{tr("Bientot disponible")}</span>
      <h2 className="mt-3 text-2xl font-black text-slate-950">{group.title}</h2>
      <p className="mt-3 max-w-sm text-sm font-medium leading-6 text-slate-600">{group.description}</p>
      <p className="mt-5 text-xs font-bold leading-5 text-slate-400">{locale === "he" ? "התכונה בהכנה ועדיין אינה פותחת סביבת עבודה." : "Cette fonction est en preparation. Elle n’ouvre pas encore son espace de travail."}</p>
    </div>
  );
}

function Submenu({ group, onClose }: { group: ToolGroup; onClose: () => void }) {
  const tr = useDashboardCopy();
  const locale = useLocale();
  return (
    <div>
      <p className="mb-3 text-sm font-bold uppercase text-slate-500">{locale === "he" ? "בחרו פעולה" : "CHOISISSEZ UNE FONCTION"}</p>
      <div className="space-y-2.5">
        {group.items.map((entry, index) => {
          const Icon = entry.icon;
          return (
            <Link
              key={`${entry.href}-${entry.label}-${index}`}
              href={entry.href}
              onClick={onClose}
              className="group flex min-h-16 items-center gap-3 rounded-[1.25rem] border border-slate-200 bg-white px-3.5 py-3 text-slate-800 shadow-[0_8px_20px_rgba(35,24,70,0.06)] transition active:scale-[0.985] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#421388]/20"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#421388]/8 text-[#421388]">
                {Icon ? <Icon className="size-5" /> : <Sparkles className="size-5" />}
              </span>
              <span className="min-w-0 flex-1 text-[15px] font-extrabold uppercase leading-tight">{entry.label}</span>
              {entry.badge && <span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] font-black text-amber-800">{tr("Bientôt")}</span>}
              <ChevronRight className="rtl-mirror size-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 mt-7 text-center text-base font-black uppercase tracking-tight text-slate-950">{children}</h2>;
}
