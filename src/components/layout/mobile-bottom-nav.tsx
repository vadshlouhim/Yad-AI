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
        "fixed inset-x-0 bottom-0 z-30 hidden max-md:block",
        "border-t border-[#421388]/10 bg-white/95 shadow-[0_-16px_38px_rgba(66,19,136,0.14)] backdrop-blur-2xl",
        "px-3 pt-2.5",
        "pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      )}
      aria-label="Navigation principale"
    >
      <div className="mx-auto flex min-h-[5rem] max-w-md items-stretch overflow-hidden border border-[#421388]/10 bg-white/90 shadow-sm shadow-[#421388]/10 backdrop-blur">
        {MOBILE_PRIMARY_NAV.map((item, index) => {
          const active = isNavActive(pathname, item.href);
          const Icon = item.icon;

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
                  "group flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 px-1 py-2.5",
                  "touch-manipulation outline-none transition-[opacity,transform] active:scale-[0.98] active:opacity-95",
                  "focus-visible:ring-2 focus-visible:ring-[#421388]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                )}
              >
                <span
                  className={cn(
                    "relative flex h-10 w-10 shrink-0 items-center justify-center transition-all duration-200",
                    active
                      ? "text-[#421388]"
                      : "text-slate-600 group-hover:-translate-y-0.5 group-hover:text-[#421388]"
                  )}
                  aria-hidden
                >
                  {Icon ? <Icon className={cn("size-6 stroke-[2.25] transition-transform duration-200", active && "scale-110")} /> : null}
                  {active && (
                    <span className="absolute -bottom-0.5 h-1 w-5 rounded-full bg-[#421388]/25 shadow-[0_0_12px_rgba(66,19,136,0.22)]" />
                  )}
                </span>
                <span
                  className={cn(
                    "w-full max-w-[5.3rem] truncate text-center text-[12px] font-bold leading-snug max-[380px]:text-[10.5px]",
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
