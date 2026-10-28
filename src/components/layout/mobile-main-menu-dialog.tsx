"use client";

import { useLocale } from "next-intl";
import Link from "next/link";
import { ChevronRight, CreditCard, Headphones, Settings, User, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OfficialDashboardMenuSection } from "./dashboard-nav";
import { useDashboardCopy } from "@/lib/i18n/use-dashboard-copy";

type MobileMainMenuDialogProps = {
  communityName: string;
  /** Kept for the caller; the tools now live under "Autres outils" on the dashboard. */
  sections?: OfficialDashboardMenuSection[];
  onClose: () => void;
};

const ACCOUNT_LINKS: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/dashboard/settings", label: "Paramètres", icon: Settings },
  { href: "/help", label: "Support et suggestions", icon: Headphones },
  { href: "/dashboard/settings/billing", label: "Abonnement", icon: CreditCard },
  { href: "/dashboard/settings?section=profile", label: "Profil", icon: User },
];

/** The mobile main menu only holds the account: every tool is reachable from the dashboard. */
export function MobileMainMenuDialog({ communityName, onClose }: MobileMainMenuDialogProps) {
  const locale = useLocale();
  const tr = useDashboardCopy();

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[1000] bg-[#16052f]/70 backdrop-blur-[4px] md:hidden"
        onClick={onClose}
        aria-label={locale === "he" ? "סגירת התפריט" : "Fermer le menu"}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-menu-title"
        className="fixed left-1/2 top-1/2 z-[1001] flex w-[calc(100%-1.25rem)] max-w-[27rem] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[2rem] border border-white/20 bg-[#fffaf4] shadow-[0_32px_90px_rgba(15,3,45,0.5)] md:hidden"
      >
        <header className="relative shrink-0 overflow-hidden bg-[radial-gradient(circle_at_75%_0%,#6d2abd_0%,#421388_48%,#260767_100%)] px-5 pb-5 pt-[max(1.15rem,env(safe-area-inset-top))] text-white">
          <span className="pointer-events-none absolute -end-10 -top-12 size-36 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/65">EasyCom IA</p>
              <h1 id="mobile-menu-title" className="mt-0.5 text-[clamp(1.25rem,6vw,1.65rem)] font-black uppercase leading-tight tracking-[-0.035em]">
                {tr("Mon compte")}
              </h1>
            </div>
            <button
              type="button"
              autoFocus
              onClick={onClose}
              className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label={locale === "he" ? "סגירת התפריט" : "Fermer le menu"}
            >
              <X className="size-5" />
            </button>
          </div>
          <p className="relative mt-1 truncate text-xs font-medium text-white/70">{communityName}</p>
        </header>

        <div className="px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5">
          <div className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-[0_8px_22px_rgba(35,24,70,0.05)]">
            {ACCOUNT_LINKS.map((entry, index) => {
              const Icon = entry.icon;
              return (
                <Link
                  key={entry.href}
                  href={entry.href}
                  onClick={onClose}
                  className={cn(
                    "flex min-h-14 w-full items-center gap-3 px-4 py-3 text-sm font-bold uppercase text-slate-700 transition hover:bg-violet-50 active:bg-violet-100",
                    index > 0 && "border-t border-slate-100"
                  )}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-[#421388]">
                    <Icon className="size-[18px]" />
                  </span>
                  <span className="flex-1 text-start">{tr(entry.label)}</span>
                  <ChevronRight className="rtl-mirror size-4 text-slate-300" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
