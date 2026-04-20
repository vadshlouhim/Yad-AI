"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Send,
  Zap,
  Library,
  BarChart3,
  Settings,
  Bot,
  Building2,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";

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

const NAV_ITEMS = [
  {
    section: "Principal",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/dashboard/assistant", label: "Assistant IA", icon: Bot, badge: "IA" },
    ],
  },
  {
    section: "Communication",
    items: [
      { href: "/dashboard/events", label: "Événements", icon: Calendar },
      { href: "/dashboard/content", label: "Contenus", icon: FileText },
      { href: "/dashboard/publications", label: "Publications", icon: Send },
      { href: "/dashboard/automations", label: "Automatisations", icon: Zap },
    ],
  },
  {
    section: "Ressources",
    items: [
      { href: "/dashboard/templates", label: "Templates", icon: Library },
      { href: "/dashboard/media", label: "Médiathèque", icon: null },
      { href: "/dashboard/stats", label: "Statistiques", icon: BarChart3 },
    ],
  },
  {
    section: "Paramètres",
    items: [
      { href: "/dashboard/community", label: "Ma communauté", icon: Building2 },
      { href: "/dashboard/settings", label: "Paramètres", icon: Settings },
    ],
  },
];

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

  // Remplace le préfixe /dashboard par basePath dans les hrefs
  function resolveHref(href: string) {
    return href.replace("/dashboard", basePath);
  }

  function isActive(href: string, exact?: boolean) {
    const resolved = resolveHref(href);
    if (exact) return pathname === resolved;
    return pathname.startsWith(resolved) && resolved !== basePath;
  }

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-slate-900 text-slate-300 transition-all duration-300 flex-shrink-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo / Communauté */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3 min-h-[64px]">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
          {community.logoUrl ? (
            <img src={community.logoUrl} alt={community.name} className="w-full h-full rounded-xl object-cover" />
          ) : (
            <span className="text-white font-bold text-sm">
              {community.name.substring(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate leading-tight">{community.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={cn(
                "w-1.5 h-1.5 rounded-full",
                PLAN_COLORS[community.plan] ?? "bg-slate-500"
              )} />
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
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
        {NAV_ITEMS.map((section) => (
          <div key={section.section}>
            {!collapsed && (
              <p className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                {section.section}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href, item.exact);
                return (
                  <li key={item.href}>
                    <Link
                      href={resolveHref(item.href)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150",
                        active
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-400 hover:bg-slate-800 hover:text-slate-200",
                        collapsed && "justify-center px-2"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      {item.icon && (
                        <item.icon className={cn("flex-shrink-0", collapsed ? "size-5" : "size-4")} />
                      )}
                      {!collapsed && (
                        <>
                          <span className="flex-1 font-medium">{item.label}</span>
                          {item.badge && (
                            <span className="text-[10px] font-bold bg-amber-500 text-white rounded-full px-1.5 py-0.5">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
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
