"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, Bot, CalendarDays, ChevronDown, Zap, X, User, Settings, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  DASHBOARD_DESKTOP_CATEGORIES,
  DASHBOARD_NAV_ITEMS,
  DASHBOARD_TOP_ITEM,
} from "./dashboard-nav";

interface SidebarProps {
  community: {
    id: string;
    name: string;
    logoUrl: string | null;
    plan: string;
    communityType?: string | null;
  };
  userAvatar: string | null | undefined;
  userName: string;
  basePath?: string;
}

const COMMUNITY_TYPE_LABELS: Record<string, string> = {
  SYNAGOGUE: "synagogues",
  ASSOCIATION: "associations",
  SCHOOL: "écoles",
  CENTER: "centres communautaires",
  RESTAURANT: "restaurants",
  CATERER: "traiteurs",
  SPORT_COACH: "coachs sportifs",
  COMMERCE: "commerces",
  BUSINESS: "entreprises",
  CONTENT_CREATOR: "créateurs de contenu",
};

function getStructureLabel(communityType?: string | null): string {
  return communityType ? (COMMUNITY_TYPE_LABELS[communityType] ?? "vous") : "vous";
}

const PLAN_COLORS: Record<string, string> = {
  FREE_TRIAL: "bg-amber-500",
  STARTER: "bg-violet-500",
  PROFESSIONAL: "bg-violet-500",
  ENTERPRISE: "bg-violet-500",
};

const PLAN_LABELS: Record<string, string> = {
  FREE_TRIAL: "Gratuit",
  STARTER: "Payant",
  PROFESSIONAL: "Payant",
  ENTERPRISE: "Payant",
};

const DESKTOP_CATEGORY_CONTENT: Record<
  string,
  {
    title: string;
    description: string;
    accentBar: string;
    iconSurface: string;
    titleClass: string;
    descriptionClass: string;
    itemIcon: string;
    itemHover: string;
    itemActive: string;
  }
> = {
  "RESEAUX SOCIAUX": {
    title: "RÉSEAUX SOCIAUX",
    description: "Publiez sur Instagram, Facebook et WhatsApp avec l'IA.",
    accentBar: "bg-blue-500",
    iconSurface: "bg-blue-50",
    titleClass: "text-blue-700",
    descriptionClass: "text-slate-500",
    itemIcon: "text-blue-600",
    itemHover: "hover:bg-slate-50 hover:text-slate-900",
    itemActive: "bg-blue-50 text-slate-950 ring-1 ring-blue-100",
  },
  EMAIL: {
    title: "EMAIL & AVIS",
    description: "Vos emails et vos avis Google, gérés avec l'IA.",
    accentBar: "bg-cyan-500",
    iconSurface: "bg-cyan-50",
    titleClass: "text-cyan-700",
    descriptionClass: "text-slate-500",
    itemIcon: "text-cyan-600",
    itemHover: "hover:bg-slate-50 hover:text-slate-900",
    itemActive: "bg-cyan-50 text-slate-950 ring-1 ring-cyan-100",
  },
  "AGENDA ET QUOTIDIEN": {
    title: "PUBLICATIONS AUTOMATIQUES",
    description: "Des automatisations spécialement conçues pour les {structure}.",
    accentBar: "bg-violet-500",
    iconSurface: "bg-violet-50",
    titleClass: "text-violet-700",
    descriptionClass: "text-slate-500",
    itemIcon: "text-violet-600",
    itemHover: "hover:bg-slate-50 hover:text-slate-900",
    itemActive: "bg-violet-50 text-slate-950 ring-1 ring-violet-100",
  },
  RESSOURCES: {
    title: "RESSOURCES & SERVICES",
    description: "Des outils pratiques spécialement conçus pour les {structure}.",
    accentBar: "bg-amber-500",
    iconSurface: "bg-amber-50",
    titleClass: "text-amber-700",
    descriptionClass: "text-slate-500",
    itemIcon: "text-amber-600",
    itemHover: "hover:bg-slate-50 hover:text-slate-900",
    itemActive: "bg-amber-50 text-slate-950 ring-1 ring-amber-100",
  },
  "RESSOURCES & SERVICES": {
    title: "RESSOURCES & SERVICES",
    description: "Des outils pratiques spécialement conçus pour les {structure}.",
    accentBar: "bg-amber-500",
    iconSurface: "bg-amber-50",
    titleClass: "text-amber-700",
    descriptionClass: "text-slate-500",
    itemIcon: "text-amber-600",
    itemHover: "hover:bg-slate-50 hover:text-slate-900",
    itemActive: "bg-amber-50 text-slate-950 ring-1 ring-amber-100",
  },
  "CAMPAGNE DE DONS": {
    title: "CAMPAGNES DE DONS",
    description: "Pilotez vos campagnes de collecte de A à Z.",
    accentBar: "bg-orange-500",
    iconSurface: "bg-orange-50",
    titleClass: "text-orange-600",
    descriptionClass: "text-slate-500",
    itemIcon: "text-orange-500",
    itemHover: "hover:bg-slate-50 hover:text-slate-900",
    itemActive: "bg-orange-50 text-slate-950 ring-1 ring-orange-200",
  },
  "CLIPS VIDEO": {
    title: "CLIPS VIDEO",
    description: "Clip récap AI",
    accentBar: "bg-rose-500",
    iconSurface: "bg-rose-50",
    titleClass: "text-rose-700",
    descriptionClass: "text-slate-500",
    itemIcon: "text-rose-600",
    itemHover: "hover:bg-slate-50 hover:text-slate-900",
    itemActive: "bg-rose-50 text-slate-950 ring-1 ring-rose-100",
  },
  PARAMETRES: {
    title: "PARAMÈTRES",
    description: "Paramètres et contacts",
    accentBar: "bg-emerald-500",
    iconSurface: "bg-emerald-50",
    titleClass: "text-emerald-700",
    descriptionClass: "text-slate-500",
    itemIcon: "text-emerald-600",
    itemHover: "hover:bg-slate-50 hover:text-slate-900",
    itemActive: "bg-emerald-50 text-slate-950 ring-1 ring-emerald-100",
  },
};

const ASSISTANT_ITEM = DASHBOARD_NAV_ITEMS.find((section) => section.section === "ASSISTANT IA")?.items[0] ?? null;
const AGENDA_TOP_ITEM = {
  href: "/dashboard/events",
  label: "Agenda connecté IA",
  icon: CalendarDays,
};
const AUTOMATIONS_ITEM = {
  href: "/dashboard/automations",
  label: "Cr\u00E9er des automatisations",
  icon: Zap,
};

function normalizeSectionKey(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function Sidebar({ community, userAvatar, userName, basePath = "/dashboard" }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const structureLabel = getStructureLabel(community.communityType);
  const [collapsed, setCollapsed] = useState(false);
  const [flyoutSection, setFlyoutSection] = useState<string | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  function resolveHref(href: string) {
    if (href.startsWith("http") || href.startsWith("mailto")) return href;
    return href.replace("/dashboard", basePath);
  }

  function isActive(href: string) {
    if (href.startsWith("http") || href.startsWith("mailto")) return false;
    const resolved = resolveHref(href.split("?")[0]);
    return pathname.startsWith(resolved) && resolved !== basePath;
  }

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(DASHBOARD_DESKTOP_CATEGORIES.map((category) => [category.section, false]))
  );

  return (
    <aside
      className={cn(
        "hidden h-full flex-shrink-0 flex-col border-r border-slate-200 bg-slate-50 text-slate-700 transition-all duration-300 md:flex",
        collapsed ? "w-20" : "w-80"
      )}
    >
      <div className="flex min-h-[74px] items-center gap-3 border-b border-slate-200 bg-white px-4 py-4">
        <button
          type="button"
          onClick={() => {
            if (collapsed) {
              setCollapsed(false);
              return;
            }
            router.push(resolveHref("/dashboard/assistant"));
          }}
          className={cn(
            "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-600 shadow-sm ring-1 ring-blue-100 transition-all",
            collapsed && "cursor-pointer hover:scale-[1.03] hover:ring-blue-200"
          )}
          aria-label={collapsed ? "Elargir la barre laterale" : "Ouvrir Assistant IA"}
          title={collapsed ? "Elargir la barre laterale" : "Ouvrir Assistant IA"}
        >
          {community.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={community.logoUrl} alt={community.name} className="h-full w-full rounded-2xl object-cover" />
          ) : (
            <span className="text-sm font-bold text-white">{community.name.substring(0, 2).toUpperCase()}</span>
          )}
        </button>

        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight text-slate-900">{community.name}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className={cn("h-1.5 w-1.5 rounded-full", PLAN_COLORS[community.plan] ?? "bg-slate-400")} />
              <span className="text-xs text-slate-500">{PLAN_LABELS[community.plan] ?? community.plan}</span>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto flex-shrink-0 text-slate-400 transition-colors hover:text-slate-700"
          aria-label={collapsed ? "Elargir la navigation" : "Reduire la navigation"}
        >
          <ChevronDown className={cn("size-4 transition-transform", collapsed ? "-rotate-90" : "rotate-90")} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <div className="space-y-2">
          {ASSISTANT_ITEM && (
            <Link
              href={resolveHref(ASSISTANT_ITEM.href)}
              className={cn(
                "flex items-center rounded-[1.3rem] bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-500 px-4 py-3 text-white shadow-[0_16px_30px_rgba(14,116,210,0.28)] ring-1 ring-sky-200/60 transition-all duration-200",
                isActive(ASSISTANT_ITEM.href) ? "brightness-[0.98]" : "hover:brightness-[1.03]",
                collapsed && "justify-center rounded-[1.4rem] border border-sky-300/40 bg-gradient-to-b from-blue-600 to-cyan-500 px-0 py-3"
              )}
              title={collapsed ? ASSISTANT_ITEM.label : undefined}
            >
              {!collapsed && (
                <div className="flex min-w-0 items-center gap-2">
                  {ASSISTANT_ITEM.icon && <ASSISTANT_ITEM.icon className="size-4 shrink-0 text-cyan-50" />}
                  <p className="truncate text-[15px] font-semibold tracking-tight text-white">
                    Assistant IA
                  </p>
                  <p className="sr-only">
                    Assistant IA
                  </p>
                </div>
              )}
              {collapsed && (
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
                  <Bot className="size-4 text-cyan-50" />
                </span>
              )}
            </Link>
          )}

          <Link
            href={resolveHref(AGENDA_TOP_ITEM.href)}
            className={cn(
              "flex items-center rounded-[1.3rem] bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-700 px-4 py-3 text-white shadow-[0_16px_30px_rgba(109,40,217,0.28)] ring-1 ring-violet-200/60 transition-all duration-200",
              isActive(AGENDA_TOP_ITEM.href) ? "brightness-[0.98]" : "hover:brightness-[1.03]",
              collapsed && "justify-center rounded-[1.4rem] border border-violet-300/40 bg-gradient-to-b from-violet-700 to-indigo-700 px-0 py-3"
            )}
            title={collapsed ? AGENDA_TOP_ITEM.label : undefined}
          >
            {!collapsed && (
              <div className="flex min-w-0 items-center gap-2">
                <CalendarDays className="size-4 shrink-0 text-violet-50" />
                <p className="truncate text-[15px] font-semibold tracking-tight text-white">
                  Agenda connecté IA
                </p>
              </div>
            )}
            {collapsed && (
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
                <CalendarDays className="size-4 text-violet-50" />
              </span>
            )}
          </Link>

          <div className={cn("pt-1 pb-3", collapsed && "pt-1 pb-2")}>
            <Link
              href={resolveHref(DASHBOARD_TOP_ITEM.href)}
              className={cn(
                "flex items-center rounded-[1.3rem] bg-gradient-to-r from-rose-600 via-pink-600 to-fuchsia-600 px-4 py-3 text-white shadow-[0_16px_30px_rgba(225,29,72,0.22)] ring-1 ring-rose-200/60 transition-all duration-200",
                isActive(DASHBOARD_TOP_ITEM.href) ? "brightness-[0.98]" : "hover:brightness-[1.03]",
                collapsed && "justify-center rounded-[1.4rem] border border-rose-300/40 bg-gradient-to-b from-rose-600 to-fuchsia-600 px-0 py-3"
              )}
              title={collapsed ? DASHBOARD_TOP_ITEM.label : undefined}
            >
              {!collapsed && (
                <div className="flex min-w-0 items-center gap-2">
                  {DASHBOARD_TOP_ITEM.icon && <DASHBOARD_TOP_ITEM.icon className="size-4 shrink-0 text-rose-50" />}
                  <p className="truncate text-[15px] font-semibold tracking-tight text-white">
                    {DASHBOARD_TOP_ITEM.label}
                  </p>
                  <p className="sr-only">
                    {DASHBOARD_TOP_ITEM.label}
                  </p>
                </div>
              )}
              {collapsed && (
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
                  <Bell className="size-4 text-rose-50" />
                </span>
              )}
            </Link>
          </div>

          <div className="space-y-3 pt-3">
            {DASHBOARD_DESKTOP_CATEGORIES.map((category) => {
              const style =
                DESKTOP_CATEGORY_CONTENT[normalizeSectionKey(category.section)] ?? DESKTOP_CATEGORY_CONTENT.RESSOURCES;
              const isOpen = openSections[category.section];

              return (
                <div
                  key={category.section}
                  className={cn(
                    "rounded-[1.6rem] border border-slate-200 bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition duration-200 hover:border-slate-300 hover:shadow-[0_18px_40px_rgba(15,23,42,0.09)]",
                    collapsed && "border-0 bg-transparent p-0 shadow-none hover:border-0 hover:shadow-none"
                  )}
                >
                  <button
                    type="button"
                    onClick={() =>
                      collapsed
                        ? setFlyoutSection(category.section)
                        : setOpenSections((current) => ({
                            ...current,
                            [category.section]: !current[category.section],
                          }))
                    }
                    className={cn(
                      "flex w-full items-start gap-3 rounded-[1.15rem] px-1 py-1 text-left transition-all duration-200",
                      collapsed && "justify-center rounded-xl px-0 py-2 hover:bg-slate-100"
                    )}
                    aria-expanded={isOpen}
                    title={collapsed ? style.title : undefined}
                  >
                    <span className={cn(
                      "flex flex-shrink-0 items-center justify-center",
                      collapsed ? "mt-0 h-10 w-10" : cn("mt-4 h-10 w-10 rounded-full", style.iconSurface)
                    )}>
                      <category.icon className={cn("size-[18px]", style.itemIcon)} />
                    </span>

                    {!collapsed && (
                      <>
                        <div className="min-w-0 flex-1">
                          <div className={cn("mb-3 h-1 w-10 rounded-full", style.accentBar)} />
                          <p className={cn("text-[15px] font-black tracking-tight", style.titleClass)}>{style.title}</p>
                          <p className={cn("mt-1.5 text-xs leading-5", style.descriptionClass)}>{style.description.replace("{structure}", structureLabel)}</p>
                        </div>
                        <ChevronDown
                          className={cn(
                            "mt-4 size-4 flex-shrink-0 text-slate-400 transition-transform duration-300",
                            isOpen && "rotate-180"
                          )}
                        />
                      </>
                    )}
                  </button>

                  {!collapsed && (
                    <div
                      className={cn(
                        "grid transition-all duration-300 ease-out",
                        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      )}
                    >
                      <div className="overflow-hidden">
                        <div className="mt-3 space-y-1.5 rounded-[1.2rem] bg-slate-50/80 p-2">
                          {category.section === "AGENDA ET QUOTIDIEN" && (
                            <Link
                              href={resolveHref(AUTOMATIONS_ITEM.href)}
                              className={cn(
                                "flex min-w-0 items-center gap-2 rounded-[1.15rem] bg-gradient-to-r from-violet-700 via-violet-600 to-indigo-600 px-3 py-2.5 text-white shadow-[0_14px_26px_rgba(124,58,237,0.28)] ring-1 ring-violet-300/60 transition-all duration-200 hover:opacity-90",
                                isActive(AUTOMATIONS_ITEM.href) && "opacity-90"
                              )}
                            >
                              <Zap className="size-4 shrink-0 text-cyan-50" />
                              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight">
                                Toutes les automatisations
                              </span>
                            </Link>
                          )}
                          {category.items
                            .filter((item) => !(category.section === "RESEAUX SOCIAUX" && item.href === "/dashboard/automations"))
                            .map((item) => {
                            const active = isActive(item.href);
                            const isExternal = item.external || item.href.startsWith("mailto");
                            const resolvedHref = resolveHref(item.href);

                            return (
                              <div key={`${category.section}-${item.href}`} className="flex items-center gap-1.5">
                                <Link
                                  href={resolvedHref}
                                  target={isExternal ? "_blank" : undefined}
                                  rel={isExternal ? "noopener noreferrer" : undefined}
                                  className={cn(
                                    "flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all duration-200",
                                    item.href === "/dashboard/settings?section=contacts" && !active
                                      ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100 hover:bg-emerald-100"
                                      : active
                                        ? style.itemActive
                                        : cn("text-slate-700", style.itemHover)
                                  )}
                                >
                                  {item.icon && (
                                    <item.icon
                                      className={cn(
                                        "size-4 flex-shrink-0",
                                        item.href === "/dashboard/settings?section=contacts" && !active
                                          ? "text-emerald-600"
                                          : active
                                            ? "text-current"
                                            : style.itemIcon
                                      )}
                                    />
                                  )}
                                  <span className="flex min-w-0 flex-1 flex-col">
                                    <span className="truncate font-medium">{item.label}</span>
                                    {item.description && (
                                      <span
                                        className={cn(
                                          "mt-0.5 truncate text-[11px] leading-4",
                                          active ? "text-current/70" : "text-slate-500"
                                        )}
                                      >
                                        {item.description}
                                      </span>
                                    )}
                                  </span>
                                  {item.badge && (
                                    <span className="flex-shrink-0 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                      {item.badge}
                                    </span>
                                  )}
                                  {/* Badge dynamique GMB — mis à jour par GmbNotificationBadge */}
                                  {item.href === "/dashboard/google-reviews" && (
                                    <span
                                      data-gmb-badge
                                      style={{ display: "none" }}
                                      className="flex-shrink-0 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white"
                                    />
                                  )}
                                </Link>

                                {item.action && (
                                  <Link
                                    href={resolveHref(item.action.href)}
                                    className="flex-shrink-0 rounded-xl px-2 py-1 text-[10px] font-semibold text-slate-500 transition-colors hover:bg-white hover:text-slate-800"
                                    title={item.action.label}
                                  >
                                    {item.action.label}
                                  </Link>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="relative border-t border-slate-200 bg-white p-4">
        <button
          type="button"
          onClick={() => setAccountMenuOpen((v) => !v)}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-1 py-1 text-left transition hover:bg-slate-50",
            collapsed && "justify-center"
          )}
          aria-label="Menu du compte"
        >
          <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-slate-200">
            {userAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={userAvatar} alt={userName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-600">
                {userName.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{userName}</p>
                <p className="truncate text-xs text-slate-500">{community?.name ?? "Administrateur"}</p>
              </div>
              <ChevronDown className={cn("size-4 shrink-0 text-slate-400 transition", accountMenuOpen && "rotate-180")} />
            </>
          )}
        </button>

        {accountMenuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setAccountMenuOpen(false)} />
            <div className="absolute bottom-full left-3 z-50 mb-2 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="truncate text-sm font-semibold text-slate-800">{userName}</p>
                <p className="mt-0.5 truncate text-xs text-slate-400">{community?.name}</p>
              </div>
              <Link
                href={resolveHref("/dashboard/settings?section=profile")}
                onClick={() => setAccountMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                <User className="size-4" />
                Mon profil
              </Link>
              <Link
                href={resolveHref("/dashboard/settings")}
                onClick={() => setAccountMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                <Settings className="size-4" />
                Paramètres
              </Link>
              <div className="mt-1 border-t border-slate-100 pt-1">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="size-4" />
                  Se déconnecter
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Panneau des suggestions (sidebar réduit) */}
      {collapsed && flyoutSection && (() => {
        const cat = DASHBOARD_DESKTOP_CATEGORIES.find((c) => c.section === flyoutSection);
        if (!cat) return null;
        const style = DESKTOP_CATEGORY_CONTENT[normalizeSectionKey(cat.section)] ?? DESKTOP_CATEGORY_CONTENT.RESSOURCES;
        return (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
            onClick={() => setFlyoutSection(null)}
          >
            <div
              className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-base font-semibold tracking-tight text-slate-900">{style.title}</p>
                <button
                  type="button"
                  onClick={() => setFlyoutSection(null)}
                  className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Fermer"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {cat.section === "AGENDA ET QUOTIDIEN" && (
                  <Link
                    href={resolveHref(AUTOMATIONS_ITEM.href)}
                    onClick={() => setFlyoutSection(null)}
                    className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-violet-700 via-violet-600 to-indigo-600 p-3 text-white transition hover:opacity-90 sm:col-span-2"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                      <Zap className="size-[18px]" />
                    </span>
                    <span className="text-sm font-semibold">Toutes les automatisations</span>
                  </Link>
                )}
                {cat.items
                  .filter((item) => !(cat.section === "RESEAUX SOCIAUX" && item.href === "/dashboard/automations"))
                  .map((item) => {
                    const isExternal = item.external || item.href.startsWith("mailto");
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={resolveHref(item.href)}
                        target={isExternal ? "_blank" : undefined}
                        rel={isExternal ? "noopener noreferrer" : undefined}
                        onClick={() => setFlyoutSection(null)}
                        className={cn(
                          "flex items-center gap-3 rounded-2xl border p-3 transition",
                          active
                            ? "border-slate-300 bg-slate-50"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        )}
                      >
                        {item.icon && (
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                            <item.icon className={cn("size-[18px]", style.itemIcon)} />
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-slate-900">{item.label}</span>
                          {item.description && (
                            <span className="block truncate text-xs text-slate-500">{item.description}</span>
                          )}
                        </span>
                      </Link>
                    );
                  })}
              </div>
            </div>
          </div>
        );
      })()}
    </aside>
  );
}
