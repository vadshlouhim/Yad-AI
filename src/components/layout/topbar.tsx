"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, ChevronDown, LogOut, Menu, Settings, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AGENT_IMAGE_URLS } from "@/lib/agents";
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
  return (
    <span className="relative z-20 flex h-16 w-[4.9rem] shrink-0 items-center justify-center self-center overflow-visible">
      <img
        src={DAVID_AUTOMATION_IMAGE_URL}
        alt=""
        aria-hidden="true"
        className="absolute -top-3 z-20 h-20 w-16 object-contain object-top drop-shadow-[0_10px_14px_rgba(15,23,42,0.18)]"
      />
    </span>
  );
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

function shouldHideSectionAccent(section: OfficialDashboardMenuSection) {
  return section.key === "contacts" || section.key === "settings";
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
    if (pathname.startsWith("/dashboard/assistant")) return "Agents intelligents";
    if (pathname.startsWith("/dashboard/automations")) return "Automatisations";
    if (pathname.startsWith("/dashboard/notifications")) return "Notifications";
    if (pathname.startsWith("/dashboard/social-networks")) return "Tous mes réseaux";
    if (pathname.startsWith("/dashboard/whatsapp")) return "WhatsApp";
    if (pathname.startsWith("/dashboard/facebook")) return "Facebook";
    if (pathname.startsWith("/dashboard/instagram")) return "Instagram";
    if (pathname.startsWith("/dashboard/email")) return "Email";
    if (pathname.startsWith("/dashboard/google-reviews")) return "Avis Google";
    if (pathname.startsWith("/dashboard/daily-assistant")) return "Assistant du quotidien";
    if (pathname.startsWith("/dashboard/events")) return "Mon Agenda";
    if (pathname.startsWith("/dashboard/boutique/calendrier-horaires-tichri")) return "Calendrier de Tichri";
    if (pathname.startsWith("/dashboard/boutique/magnets-chabbat")) return "Magnets de Chabbat";
    if (pathname.startsWith("/dashboard/boutique/birkat-hachana")) return "Birkat Hachana";
    if (pathname.startsWith("/dashboard/boutique/box-tehilim")) return "Box de Tehilim";
    if (pathname.startsWith("/dashboard/boutique/anniversaire-juif")) return "Anniversaire juif";
    if (pathname.startsWith("/dashboard/boutique/plaquette-teffilin")) return "Plaquette Teffilin en 6 étapes";
    if (pathname.startsWith("/dashboard/boutique")) return "Boutique";
    if (pathname.startsWith("/dashboard/articles")) return "Articles";
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
    if (pathOnly === "/dashboard/boutique") return pathname === pathOnly;
    return pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
  }

  function renderSectionItems(section: OfficialDashboardMenuSection) {
    const style = OFFICIAL_MENU_SECTION_STYLES[section.key] ?? OFFICIAL_MENU_SECTION_STYLES.resources;

    return section.items.map((item) => {
      const active = !item.disabled && isActive(item.href);
      const isExternal = item.external || item.href.startsWith("mailto");
      const isSocialPublisher = item.href === "/dashboard/social-networks";
      const itemClass = item.disabled
        ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 opacity-80"
        : item.featured
          ? active
            ? "border border-[#35106f] bg-[#35106f] font-black text-white"
            : "border border-[#421388] bg-[#421388] font-black text-white hover:bg-[#35106f]"
        : active
          ? style.itemActive
          : cn("text-slate-700", style.itemHover);

      const content = (
        <>
          {item.icon && (
            item.iconSurfaceClass ? (
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-xl", item.iconSurfaceClass)}>
                <item.icon
                  className={cn(
                    "size-4",
                    item.disabled ? "text-slate-400" : item.iconClass ?? (active ? "text-current" : isSocialPublisher ? "text-fuchsia-700" : style.itemIcon)
                  )}
                />
              </span>
            ) : (
              <item.icon
                className={cn(
                  "size-4 shrink-0",
                  item.disabled ? "text-slate-400" : item.iconClass ?? (active ? "text-current" : isSocialPublisher ? "text-fuchsia-700" : style.itemIcon)
                )}
              />
            )
          )}
          <span className="flex min-w-0 flex-1 flex-col">
            <span className={cn("truncate", item.featured ? "font-black" : "font-medium")}>{item.label}</span>
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
        <div key={`${section.section}-${item.href}`} className={item.featured ? "mt-3 border-t border-slate-200 pt-3" : "contents"}>
          <Link
            href={item.href}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
            onClick={() => setMobileNavOpen(false)}
            className={cn(
              "flex min-w-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all duration-200",
              itemClass,
              isSocialPublisher && !active && "border border-fuchsia-200 bg-fuchsia-50 font-bold text-fuchsia-900 shadow-sm",
              isSocialPublisher && active && "border border-fuchsia-600 bg-[#6f174f] font-bold text-white shadow-md shadow-fuchsia-200"
            )}
            data-featured={isSocialPublisher || item.featured || undefined}
          >
            {content}
          </Link>
        </div>
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
          "z-[900] flex h-16 flex-shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:px-6",
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
                <div className="fixed inset-0 z-[998]" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 top-full z-[999] mt-1 w-52 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
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
