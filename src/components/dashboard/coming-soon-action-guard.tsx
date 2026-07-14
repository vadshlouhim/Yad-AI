"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ComingSoonActionGuard({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null;
    const action = target?.closest("button,a") as HTMLElement | null;
    if (!action || action.closest("[data-coming-soon-ignore]")) return;

    event.preventDefault();
    event.stopPropagation();
    setOpen(true);
  }

  return (
    <>
      <div onClickCapture={handleClick}>{children}</div>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[2rem] border border-white/70 bg-white p-6 text-center shadow-[0_28px_90px_rgba(15,23,42,0.28)]">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-violet-50 text-[#421388]">
              <Sparkles className="size-7" />
            </div>
            <h2 className="mt-4 text-xl font-black text-slate-950">Cette page sera bientôt disponible</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              L’interface est visible pour vous présenter l’expérience à venir. Les actions seront activées prochainement.
            </p>
            <Button
              type="button"
              data-coming-soon-ignore
              onClick={() => setOpen(false)}
              className="mt-5 w-full rounded-2xl bg-[#421388] text-white hover:bg-[#35106f]"
            >
              <X className="size-4" />
              Fermer
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
