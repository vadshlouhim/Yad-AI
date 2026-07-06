import Link from "next/link";
import type React from "react";
import type { LucideIcon } from "lucide-react";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const DAVID_IMAGE_URL =
  "https://xicipkwqvuoaavvdgnnb.supabase.co/storage/v1/object/public/Image%20du%20site/agent-orcetra-shlomi.webp";

export const DAVID_AUTOMATION_IMAGE_URL =
  "https://xicipkwqvuoaavvdgnnb.supabase.co/storage/v1/object/public/Image%20du%20site/David%20responsable%20automatisations.webp";

type DavidBannerAgentProps = {
  text: string;
  className?: string;
};

export function DavidBannerAgent({ text, className }: DavidBannerAgentProps) {
  return (
    <div className={cn("relative z-20 flex flex-col items-start gap-4 sm:flex-row sm:items-center", className)}>
      <div className="pointer-events-none relative z-30 shrink-0" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={DAVID_AUTOMATION_IMAGE_URL}
          alt=""
          className="-my-10 h-52 w-auto object-contain drop-shadow-[0_24px_34px_rgba(20,8,42,0.35)] animate-install-float sm:-my-12 lg:-my-16 lg:h-72"
        />
      </div>
      <div className="relative max-w-md rounded-2xl bg-white px-5 py-4 text-base font-black leading-6 text-[#421388] shadow-xl shadow-[#22084b]/20 before:absolute before:-left-2 before:top-10 before:size-4 before:rotate-45 before:bg-white">
        {text}
      </div>
    </div>
  );
}

type AutomationHeroProps = {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  icon: LucideIcon;
  watermarkIcon?: LucideIcon;
  className?: string;
  children?: React.ReactNode;
};

export function AutomationHero({ eyebrow, title, description, icon: Icon, watermarkIcon: WatermarkIcon, className, children }: AutomationHeroProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-3xl border border-[#421388]/30 bg-[#421388] p-6 text-white shadow-lg shadow-[#421388]/18", className)}>
      {WatermarkIcon ? (
        <div className="pointer-events-none absolute inset-y-0 right-6 flex items-center" aria-hidden="true">
          <div className="rounded-full bg-white/[0.04] p-5">
            <WatermarkIcon className="size-28 text-white/[0.08]" strokeWidth={1.6} />
          </div>
        </div>
      ) : null}
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="text-xs font-black uppercase tracking-[0.18em] text-white/70">{eyebrow}</p>}
          <div className="mt-3 h-1.5 w-10 rounded-full bg-white/85" />
          <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">{title}</h1>
          {description && <div className="mt-2 max-w-3xl text-sm font-medium leading-6 text-white/80">{description}</div>}
          {children && <div className="mt-4">{children}</div>}
        </div>
        <div className="flex justify-end" aria-hidden="true">
          <div className="relative flex size-20 items-center justify-center rounded-[1.55rem] border border-white/15 bg-white/10 text-white shadow-2xl shadow-[#22084b]/30 backdrop-blur animate-install-float">
            <Icon className="size-9" strokeWidth={2.15} />
            <span className="absolute -right-1 -top-1 size-3 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.8)] animate-pulse" />
            <span className="absolute bottom-4 left-4 size-1.5 rounded-full bg-white/80 shadow-[0_0_14px_rgba(255,255,255,0.75)] animate-ping" />
          </div>
        </div>
      </div>
    </div>
  );
}

type DavidAutomationCardProps = {
  className?: string;
  ctaLabel?: string;
  href?: string;
  onCtaClick?: () => void;
  disabled?: boolean;
};

export function DavidAutomationCard({
  className,
  ctaLabel = "Commencer la configuration →",
  href = "/dashboard/assistant",
  onCtaClick,
  disabled = false,
}: DavidAutomationCardProps) {
  const button = (
    <Button
      type="button"
      disabled={disabled}
      onClick={onCtaClick}
      className="h-10 rounded-2xl bg-[#421388] px-5 text-sm font-bold text-white shadow-sm shadow-[#421388]/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#35106f] hover:shadow-md"
    >
      {ctaLabel}
    </Button>
  );

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl border border-[#421388]/15 bg-white p-5 shadow-sm shadow-[#421388]/10",
        "before:absolute before:bottom-5 before:left-0 before:top-5 before:w-1.5 before:rounded-r-full before:bg-[#421388]",
        className
      )}
    >
      <div className="flex flex-col gap-4 pl-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative flex size-20 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_16px_34px_rgba(66,19,136,0.18)] ring-1 ring-[#421388]/10 animate-install-float">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={DAVID_IMAGE_URL} alt="David, agent intelligent" className="size-16 rounded-full object-contain" />
            <span className="absolute -right-1 top-2 flex size-7 items-center justify-center rounded-full bg-[#421388] text-white shadow-lg shadow-[#421388]/25">
              <Bot className="size-4" />
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-950">Je suis David</p>
            <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-600">
              nous allons configurer cette automatisation ensemble. <strong>Allons-y !</strong>
            </p>
          </div>
        </div>
        {onCtaClick ? <div className="shrink-0">{button}</div> : <Link href={href} className="shrink-0">{button}</Link>}
      </div>
    </section>
  );
}

