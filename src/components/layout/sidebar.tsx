"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { DASHBOARD_NAV_ITEMS, DASHBOARD_SECTION_STYLES, DASHBOARD_TOP_ITEM } from "./dashboard-nav";

interface SidebarProps {
  community: {
    id: string;
    name: string;
    logoUrl: string | null;
    plan: string;
  };
  userAvatar: string | null | undefined;
  userName: string;
  basePath?: string;
}

const PLAN_COLORS: Record<string, string> = {
  FREE_TRIAL: "bg-amber-500",
  STARTER: "bg-blue-500",
  PROFESSIONAL: "bg-purple-500",
  ENTERPRISE: "bg-emerald-500",
};

const PLAN_LABELS: Record<string, string> = {
  FREE_TRIAL: "Essai gratuit",
  STARTER: "Starter",
  PROFESSIONAL: "Pro",
  ENTERPRISE: "Enterprise",
};

export function Sidebar({ community, userAvatar, userName, basePath = "/dashboard" }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  function resolveHref(href: string) {
    if (href.startsWith("http") || href.startsWith("mailto")) return href;
    return href.replace("/dashboard", basePath);
  }

  function isActive(href: string) {
    if (href.startsWith("http") || href.startsWith("mailto")) return false;
    const resolved = resolveHref(href.split("?")[0]);
    return pathname.startsWith(resolved) && resolved !== basePath;
  }

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col h-full bg-slate-900 text-slate-300 transition-all duration-300 flex-shrink-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo / Communauté */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3 min-h-[64px]">
        <button
          type="button"
          onClick={() => collapsed && setCollapsed(false)}
          className={cn(
            "w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0 ring-1 ring-blue-300/30 transition-all",
            collapsed && "cursor-pointer hover:scale-105 hover:ring-blue-200/70"
          )}
          aria-label={collapsed ? "Élargir la barre latérale" : "Accueil communauté"}
          title={collapsed ? "Élargir la barre latérale" : community.name}
        >
          {community.logoUrl ? (
            <img src={community.logoUrl} alt={community.name} className="w-full h-full rounded-xl object-cover" />
          ) : (
            <span className="text-white font-bold text-sm">
              {community.name.substring(0, 2).toUpperCase()}
            </span>
          )}
        </button>

        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate leading-tight">{community.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={cn("w-1.5 h-1.5 rounded-full", PLAN_COLORS[community.plan] ?? "bg-slate-500")} />
              <span className="text-xs text-slate-400">
                {PLAN_LABELS[community.plan] ?? community.plan}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-slate-500 hover:text-slate-300 transition-colors ml-auto flex-shrink-0"
        >
          <ChevronDown className={cn("size-4 transition-transform", collapsed ? "-rotate-90" : "rotate-0")} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
        {/* Tableau de bord — bouton standalone en haut */}
        <div className="pb-2 border-b border-slate-800">
          <Link
            href={resolveHref(DASHBOARD_TOP_ITEM.href)}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-150",
              isActive(DASHBOARD_TOP_ITEM.href)
                ? "bg-slate-700 text-white"
                : "text-slate-200 hover:bg-slate-800 hover:text-white",
              collapsed && "justify-center px-2"
            )}
            title={collapsed ? DASHBOARD_TOP_ITEM.label : undefined}
          >
            {DASHBOARD_TOP_ITEM.icon && (
              <DASHBOARD_TOP_ITEM.icon className={cn("flex-shrink-0", collapsed ? "size-5" : "size-4")} />
            )}
            {!collapsed && <span>{DASHBOARD_TOP_ITEM.label}</span>}
          </Link>
        </div>

        {DASHBOARD_NAV_ITEMS.map((section) => {
          const sectionStyle = DASHBOARD_SECTION_STYLES[section.section];
          return (
            <div key={section.section}>
              {!collapsed && (
                <p className={cn(
                  "px-3 text-[10px] font-bold uppercase tracking-widest mb-1.5",
                  sectionStyle?.label ?? "text-slate-500"
                )}>
                  {section.section}
                </p>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  const isExternal = item.external || item.href.startsWith("mailto");
                  const resolvedHref = resolveHref(item.href);

                  return (
                    <li key={item.href}>
                      <div className="flex items-center gap-1">
                        <Link
                          href={resolvedHref}
                          target={isExternal ? "_blank" : undefined}
                          rel={isExternal ? "noopener noreferrer" : undefined}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-150 flex-1 min-w-0",
                            item.isQuickAction
                              ? active
                                ? sectionStyle?.itemActive
                                : "text-sky-400 hover:bg-slate-800 hover:text-sky-300 font-medium"
                              : active
                              ? sectionStyle?.itemActive
                              : "text-slate-400 hover:bg-slate-800 hover:text-slate-200",
                            collapsed && "justify-center px-2"
                          )}
                          title={collapsed ? item.label : undefined}
                        >
                          {item.icon && (
                            <item.icon className={cn(
                              "flex-shrink-0",
                              collapsed ? "size-5" : "size-4",
                              item.isQuickAction && !active && "text-sky-500"
                            )} />
                          )}
                          {!collapsed && (
                            <span className="flex-1 font-medium truncate">{item.label}</span>
                          )}
                          {!collapsed && item.badge && (
                            <span className="text-[10px] font-bold bg-amber-500 text-white rounded-full px-1.5 py-0.5 flex-shrink-0">
                              {item.badge}
                            </span>
                          )}
                        </Link>

                        {/* Bouton action secondaire */}
                        {!collapsed && item.action && (
                          <Link
                            href={resolveHref(item.action.href)}
                            className="text-[10px] text-slate-500 hover:text-slate-200 hover:bg-slate-700 rounded-md px-1.5 py-1 transition-colors flex-shrink-0 font-medium whitespace-nowrap"
                            title={item.action.label}
                          >
                            {item.action.label}
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-slate-800">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0 overflow-hidden">
            {userAvatar ? (
              <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-slate-300">
                {userName.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-200 font-medium truncate">{userName}</p>
              <p className="text-xs text-slate-500">Administrateur</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
