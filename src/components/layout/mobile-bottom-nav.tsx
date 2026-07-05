"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MOBILE_PRIMARY_NAV } from "./dashboard-nav";

const MOBILE_NAV_EMOJIS: Record<string, string> = {
  "/dashboard/overview": "\u{1F3E0}",
  "/dashboard/assistant": "\u2728",
  "/dashboard/events": "\u{1F5D3}\uFE0F",
  "/dashboard/settings": "\u2699\uFE0F",
};

function isNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 hidden max-md:block",
        "border-t border-[#421388]/10 bg-white/95 shadow-[0_-16px_38px_rgba(66,19,136,0.14)] backdrop-blur-2xl",
        "px-3 pt-2",
        "pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      )}
      aria-label="Navigation principale"
    >
      <div className="mx-auto flex min-h-[4.6rem] max-w-md items-stretch overflow-hidden rounded-[1.35rem] border border-[#421388]/10 bg-gradient-to-b from-white to-violet-50/70 shadow-sm shadow-[#421388]/10">
        {MOBILE_PRIMARY_NAV.map((item, index) => {
          const active = isNavActive(pathname, item.href);
          const emoji = MOBILE_NAV_EMOJIS[item.href] ?? "\u2022";

          return (
            <div key={item.href} className="relative flex min-w-0 flex-1">
              {index > 0 && (
                <span
                  className="absolute left-0 top-3 h-[calc(100%-1.5rem)] w-px bg-gradient-to-b from-transparent via-[#421388]/18 to-transparent"
                  aria-hidden
                />
              )}
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2",
                  "touch-manipulation outline-none transition-[opacity,transform] active:scale-[0.98] active:opacity-95",
                  "focus-visible:ring-2 focus-visible:ring-[#421388]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                )}
              >
                <span
                  className={cn(
                    "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-[1.25rem] transition-all duration-200",
                    active
                      ? "bg-[#421388] shadow-[0_10px_22px_rgba(66,19,136,0.24)] ring-1 ring-[#421388]/15"
                      : "bg-white text-slate-600 shadow-sm shadow-slate-200/70 ring-1 ring-slate-200/80 group-hover:-translate-y-0.5 group-hover:ring-[#421388]/20"
                  )}
                  aria-hidden
                >
                  <span className={cn("leading-none transition-transform duration-200", active && "scale-110")}>
                    {emoji}
                  </span>
                  {active && (
                    <span className="absolute -bottom-1 h-1 w-5 rounded-full bg-violet-200 shadow-[0_0_12px_rgba(196,181,253,0.8)]" />
                  )}
                </span>
                <span
                  className={cn(
                    "w-full max-w-[5.15rem] truncate text-center text-[11px] font-semibold leading-snug max-[380px]:text-[10px]",
                    active ? "text-[#421388]" : "text-slate-500 group-hover:text-[#421388]"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
