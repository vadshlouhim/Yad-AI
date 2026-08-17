"use client";

import { Grid2X2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const isOverviewPage = pathname === "/dashboard/overview";

  function handleClick() {
    if (isOverviewPage) {
      window.dispatchEvent(new CustomEvent("dashboard:open-main-menu"));
      return;
    }

    router.push("/dashboard/overview");
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 hidden rounded-t-[2rem] border-t border-[#421388]/10 bg-white/95 px-4 pt-2.5 shadow-[0_-18px_42px_rgba(66,19,136,0.13)] backdrop-blur-2xl max-md:block pb-[max(0.6rem,env(safe-area-inset-bottom))]"
      aria-label="Navigation principale"
    >
      <div className="mx-auto flex min-h-[4.7rem] max-w-md items-center px-2">
        <button
          type="button"
          onClick={handleClick}
          className="flex min-h-14 w-full items-center justify-center gap-3 rounded-[1.35rem] bg-[#421388] px-5 text-base font-black text-white shadow-[0_12px_28px_rgba(66,19,136,0.3)] outline-none transition hover:bg-[#371071] active:scale-[0.985] focus-visible:ring-4 focus-visible:ring-[#421388]/25"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/15">
            <Grid2X2 className="size-5 stroke-[2.25]" aria-hidden="true" />
          </span>
          {isOverviewPage ? "Autres outils" : "Menu principal"}
        </button>
      </div>
    </nav>
  );
}
