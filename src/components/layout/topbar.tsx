"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, ChevronDown, LogOut, Menu, Search, Settings, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DASHBOARD_NAV_ITEMS, DASHBOARD_SECTION_STYLES } from "./dashboard-nav";

interface TopBarProps {
  communityName: string;
  userAvatar: string | null | undefined;
  userName: string;
  unreadNotifications: number;
}

export function TopBar({ communityName, userAvatar, userName, unreadNotifications }: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const SEARCH_TARGETS = [
    { label: "Assistant IA", href: "/dashboard/assistant", keywords: ["assistant", "ia", "chat"] },
    { label: "Mon Agenda IA", href: "/dashboard/events", keywords: ["agenda", "quotidien", "cours", "rappel"] },
    { label: "Automatisations", href: "/dashboard/automations", keywords: ["automatisation", "j-10", "j-5", "j-1"] },
    { label: "Affiches", href: "/dashboard/templates", keywords: ["affiche", "visuel", "template"] },
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
      <header className="z-10 flex h-16 flex-shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:px-6">
        <div className="lg:hidden">
          <button
            onClick={() => router.push("/dashboard/assistant")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            aria-label="Ouvrir la navigation"
          >
            <Menu className="size-5" />
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">{communityName}</p>
            <p className="text-xs text-slate-400">Navigation principale</p>
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
                  <img src={userAvatar} alt={userName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-600">
                    {userName.substring(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="hidden max-w-[120px] truncate text-sm font-medium text-slate-700 md:block">
                {userName.split(" ")[0]}
              </span>
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
                    href="/dashboard/settings/profile"
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
          <div className="fixed inset-0 z-40 bg-slate-950/45 lg:hidden" onClick={() => setMobileNavOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-[88vw] max-w-sm bg-slate-950 text-slate-200 shadow-2xl lg:hidden">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{communityName}</p>
                  <p className="text-xs text-slate-400">Navigation</p>
                </div>
                <button
                  onClick={() => setMobileNavOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-900"
                  aria-label="Fermer la navigation"
                >
                  <X className="size-5" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto px-3 py-4">
                {DASHBOARD_NAV_ITEMS.map((section) => {
                  const sectionStyle = DASHBOARD_SECTION_STYLES[section.section];
                  const isAssistantSection = section.section === "ASSISTANT IA";
                  return (
                    <div key={section.section} className="mb-6">
                      {!isAssistantSection && (
                        <p
                          className={cn(
                            "px-2 pb-2 text-[11px] font-bold uppercase tracking-[0.18em]",
                            sectionStyle?.label ?? "text-slate-500",
                          )}
                        >
                          {section.section}
                        </p>
                      )}
                      <div className="space-y-1">
                        {section.items.map((item) => {
                          const active = isActive(item.href);
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setMobileNavOpen(false)}
                              className={cn(
                                isAssistantSection
                                  ? "flex items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800 via-slate-900 to-[#050816] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(2,6,23,0.35)] transition hover:from-slate-700 hover:via-slate-900 hover:to-[#0b1020]"
                                  : "flex items-center gap-3 rounded-xl px-3 py-3 text-sm",
                                isAssistantSection
                                  ? active && "ring-1 ring-cyan-300/60 shadow-[0_14px_36px_rgba(34,211,238,0.18)]"
                                  : active
                                    ? sectionStyle?.itemActive
                                    : "text-slate-300 hover:bg-slate-900",
                              )}
                            >
                              {item.icon && <item.icon className="size-4" />}
                              <span className="flex-1">{item.label}</span>
                              {item.badge && (
                                <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                  {item.badge}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </nav>
            </div>
          </div>
        </>
      )}
    </>
  );
}
