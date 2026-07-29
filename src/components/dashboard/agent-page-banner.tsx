import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type AgentPageBannerProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon?: LucideIcon;
  titleIcon?: LucideIcon;
  imageUrl?: string;
  imageAlt?: string;
  imageClassName?: string;
  bubbleTitle?: string;
  bubbleTitleClassName?: string;
  bubbleText?: string;
  tone?: "purple" | "amber" | "teal" | "teal-dark" | "emerald" | "rose" | "lime" | "slate";
  flat?: boolean;
  stats?: Array<{ label: string; value: string | number }>;
};

const toneClasses = {
  purple: "from-[#421388] via-[#5f249f] to-[#8A184D]",
  amber: "from-[#7a3d0f] via-[#a45f18] to-[#d39324]",
  teal: "from-[#0f766e] via-[#0f8f83] to-[#14b8a6]",
  "teal-dark": "from-[#062f2d] via-[#075c55] to-[#0f766e]",
  emerald: "from-[#065f46] via-[#047857] to-[#059669]",
  rose: "from-[#8A184D] via-[#a3205d] to-[#c24173]",
  lime: "from-[#365314] via-[#4d7c0f] to-[#65a30d]",
  slate: "from-slate-900 via-slate-800 to-slate-700",
};

export function AgentPageBanner({
  eyebrow,
  title,
  description,
  icon: Icon = Sparkles,
  titleIcon: TitleIcon,
  imageUrl,
  imageAlt = "",
  imageClassName,
  bubbleTitle,
  bubbleTitleClassName,
  bubbleText,
  tone = "purple",
  flat = false,
  stats,
}: AgentPageBannerProps) {
  return (
    <section
      className={cn(
        "relative mx-auto w-full max-w-6xl overflow-hidden rounded-[1.75rem] p-5 text-white shadow-[0_24px_70px_-34px_rgba(15,23,42,0.55)] sm:p-7",
        flat
          ? tone === "teal-dark"
            ? "bg-[#063c37]"
            : tone === "emerald"
              ? "bg-[#065f46]"
            : tone === "rose"
              ? "bg-[#8A184D]"
              : tone === "lime"
                ? "bg-[#365314]"
              : "bg-[#181827]"
          : cn("bg-gradient-to-br", toneClasses[tone])
      )}
    >
      <div className="pointer-events-none absolute -right-12 -top-16 size-56 rounded-full bg-white/10 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-20 left-10 size-52 rounded-full bg-white/10 blur-3xl" aria-hidden />

      <div className="relative grid gap-6 text-center lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:text-left">
        <div className="max-w-3xl">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/80 lg:mx-0" />
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-white/90">
            <Icon className="size-3.5" />
            {eyebrow}
          </div>
          <h1 className="mt-3 flex flex-wrap items-center justify-center gap-3 text-3xl font-black tracking-tight text-white sm:text-4xl lg:justify-start">
            {title}
            {TitleIcon ? (
              <span className="animate-home-float inline-flex size-11 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-white shadow-lg shadow-rose-950/20 sm:size-12" aria-hidden="true">
                <TitleIcon className="size-6 -rotate-12 sm:size-7" />
              </span>
            ) : null}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm font-medium leading-6 text-white/85 sm:text-base lg:mx-0">{description}</p>

          {stats && stats.length > 0 ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/70">{stat.label}</p>
                  <p className="mt-1 text-2xl font-black text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {imageUrl || bubbleTitle || bubbleText ? (
          <div className="relative flex flex-col items-center gap-4 lg:min-w-[25rem] lg:flex-row lg:justify-center">
            {imageUrl ? (
              <div className="relative z-10 shrink-0">
                <Image
                  src={imageUrl}
                  alt={imageAlt}
                  width={260}
                  height={260}
                  className={cn("-my-5 h-44 w-auto object-contain drop-shadow-[0_24px_34px_rgba(0,0,0,0.28)] sm:h-56 lg:h-64", imageClassName)}
                  priority
                />
              </div>
            ) : null}

            {(bubbleTitle || bubbleText) ? (
              <div className="relative max-w-sm rounded-2xl bg-white px-5 py-4 text-sm leading-6 text-slate-700 shadow-xl before:absolute before:-top-2 before:left-1/2 before:size-4 before:-translate-x-1/2 before:rotate-45 before:bg-white lg:before:-left-2 lg:before:top-10 lg:before:translate-x-0">
                {bubbleTitle ? <p className={cn("font-black text-[#421388]", bubbleTitleClassName)}>{bubbleTitle}</p> : null}
                {bubbleText ? <p className="mt-1 font-semibold text-slate-600">{bubbleText}</p> : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
