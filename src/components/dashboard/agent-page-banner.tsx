import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type AgentPageBannerProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon?: LucideIcon;
  imageUrl?: string;
  imageAlt?: string;
  bubbleTitle?: string;
  bubbleText?: string;
  tone?: "purple" | "amber" | "teal" | "rose" | "slate";
  flat?: boolean;
  stats?: Array<{ label: string; value: string | number }>;
};

const toneClasses = {
  purple: "from-[#421388] via-[#5f249f] to-[#8A184D]",
  amber: "from-[#7a3d0f] via-[#a45f18] to-[#d39324]",
  teal: "from-[#0f766e] via-[#0f8f83] to-[#14b8a6]",
  rose: "from-[#8A184D] via-[#a3205d] to-[#c24173]",
  slate: "from-slate-900 via-slate-800 to-slate-700",
};

export function AgentPageBanner({
  eyebrow,
  title,
  description,
  icon: Icon = Sparkles,
  imageUrl,
  imageAlt = "",
  bubbleTitle,
  bubbleText,
  tone = "purple",
  flat = false,
  stats,
}: AgentPageBannerProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[1.75rem] p-5 text-white shadow-[0_24px_70px_-34px_rgba(15,23,42,0.55)] sm:p-7",
        flat ? "bg-[#181827]" : cn("bg-gradient-to-br", toneClasses[tone])
      )}
    >
      <div className="pointer-events-none absolute -right-12 -top-16 size-56 rounded-full bg-white/10 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-20 left-10 size-52 rounded-full bg-white/10 blur-3xl" aria-hidden />

      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="max-w-3xl">
          <div className="mb-4 h-1.5 w-12 rounded-full bg-white/80" />
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-white/90">
            <Icon className="size-3.5" />
            {eyebrow}
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-white/85 sm:text-base">{description}</p>

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
          <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:min-w-[25rem]">
            {imageUrl ? (
              <div className="relative z-10 shrink-0">
                <Image
                  src={imageUrl}
                  alt={imageAlt}
                  width={260}
                  height={260}
                  className="-my-5 h-44 w-auto object-contain drop-shadow-[0_24px_34px_rgba(0,0,0,0.28)] sm:h-56 lg:h-64"
                  priority
                />
              </div>
            ) : null}

            {(bubbleTitle || bubbleText) ? (
              <div className="relative max-w-sm rounded-2xl bg-white px-5 py-4 text-sm leading-6 text-slate-700 shadow-xl before:absolute before:-top-2 before:left-10 before:size-4 before:rotate-45 before:bg-white sm:before:-left-2 sm:before:top-10">
                {bubbleTitle ? <p className="font-black text-[#421388]">{bubbleTitle}</p> : null}
                {bubbleText ? <p className="mt-1 font-semibold text-slate-600">{bubbleText}</p> : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
