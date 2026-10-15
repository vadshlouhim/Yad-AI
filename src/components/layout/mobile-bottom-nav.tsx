"use client";

import { Grid2X2, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
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
      aria-label="Navigation principale"
    >
      <div className="mx-auto grid min-h-[4.7rem] max-w-md grid-cols-2 items-center gap-2">
        <button
          type="button"
          onClick={handleClick}
          className="flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-xl bg-violet-50 px-2 text-xs font-semibold text-violet-900 focus-visible:ring-4 focus-visible:ring-violet-200"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/15">
            <Grid2X2 className="size-5 stroke-[2.25]" aria-hidden="true" />
          </span>
          Menu principal
        </button>
        <Link href="/dashboard/contacts" aria-current={pathname.startsWith("/dashboard/contacts") ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-xs font-semibold focus-visible:ring-4 focus-visible:ring-violet-200 ${pathname.startsWith("/dashboard/contacts") ? "bg-[#421388] text-white" : "bg-violet-50 text-violet-900"}`}><UsersRound className="size-5" aria-hidden="true" />CRM intelligent</Link>
      </div>
    </nav>
  );
}
