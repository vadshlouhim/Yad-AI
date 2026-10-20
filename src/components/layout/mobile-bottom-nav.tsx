"use client";

import { FileText, Grid2X2, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const nav = useTranslations("nav");
  const dashboard = useTranslations("dashboard");
  const locale = useLocale();
  const isOverviewPage = pathname === "/dashboard" || pathname === "/dashboard/overview";

  function handleClick() {
    if (!window.dispatchEvent(new Event("contacts:before-navigate", { cancelable: true }))) return;
    if (isOverviewPage) {
      window.dispatchEvent(new CustomEvent("dashboard:open-main-menu"));
      return;
    }

    router.push("/dashboard");
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 hidden rounded-t-[2rem] border-t border-[#421388]/10 bg-white/95 px-4 pt-2.5 shadow-[0_-18px_42px_rgba(66,19,136,0.13)] backdrop-blur-2xl max-md:block pb-[max(0.6rem,env(safe-area-inset-bottom))]"
      aria-label={nav("primaryLabel")}
    >
      <div className={`mx-auto grid min-h-[4.7rem] max-w-md items-center gap-2 ${locale === "he" ? "grid-cols-3" : "grid-cols-2"}`}>
        {locale === "he" ? <>
          <Link href="/dashboard/newsletter" aria-current={pathname.startsWith("/dashboard/newsletter") ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-xs font-semibold focus-visible:ring-4 focus-visible:ring-violet-200 ${pathname.startsWith("/dashboard/newsletter") ? "bg-[#421388] text-white" : "bg-violet-50 text-violet-900"}`}><FileText className="size-5" aria-hidden="true" />{dashboard("heNewsletter")}</Link>
          <span aria-disabled="true" className="flex min-h-14 cursor-default flex-col items-center justify-center gap-1 rounded-xl bg-slate-100 px-1 text-[11px] font-semibold text-slate-400"><Grid2X2 className="size-5" aria-hidden="true" /><span>{dashboard("mainMenu")}</span><small className="text-[8px] leading-none">{dashboard("heComingSoonBadge")}</small></span>
          <span aria-disabled="true" className="flex min-h-14 cursor-default flex-col items-center justify-center gap-1 rounded-xl bg-slate-100 px-1 text-[11px] font-semibold text-slate-400"><UsersRound className="size-5" aria-hidden="true" /><span>{dashboard("smartCrm")}</span><small className="text-[8px] leading-none">{dashboard("heComingSoonBadge")}</small></span>
        </> : <>
        <button
          type="button"
          onClick={handleClick}
          className="flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-xl bg-violet-50 px-2 text-xs font-semibold text-violet-900 focus-visible:ring-4 focus-visible:ring-violet-200"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/15">
            <Grid2X2 className="size-5 stroke-[2.25]" aria-hidden="true" />
          </span>
          {dashboard("mainMenu")}
        </button>
        <Link href="/dashboard/contacts" aria-current={pathname.startsWith("/dashboard/contacts") ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-xs font-semibold focus-visible:ring-4 focus-visible:ring-violet-200 ${pathname.startsWith("/dashboard/contacts") ? "bg-[#421388] text-white" : "bg-violet-50 text-violet-900"}`}><UsersRound className="size-5" aria-hidden="true" />{dashboard("smartCrm")}</Link>
        </>}
      </div>
    </nav>
  );
}
