"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MOBILE_PRIMARY_NAV } from "./dashboard-nav";

function isNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 hidden max-md:flex",
        "min-h-[5.25rem] items-center justify-between gap-0.5",
        "border-t border-white/15",
        "bg-gradient-to-r from-[#1E88E5] via-[#009688] to-[#00897B]",
        "shadow-[0_-10px_28px_rgba(15,23,42,0.18)]",
        "pt-2 pl-1 pr-1",
        "pb-[max(0.375rem,env(safe-area-inset-bottom))]"
      )}
      aria-label="Navigation principale"
    >
      {MOBILE_PRIMARY_NAV.map((item) => {
        const Icon = item.icon;
        if (!Icon) return null;

        const active = isNavActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-[3.25rem] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1",
              "touch-manipulation outline-none transition-[opacity,transform] active:scale-[0.98] active:opacity-95",
              "focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d7cba]"
            )}
          >
            <span
              className={cn(
                "flex h-11 shrink-0 items-center justify-center rounded-full px-4 transition-colors",
                active ? "bg-black/28 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" : "bg-transparent"
              )}
            >
              <Icon
                className={cn(
                  "size-[22px] shrink-0",
                  active ? "text-white" : "text-white/78"
                )}
                strokeWidth={active ? 2.35 : 2}
                aria-hidden
              />
            </span>
            <span
              className={cn(
                "w-full max-w-[5.25rem] truncate text-center text-[12px] leading-snug tracking-tight max-[380px]:text-[11px]",
                active ? "font-semibold tabular-nums text-white" : "font-medium text-white/72"
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
