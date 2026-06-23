"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, Bot, CalendarDays, ChevronDown, LogOut, Menu, Search, Settings, User, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { DASHBOARD_DESKTOP_CATEGORIES } from "./dashboard-nav";

interface TopBarProps {
  communityName: string;
  userAvatar: string | null | undefined;
  userName: string;
  unreadNotifications: number;
}

const MOBILE_CATEGORY_CONTENT: Record<
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
    description: "Connecter & automatiser vos réseaux",
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
    description: "Gérer vos emails, WhatsApp et avis",
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
    description: "Votre quotidien bien organisé",
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
    description: "Notes, Banque visuelle...",
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
    description: "Notes, Banque visuelle...",
    accentBar: "bg-amber-500",
    iconSurface: "bg-amber-50",
    titleClass: "text-amber-700",
    descriptionClass: "text-slate-500",
    itemIcon: "text-amber-600",
    itemHover: "hover:bg-slate-50 hover:text-slate-900",
    itemActive: "bg-amber-50 text-slate-950 ring-1 ring-amber-100",
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

function normalizeSectionKey(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function TopBar({ communityName, userAvatar, userName, unreadNotifications }: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileOpenSections, setMobileOpenSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(DASHBOARD_DESKTOP_CATEGORIES.map((category) => [category.section, false]))
  );

  function getPageTitle() {
    if (pathname.startsWith("/dashboard/assistant")) return "";
    if (pathname.startsWith("/dashboard/automations")) return "Automatisations";
    if (pathname.startsWith("/dashboard/notifications")) return "Notifications";
    if (pathname.startsWith("/dashboard/whatsapp")) return "WhatsApp";
    if (pathname.startsWith("/dashboard/facebook")) return "Facebook";
    if (pathname.startsWith("/dashboard/instagram")) return "Instagram";
    if (pathname.startsWith("/dashboard/email")) return "Email";
    if (pathname.startsWith("/dashboard/google-reviews")) return "Avis Google";
    if (pathname.startsWith("/dashboard/daily-assistant")) return "Assistant du quotidien";
    if (pathname.startsWith("/dashboard/events")) return "Agenda connect\u00e9 IA";
    if (pathname.startsWith("/dashboard/clip-recap")) return "Clip récap AI";
    if (pathname.startsWith("/dashboard/resources")) return "Mes ressources";
    if (pathname.startsWith("/dashboard/boutique")) return "Boutique";
    if (pathname.startsWith("/dashboard/referencement")) return "Referencement";
    if (pathname.startsWith("/dashboard/shabbat-times-auto")) return "Horaire de Chabbat";
    if (pathname.startsWith("/dashboard/templates")) return "Affiches";
    if (pathname.startsWith("/dashboard/settings")) return "Parametres";
    return "Accueil";
  }

  const SEARCH_TARGETS = [
    { label: "Assistant IA", href: "/dashboard/assistant", keywords: ["assistant", "ia", "chat"] },
    { label: "Agenda connect\u00e9 IA", href: "/dashboard/events", keywords: ["agenda", "quotidien", "cours", "rappel"] },
    { label: "Assistant du quotidien", href: "/dashboard/daily-assistant", keywords: ["assistant", "quotidien", "rappel", "projet"] },
    { label: "Cr\u00E9er des automatisations", href: "/dashboard/automations", keywords: ["automatisation", "j-10", "j-5", "j-1"] },
    { label: "Affiches", href: "/dashboard/templates", keywords: ["affiche", "visuel", "template"] },
    { label: "Horaire de Chabbat auto", href: "/dashboard/shabbat-times-auto", keywords: ["chabbat", "shabbat", "horaire", "affiche"] },
    { label: "Boutique", href: "/dashboard/boutique", keywords: ["boutique", "judaica", "rabbi", "shlihout"] },
    { label: "Referencement Google et IA", href: "/dashboard/referencement", keywords: ["referencement", "google", "seo", "ia"] },
    { label: "Publications", href: "/dashboard/publications", keywords: ["publication", "historique"] },
    { label: "Parametres", href: "/dashboard/settings", keywords: ["parametre", "reglage", "contact", "faq"] },
  ];

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function getMenuSectionTitle(section: string) {
    const map: Record<string, string> = {
      "RESEAUX SOCIAUX": "Réseaux sociaux",
      "AGENDA ET QUOTIDIEN": "Publications automatiques",
      EMAIL: "Email et avis",
      "CLIPS VIDEO": "Clips vidéo",
      RESSOURCES: "Ressources & Services",
      "RESSOURCES & SERVICES": "Ressources & Services",
      PARAMETRES: "Paramètres",
    };
    return map[section] ?? section;
  }

  function submitSearch() {
    const q = searchValue.trim().toLowerCase();
    if (!q) return;
    const target = SEARCH_TARGETS.find(
      (item) => item.label.toLowerCase().includes(q) || item.keywords.some((keyword) => keyword.includes(q)),
    );
    router.push(target?.href ?? `/dashboard/events?q=${encodeURIComponent(searchValue.trim())}`);
    setSearchOpen(false);
    setSearchValue("");
  }

  return (
    <>
      <header className={cn(
        "z-10 flex h-16 flex-shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:px-6",
        // Sur la page assistant, l'en-tête du chat fait office de barre sur desktop.
        pathname.startsWith("/dashboard/assistant") && "md:hidden"
      )}>
        <div className="md:hidden">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            aria-label="Ouvrir la navigation"
          >
            <Menu className="size-5" />
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">
              {getPageTitle()}
            </p>
          </div>

          <div className="hidden">
            {searchOpen ? (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  type="text"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Rechercher evenements, contenus, affiches, articles..."
                  onBlur={() => setSearchOpen(false)}
                  onKeyDown={(event) => event.key === "Enter" && submitSearch()}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="flex min-w-0 items-center gap-2 text-slate-400 transition-colors hover:text-slate-600"
              >
                <Search className="size-4" />
                <span className="hidden text-sm sm:block">Rechercher...</span>
                <span className="truncate text-sm sm:hidden">{communityName}</span>
              </button>
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Link
            href="/dashboard/notifications"
            className="hidden relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <Bell className="size-5" />
            {unreadNotifications > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />}
          </Link>

          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-slate-100 sm:px-3"
            >
              <div className="h-7 w-7 flex-shrink-0 overflow-hidden rounded-full bg-slate-200">
                {userAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={userAvatar} alt={userName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-600">
                    {userName.substring(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <ChevronDown className="size-3.5 text-slate-400" />
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-800">{userName}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{communityName}</p>
                  </div>
                  <Link
                    href="/dashboard/settings?section=profile"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <User className="size-4" />
                    Mon profil
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Settings className="size-4" />
                    Parametres
                  </Link>
                  <div className="mt-1 border-t border-slate-100 pt-1">
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="size-4" />
                      Se deconnecter
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {mobileNavOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-950/45 md:hidden" onClick={() => setMobileNavOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-[88vw] max-w-sm bg-slate-50 text-slate-700 shadow-2xl md:hidden">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{communityName}</p>
                  <p className="text-xs text-slate-500">Navigation</p>
                </div>
                <button
                  onClick={() => setMobileNavOpen(false)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100"
                  aria-label="Fermer la navigation"
                >
                  <X className="size-5" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto bg-slate-50 px-3 py-4">
                <div className="space-y-3">
                  <Link
                    href="/dashboard/assistant"
                    onClick={() => setMobileNavOpen(false)}
                    className={cn(
                      "flex min-h-11 items-center gap-2 rounded-[1.3rem] bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-500 px-4 py-3 text-white shadow-[0_16px_30px_rgba(14,116,210,0.28)] ring-1 ring-sky-200/60 transition-all duration-200",
                      isActive("/dashboard/assistant") ? "brightness-[0.98]" : "hover:brightness-[1.03]",
                    )}
                  >
                    <Bot className="size-4 shrink-0 text-cyan-50" />
                    <p className="truncate text-[15px] font-semibold tracking-tight text-white">Assistant IA</p>
                  </Link>

                  <Link
                    href="/dashboard/events"
                    onClick={() => setMobileNavOpen(false)}
                    className={cn(
                      "flex min-h-11 items-center gap-2 rounded-[1.3rem] bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-700 px-4 py-3 text-white shadow-[0_16px_30px_rgba(109,40,217,0.28)] ring-1 ring-violet-200/60 transition-all duration-200",
                      isActive("/dashboard/events") ? "brightness-[0.98]" : "hover:brightness-[1.03]",
                    )}
                  >
                    <CalendarDays className="size-4 shrink-0 text-violet-50" />
                    <p className="truncate text-[15px] font-semibold tracking-tight text-white">Agenda connecté IA</p>
                  </Link>

                  <Link
                    href="/dashboard/notifications"
                    onClick={() => setMobileNavOpen(false)}
                    className={cn(
                      "flex min-h-11 items-center gap-2 rounded-[1.3rem] bg-gradient-to-r from-rose-600 via-pink-600 to-fuchsia-600 px-4 py-3 text-white shadow-[0_16px_30px_rgba(225,29,72,0.22)] ring-1 ring-rose-200/60 transition-all duration-200",
                      isActive("/dashboard/notifications") ? "brightness-[0.98]" : "hover:brightness-[1.03]",
                    )}
                  >
                    <Bell className="size-4 shrink-0 text-rose-50" />
                    <p className="truncate text-[15px] font-semibold tracking-tight text-white">Notifications</p>
                  </Link>

                  {DASHBOARD_DESKTOP_CATEGORIES.map((category) => {
                    const style =
                      MOBILE_CATEGORY_CONTENT[normalizeSectionKey(category.section)] ?? MOBILE_CATEGORY_CONTENT.RESSOURCES;
                    const isOpen = mobileOpenSections[category.section];

                    return (
                      <div
                        key={category.section}
                        className="rounded-[1.6rem] border border-slate-200 bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition duration-200"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setMobileOpenSections((current) => ({
                              ...current,
                              [category.section]: !current[category.section],
                            }))
                          }
                          className="flex w-full items-start gap-3 rounded-[1.15rem] px-1 py-1 text-left transition-all duration-200"
                          aria-label={getMenuSectionTitle(category.section)}
                          aria-expanded={isOpen}
                        >
                          <span className={cn("mt-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full", style.iconSurface)}>
                            <category.icon className={cn("size-[18px]", style.itemIcon)} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className={cn("mb-3 h-1 w-10 rounded-full", style.accentBar)} />
                            <p className={cn("text-[15px] font-black tracking-tight", style.titleClass)}>{style.title}</p>
                            <p className={cn("mt-1.5 text-xs leading-5", style.descriptionClass)}>{style.description}</p>
                          </div>
                          <ChevronDown
                            className={cn(
                              "mt-4 size-4 shrink-0 text-slate-400 transition-transform duration-300",
                              isOpen && "rotate-180"
                            )}
                          />
                        </button>

                        <div
                          className={cn(
                            "grid transition-all duration-300 ease-out",
                            isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                          )}
                        >
                          <div className="overflow-hidden">
                            <div className="mt-3 space-y-1.5 rounded-[1.2rem] bg-slate-50/80 p-2">
                              {category.section === "RESEAUX SOCIAUX" && (
                                <Link
                                  href="/dashboard/automations"
                                  onClick={() => setMobileNavOpen(false)}
                                  className={cn(
                                    "flex min-w-0 items-center gap-2 rounded-[1.15rem] bg-blue-600 px-3 py-2.5 text-white shadow-[0_14px_26px_rgba(37,99,235,0.24)] ring-1 ring-blue-200/70 transition-all duration-200 hover:bg-blue-700",
                                    isActive("/dashboard/automations") && "bg-blue-700"
                                  )}
                                >
                                  <Zap className="size-4 shrink-0 text-cyan-50" />
                                  <span className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight">
                                    Créer des automatisations
                                  </span>
                                </Link>
                              )}
                              {category.items
                                .filter((item) => !(category.section === "RESEAUX SOCIAUX" && item.href === "/dashboard/automations"))
                                .map((item) => {
                                  const active = isActive(item.href);
                                  const isExternal = item.external || item.href.startsWith("mailto");

                                  return (
                                    <div key={`${category.section}-${item.href}`} className="flex items-center gap-1.5">
                                      <Link
                                        href={item.href}
                                        target={isExternal ? "_blank" : undefined}
                                        rel={isExternal ? "noopener noreferrer" : undefined}
                                        onClick={() => setMobileNavOpen(false)}
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
                                              "size-4 shrink-0",
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
                                          <span className="shrink-0 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                            {item.badge}
                                          </span>
                                        )}
                                        {item.href === "/dashboard/google-reviews" && (
                                          <span
                                            data-gmb-badge
                                            style={{ display: "none" }}
                                            className="shrink-0 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white"
                                          />
                                        )}
                                      </Link>

                                      {item.action && (
                                        <Link
                                          href={item.action.href}
                                          onClick={() => setMobileNavOpen(false)}
                                          className="shrink-0 rounded-xl px-2 py-1 text-[10px] font-semibold text-slate-500 transition-colors hover:bg-white hover:text-slate-800"
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
                      </div>
                    );
                  })}
                </div>
              </nav>
            </div>
          </div>
        </>
      )}
    </>
  );
}
