"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Search,
  LogOut,
  Settings,
  User,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  DASHBOARD_NAV_ITEMS,
  DASHBOARD_SECTION_STYLES,
  MOBILE_PRIMARY_NAV,
} from "./dashboard-nav";

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 flex items-center gap-3 px-4 lg:px-6 flex-shrink-0 z-10">
        <div className="lg:hidden">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            aria-label="Ouvrir la navigation"
          >
            <Menu className="size-5" />
          </button>
        </div>

      {/* Search */}
        <div className="flex-1 min-w-0 max-w-md">
        {searchOpen ? (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              autoFocus
              type="text"
              placeholder="Rechercher événements, contenus, affiches, articles…"
              onBlur={() => setSearchOpen(false)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="flex min-w-0 items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <Search className="size-4" />
            <span className="text-sm hidden sm:block">Rechercher…</span>
            <span className="text-sm sm:hidden truncate">{communityName}</span>
            <kbd className="hidden sm:inline-flex text-[10px] font-mono bg-slate-100 text-slate-400 rounded px-1.5 py-0.5">
              ⌘K
            </kbd>
          </button>
        )}
        </div>

      {/* Actions */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Notifications */}
          <Link
            href="/dashboard/notifications"
            className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <Bell className="size-5" />
            {unreadNotifications > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </Link>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 rounded-lg px-2 py-2 sm:px-3 hover:bg-slate-100 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                {userAvatar ? (
                  <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-slate-600">
                    {userName.substring(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="text-sm font-medium text-slate-700 hidden md:block max-w-[120px] truncate">
                {userName.split(" ")[0]}
              </span>
              <ChevronDown className="size-3.5 text-slate-400" />
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-20">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-800">{userName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{communityName}</p>
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
                    Paramètres
                  </Link>
                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 text-left"
                    >
                      <LogOut className="size-4" />
                      Se déconnecter
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
          <div
            className="fixed inset-0 z-40 bg-slate-950/45 lg:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-[88vw] max-w-sm bg-slate-950 text-slate-200 shadow-2xl lg:hidden">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {communityName}
                  </p>
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

              <div className="border-b border-slate-800 px-4 py-3">
                <div className="grid grid-cols-4 gap-2">
                  {MOBILE_PRIMARY_NAV.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileNavOpen(false)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-center text-[11px] font-medium",
                        isActive(item.href)
                          ? "bg-blue-600 text-white"
                          : "bg-slate-900 text-slate-300"
                      )}
                    >
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <nav className="flex-1 overflow-y-auto px-3 py-4">
                {DASHBOARD_NAV_ITEMS.map((section) => {
                  const sectionStyle = DASHBOARD_SECTION_STYLES[section.section];
                  return (
                  <div key={section.section} className="mb-6">
                    <p className={cn(
                      "px-2 pb-2 text-[11px] font-bold uppercase tracking-[0.18em]",
                      sectionStyle?.label ?? "text-slate-500"
                    )}>
                      {section.section}
                    </p>
                    <div className="space-y-1">
                      {section.items.map((item) => {
                        const active = isActive(item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileNavOpen(false)}
                            className={cn(
                              "flex items-center gap-3 rounded-xl px-3 py-3 text-sm",
                              active
                                ? sectionStyle?.itemActive
                                : "text-slate-300 hover:bg-slate-900"
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
