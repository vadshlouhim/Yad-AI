"use client";

import { useState, type MouseEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Sparkles, X } from "lucide-react";
import { isDashboardHrefEnabled } from "@/lib/features-by-locale";

function ComingSoonDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("dashboard.comingSoonDialog");
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[1000] bg-[#170534]/60 backdrop-blur-[3px]" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[1001] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[2rem] bg-[#fffaf5] text-center shadow-[0_28px_80px_rgba(23,5,52,0.38)] outline-none">
          <div className="relative bg-gradient-to-br from-[#5a1a96] via-[#421388] to-[#2b0c63] px-6 pb-6 pt-8 text-white">
            <DialogPrimitive.Close className="absolute end-3 top-3 flex size-10 items-center justify-center rounded-full bg-white/16 ring-1 ring-white/25 transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              <X className="size-5" />
              <span className="sr-only">{t("close")}</span>
            </DialogPrimitive.Close>
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
              <Sparkles className="size-7 fill-[#ffba13] text-[#ffba13]" />
            </span>
            <DialogPrimitive.Title className="mt-4 text-2xl font-black tracking-tight">{t("title")}</DialogPrimitive.Title>
          </div>
          <div className="px-6 pb-6 pt-5">
            <DialogPrimitive.Description className="text-sm font-semibold leading-6 text-slate-700">{t("message")}</DialogPrimitive.Description>
            <DialogPrimitive.Close className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#421388] px-5 text-sm font-black text-white shadow-[0_12px_26px_rgba(66,19,136,0.28)] transition hover:bg-[#35106f] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#421388]/25">
              {t("close")}
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * The Hebrew dashboard shows the French home unchanged; links to features not yet
 * offered in that language open a "coming soon" window instead of navigating.
 */
export function useComingSoonGate() {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const isBlocked = (href: string) => !isDashboardHrefEnabled(locale, href);
  const guard = (href: string) => (event: MouseEvent) => {
    if (!isBlocked(href)) return;
    event.preventDefault();
    setOpen(true);
  };
  return {
    isBlocked,
    guard,
    openComingSoon: () => setOpen(true),
    comingSoonDialog: <ComingSoonDialog open={open} onOpenChange={setOpen} />,
  };
}
