"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, ChevronDown, LogOut, Menu, Settings, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getOfficialDashboardMenuSections,
  OFFICIAL_MENU_SECTION_STYLES,
  QUICK_ACCESS_ITEMS,
  type OfficialDashboardMenuSection,
} from "./dashboard-nav";

interface TopBarProps {
  communityName: string;
  communityType?: string | null;
  userAvatar: string | null | undefined;
  userName: string;
  unreadNotifications: number;
}

export function TopBar({ communityName, communityType, userAvatar, userName, unreadNotifications }: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const menuSections = getOfficialDashboardMenuSections(communityType);
  const [mobileOpenSections, setMobileOpenSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(menuSections.map((section) => [section.section, false]))
  );

  useEffect(() => {
    function handleOpenMainMenu() {
      if (window.innerWidth < 768) {
        setMobileNavOpen(true);
      }
    }

    window.addEventListener("dashboard:open-main-menu", handleOpenMainMenu as EventListener);
    return () => window.removeEventListener("dashboard:open-main-menu", handleOpenMainMenu as EventListener);
  }, []);

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
    if (pathname.startsWith("/dashboard/events")) return "Agenda connecte IA";
    if (pathname.startsWith("/dashboard/clip-recap")) return "Clip video";
    if (pathname.startsWith("/dashboard/resources")) return "Mes ressources";
    if (pathname.startsWith("/dashboard/boutique")) return "Boutique";
    if (pathname.startsWith("/dashboard/referencement")) return "Referencement";
    if (pathname.startsWith("/dashboard/shabbat-times-auto")) return "Horaire de Chabbat";
    if (pathname.startsWith("/dashboard/templates")) return "Affiches";
    if (pathname.startsWith("/dashboard/settings")) return "Parametres";
    return "Accueil";
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  function isActive(href: string) {
    if (href.startsWith("http") || href.startsWith("mailto")) return false;
    const pathOnly = href.split("?")[0];
    return pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
  }

  function renderSectionItems(section: OfficialDashboardMenuSection) {
    const style = OFFICIAL_MENU_SECTION_STYLES[section.key] ?? OFFICIAL_MENU_SECTION_STYLES.resources;

    return section.items.map((item) => {
      const active = !item.disabled && isActive(item.href);
      const isExternal = item.external || item.href.startsWith("mailto");
      const itemClass = item.disabled
        ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 opacity-80"
        : active
          ? style.itemActive
          : cn("text-slate-700", style.itemHover);

      const content = (
        <>
          {item.icon && (
            <item.icon
              className={cn("size-4 shrink-0", item.disabled ? "text-slate-400" : active ? "text-current" : style.itemIcon)}
            />
          )}
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium">{item.label}</span>
          </span>
          {item.badge && (
            <span
              className={cn(
                "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                item.disabled ? "bg-slate-200 text-slate-600" : "bg-amber-500 text-white"
              )}
            >
              {item.badge}
            </span>
          )}
          {item.href === "/dashboard/google-reviews" && !item.disabled && (
            <span
              data-gmb-badge
              style={{ display: "none" }}
              className="shrink-0 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white"
            />
          )}
        </>
      );

      if (item.disabled) {
        return (
          <div
            key={`${section.section}-${item.href}`}
            className={cn("flex min-w-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all duration-200", itemClass)}
          >
            {content}
          </div>
        );
      }

      return (
        <Link
          key={`${section.section}-${item.href}`}
          href={item.href}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          onClick={() => setMobileNavOpen(false)}
          className={cn("flex min-w-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all duration-200", itemClass)}
        >
          {content}
        </Link>
      );
    });
  }

  function renderQuickAccessItems() {
    return QUICK_ACCESS_ITEMS.map((item) => {
      const active = isActive(item.href);
      const Icon = item.icon;

      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setMobileNavOpen(false)}
          className={cn(
            "relative flex min-w-0 items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-all duration-200",
            active
              ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
              : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"
          )}
        >
          {Icon && <Icon className={cn("size-4 shrink-0", active ? "text-white" : "text-blue-600")} />}
          <span className="min-w-0 flex-1 truncate font-semibold">{item.label}</span>
          {"notification" in item && item.notification && unreadNotifications > 0 && (
            <span
              className={cn(
                "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                active ? "bg-white text-blue-700" : "bg-rose-500 text-white"
              )}
            >
              {unreadNotifications > 99 ? "99+" : unreadNotifications}
            </span>
          )}
        </Link>
      );
    });
  }

  return (
    <>
      <header
        className={cn(
          "z-10 flex h-16 flex-shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:px-6",
          pathname.startsWith("/dashboard/assistant") && "md:hidden"
        )}
      >
        <div className="md:hidden">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            aria-label="Ouvrir la navigation"
          >
            <Menu className="size-5" />
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">{getPageTitle()}</p>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Link
            href="/dashboard/notifications"
            className="relative hidden rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <Bell className="size-5" />
            {unreadNotifications > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />}
          </Link>

          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((value) => !value)}
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
                <div className="mb-4 rounded-[1.35rem] border border-slate-200 bg-white p-2 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                  <div className="space-y-1">
                    {renderQuickAccessItems()}
                  </div>
                </div>

                <div className="space-y-3">
                  {menuSections.map((section) => {
                    const style = OFFICIAL_MENU_SECTION_STYLES[section.key] ?? OFFICIAL_MENU_SECTION_STYLES.resources;
                    const isOpen = mobileOpenSections[section.section];

                    return (
                      <div
                        key={section.section}
                        className="rounded-[1.6rem] border border-slate-200 bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition duration-200"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setMobileOpenSections((current) => ({
                              ...current,
                              [section.section]: !current[section.section],
                            }))
                          }
                          className="flex w-full items-start gap-3 rounded-[1.15rem] px-1 py-1 text-left transition-all duration-200"
                          aria-expanded={isOpen}
                        >
                          <span className={cn("mt-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full", style.iconSurface)}>
                            <section.icon className={cn("size-[18px]", style.itemIcon)} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className={cn("mb-3 h-1 w-10 rounded-full", style.accentBar)} />
                            <p className={cn("text-[15px] font-black tracking-tight", style.titleClass)}>{section.section}</p>
                            <p className={cn("mt-1.5 text-xs leading-5", style.descriptionClass)}>{section.subtitle}</p>
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
                              {renderSectionItems(section)}
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
