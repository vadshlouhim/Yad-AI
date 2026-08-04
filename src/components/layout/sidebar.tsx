"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, LogOut, Settings, User, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { AGENT_IMAGE_URLS } from "@/lib/agents";
import {
  getOfficialDashboardMenuSections,
  OFFICIAL_MENU_SECTION_STYLES,
  QUICK_ACCESS_ITEMS,
  type OfficialDashboardMenuSection,
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
  unreadNotifications?: number;
  basePath?: string;
}

const PLAN_COLORS: Record<string, string> = {
  FREE_TRIAL: "bg-amber-500",
  STARTER: "bg-blue-500",
  PROFESSIONAL: "bg-blue-500",
  ENTERPRISE: "bg-violet-500",
};

const PLAN_LABELS: Record<string, string> = {
  FREE_TRIAL: "Gratuit",
  STARTER: "Pro",
  PROFESSIONAL: "Pro",
  ENTERPRISE: "Business",
};

const SOCIAL_AGENT_IMAGES = [
  {
    src: AGENT_IMAGE_URLS.dovBer,
    className: "left-0 -top-2 h-[4.7rem] w-[3.35rem] -rotate-6",
  },
  {
    src: AGENT_IMAGE_URLS.mendy,
    className: "left-1/2 -top-3 h-20 w-16 -translate-x-1/2 z-10",
  },
  {
    src: AGENT_IMAGE_URLS.israel,
    className: "right-0 -top-2 h-[4.7rem] w-[3.35rem] rotate-6",
  },
];

const DAVID_AUTOMATION_IMAGE_URL = AGENT_IMAGE_URLS.david;
const LEVIK_EMAIL_IMAGE_URL = AGENT_IMAGE_URLS.levik;
const SHMOUEL_TORAH_IMAGE_URL = AGENT_IMAGE_URLS.shmouel;
const AVI_DONATION_IMAGE_URL = AGENT_IMAGE_URLS.avi;
const ZALMAN_VISUALS_IMAGE_URL = AGENT_IMAGE_URLS.zalman;
const TSEMAH_NEWSLETTER_IMAGE_URL = AGENT_IMAGE_URLS.tsemah;

function SocialAgentBubble() {
  return (
    <span className="relative flex h-16 w-[4.9rem] shrink-0 items-center justify-center self-center overflow-visible">
      {SOCIAL_AGENT_IMAGES.map((agent) => (
        <img
          key={agent.src}
          src={agent.src}
          alt=""
          aria-hidden="true"
          className={cn(
            "absolute object-contain object-top drop-shadow-[0_10px_14px_rgba(15,23,42,0.18)]",
            agent.className
          )}
        />
      ))}
    </span>
  );
}

function AutomationAgentBubble() {
  return <SingleAgentBubble src={DAVID_AUTOMATION_IMAGE_URL} />;
}

function SingleAgentBubble({ src }: { src: string }) {
  return (
    <span className="relative flex h-16 w-[4.9rem] shrink-0 items-center justify-center self-center overflow-visible">
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="absolute -top-3 h-20 w-16 object-contain object-top drop-shadow-[0_10px_14px_rgba(15,23,42,0.18)]"
      />
    </span>
  );
}

function AviAgentBubble() {
  return (
    <span className="relative flex h-16 w-[5.4rem] shrink-0 items-center justify-center self-center overflow-visible">
      <img
        src={AVI_DONATION_IMAGE_URL}
        alt=""
        aria-hidden="true"
        className="absolute -top-4 h-[6.1rem] w-[4.9rem] object-contain object-top drop-shadow-[0_12px_16px_rgba(15,23,42,0.2)]"
      />
    </span>
  );
}

export function Sidebar({ community, userAvatar, userName, unreadNotifications = 0, basePath = "/dashboard" }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [flyoutSection, setFlyoutSection] = useState<string | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const menuSections = getOfficialDashboardMenuSections(community.communityType);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(menuSections.map((section) => [section.section, true]))
  );

  useEffect(() => {
    function handleOpenMainMenu() {
      if (window.innerWidth >= 768) {
        setCollapsed(false);
      }
    }

    window.addEventListener("dashboard:open-main-menu", handleOpenMainMenu as EventListener);
    return () => window.removeEventListener("dashboard:open-main-menu", handleOpenMainMenu as EventListener);
  }, []);

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
    if (resolved === resolveHref("/dashboard/boutique")) return pathname === resolved;
    return pathname.startsWith(resolved) && resolved !== basePath;
  }

  function shouldHideSectionAccent(section: OfficialDashboardMenuSection) {
    return section.key === "contacts" || section.key === "settings";
  }

  function renderSectionSubtitle(section: OfficialDashboardMenuSection, className: string) {
    if (!section.subtitle) return null;

    if (section.key === "social") {
      return <p className={className}>Publiez et planifiez vos réseaux depuis un seul espace.</p>;
    }

    if (section.key === "email") {
      return <p className={className}>Vos emails et avis Google, classés automatiquement.</p>;
    }

    if (section.key === "torah") {
      return <p className={className}>Un agent IA pour vos cours et contenus de Torah.</p>;
    }

    if (section.key === "donation") {
      return <p className={className}>{section.subtitle}</p>;
    }

    if (section.key === "newsletter") {
      return <p className={className}>Créez et programmez vos newsletters.</p>;
    }

    if (section.key === "visuals") {
      return <p className={className}>Personnalisez et créez vos visuels.</p>;
    }

    return <p className={className}>{section.subtitle}</p>;
  }

  function renderSectionItems(section: OfficialDashboardMenuSection, compact = false) {
    const style = OFFICIAL_MENU_SECTION_STYLES[section.key] ?? OFFICIAL_MENU_SECTION_STYLES.resources;

    return section.items.map((item) => {
      const active = !item.disabled && isActive(item.href);
      const isExternal = item.external || item.href.startsWith("mailto");
      const isSocialPublisher = item.href === "/dashboard/social-networks";
      const itemClass = item.disabled
        ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 opacity-80"
        : isSocialPublisher
          ? active
            ? "border border-fuchsia-700 bg-fuchsia-700 text-white shadow-md shadow-fuchsia-200"
            : "border border-fuchsia-200 bg-gradient-to-r from-fuchsia-600 to-rose-500 text-white shadow-sm shadow-fuchsia-100 hover:from-fuchsia-700 hover:to-rose-600"
        : active
          ? style.itemActive
          : cn("text-slate-700", style.itemHover);

      const content = (
        <>
          {item.icon && (
            <item.icon
              className={cn(
                compact ? "size-[18px]" : "size-4",
                item.disabled ? "text-slate-400" : active || isSocialPublisher ? "text-current" : style.itemIcon
              )}
            />
          )}
          <span className="min-w-0 flex flex-1 flex-col">
            <span className={cn(isSocialPublisher ? "font-black leading-5" : "truncate font-medium")}>{item.label}</span>
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
            className={cn(
              compact
                ? "flex items-center gap-3 rounded-2xl border p-3"
                : "flex min-w-0 items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-all duration-200",
              itemClass
            )}
          >
            {content}
          </div>
        );
      }

      return (
        <Link
          key={`${section.section}-${item.href}`}
          href={resolveHref(item.href)}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          className={cn(
            compact
              ? "flex items-center gap-3 rounded-2xl border p-3 transition"
              : "flex min-w-0 items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-all duration-200",
            compact && (active ? "border-slate-300 bg-slate-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"),
            !compact && itemClass,
            compact && isSocialPublisher && "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800"
          )}
        >
          {content}
        </Link>
      );
    });
  }

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
          onClick={() => router.push(resolveHref("/dashboard/assistant"))}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-600 shadow-sm ring-1 ring-blue-100 transition-all hover:scale-[1.02]"
          aria-label="Ouvrir l'assistant"
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
          onClick={() => setCollapsed((current) => !current)}
          className="ml-auto flex-shrink-0 text-slate-400 transition-colors hover:text-slate-700"
          aria-label={collapsed ? "Elargir la navigation" : "Reduire la navigation"}
        >
          <ChevronDown className={cn("size-4 transition-transform", collapsed ? "-rotate-90" : "rotate-90")} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <div className={cn("mb-4 rounded-[1.35rem] border border-slate-200 bg-white p-2 shadow-[0_10px_24px_rgba(15,23,42,0.05)]", collapsed && "border-0 bg-transparent p-0 shadow-none")}>
          <div className={cn("space-y-1", collapsed && "space-y-2")}>
            {QUICK_ACCESS_ITEMS.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={resolveHref(item.href)}
                  title={collapsed ? item.label : undefined}
                  aria-label={collapsed ? item.label : undefined}
                  className={cn(
                    "relative flex min-w-0 items-center gap-3 rounded-2xl text-sm transition-all duration-200",
                    collapsed ? "h-11 justify-center px-0" : "px-3 py-2.5",
                    active
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                      : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                  )}
                >
                  <Icon className={cn("size-4 shrink-0", active ? "text-white" : "text-blue-600")} />
                  {!collapsed && <span className="min-w-0 flex-1 truncate font-semibold">{item.label}</span>}
                  {item.notification && unreadNotifications > 0 && (
                    <span
                      className={cn(
                        "shrink-0 rounded-full text-[10px] font-bold",
                        collapsed
                          ? "absolute right-1 top-1 h-4 min-w-4 px-1 leading-4"
                          : "px-1.5 py-0.5",
                        active ? "bg-white text-blue-700" : "bg-rose-500 text-white"
                      )}
                    >
                      {unreadNotifications > 99 ? "99+" : unreadNotifications}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          {menuSections.map((section) => {
            const style = OFFICIAL_MENU_SECTION_STYLES[section.key] ?? OFFICIAL_MENU_SECTION_STYLES.resources;
            const isOpen = openSections[section.section];

            return (
              <div
                key={section.section}
                className={cn(
                  "rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition duration-200 hover:border-slate-300 hover:shadow-[0_18px_40px_rgba(15,23,42,0.09)]",
                  collapsed && "border-0 bg-transparent p-0 shadow-none hover:border-0 hover:shadow-none"
                )}
              >
                <button
                  type="button"
                  onClick={() =>
                    collapsed
                      ? setFlyoutSection(section.section)
                      : setOpenSections((current) => ({
                          ...current,
                          [section.section]: !current[section.section],
                        }))
                  }
                  className={cn(
                    "flex w-full items-start gap-3 rounded-[1.15rem] px-1 py-1.5 text-left transition-all duration-200",
                    collapsed && "justify-center rounded-xl px-0 py-2 hover:bg-slate-100"
                  )}
                  aria-expanded={isOpen}
                  title={collapsed ? section.section : undefined}
                >
                  <span
                    className={cn(
                      "flex flex-shrink-0 items-center justify-center",
                      collapsed ? "mt-0 h-10 w-10" : cn("mt-4 h-10 w-10 rounded-full", style.iconSurface)
                    )}
                  >
                    <section.icon className={cn("size-[18px]", style.itemIcon)} />
                  </span>

                  {!collapsed && (
                    <>
                      <div className="min-w-0 flex-1">
                        {!shouldHideSectionAccent(section) && (
                          <div className={cn("mb-3 h-1 w-10 rounded-full", style.accentBar)} />
                        )}
                        <p className={cn("text-[15px] font-black tracking-tight", style.titleClass)}>{section.section}</p>
                        {renderSectionSubtitle(section, cn("mt-1.5 text-xs leading-5", style.descriptionClass))}
                      </div>
                      {section.key === "social" && <SocialAgentBubble />}
                      {section.key === "automations" && <AutomationAgentBubble />}
                      {section.key === "email" && <SingleAgentBubble src={LEVIK_EMAIL_IMAGE_URL} />}
                      {section.key === "torah" && <SingleAgentBubble src={SHMOUEL_TORAH_IMAGE_URL} />}
                      {section.key === "donation" && <AviAgentBubble />}
                      {section.key === "newsletter" && <SingleAgentBubble src={TSEMAH_NEWSLETTER_IMAGE_URL} />}
                      {section.key === "visuals" && <SingleAgentBubble src={ZALMAN_VISUALS_IMAGE_URL} />}
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
                      <div className="mt-3 space-y-2 rounded-[1.2rem] bg-slate-50/80 p-2.5">
                        {renderSectionItems(section)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      <div className="relative border-t border-slate-200 bg-white p-4">
        <button
          type="button"
          onClick={() => setAccountMenuOpen((value) => !value)}
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

      {collapsed && flyoutSection && (() => {
        const section = menuSections.find((item) => item.section === flyoutSection);
        if (!section) return null;
        const style = OFFICIAL_MENU_SECTION_STYLES[section.key] ?? OFFICIAL_MENU_SECTION_STYLES.resources;

        return (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
            onClick={() => setFlyoutSection(null)}
          >
            <div
              className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className={cn("text-base font-semibold tracking-tight", style.titleClass)}>{section.section}</p>
                  {renderSectionSubtitle(section, "mt-1 text-xs leading-5 text-slate-500")}
                </div>
                <button
                  type="button"
                  onClick={() => setFlyoutSection(null)}
                  className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Fermer"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{renderSectionItems(section, true)}</div>
            </div>
          </div>
        );
      })()}

    </aside>
  );
}
