import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, ExternalLink, MessageCircle, ShoppingBag, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BoutiqueTone = "violet" | "blue" | "coral" | "amber" | "teal" | "rose";

const tones: Record<BoutiqueTone, { hero: string; glow: string; badge: string; info: string }> = {
  violet: {
    hero: "bg-[#421388]",
    glow: "bg-fuchsia-400/25",
    badge: "bg-white/12 text-violet-50 ring-white/20",
    info: "border-violet-100 bg-violet-50 text-violet-950",
  },
  blue: {
    hero: "bg-[#075ce5]",
    glow: "bg-cyan-300/25",
    badge: "bg-white/12 text-blue-50 ring-white/20",
    info: "border-blue-100 bg-blue-50 text-blue-950",
  },
  coral: {
    hero: "bg-[#ef3f4f]",
    glow: "bg-orange-200/30",
    badge: "bg-white/12 text-red-50 ring-white/20",
    info: "border-rose-100 bg-rose-50 text-rose-950",
  },
  amber: {
    hero: "bg-[#ee9d00]",
    glow: "bg-yellow-200/35",
    badge: "bg-white/15 text-amber-50 ring-white/25",
    info: "border-amber-100 bg-amber-50 text-amber-950",
  },
  teal: {
    hero: "bg-[#07989c]",
    glow: "bg-cyan-200/30",
    badge: "bg-white/12 text-teal-50 ring-white/20",
    info: "border-teal-100 bg-teal-50 text-teal-950",
  },
  rose: {
    hero: "bg-[#d92c75]",
    glow: "bg-pink-200/30",
    badge: "bg-white/12 text-pink-50 ring-white/20",
    info: "border-pink-100 bg-pink-50 text-pink-950",
  },
};

interface BoutiqueProductPageProps {
  title: string;
  description: string;
  info: string;
  whatsappUrl: string;
  icon: LucideIcon;
  tone?: BoutiqueTone;
  children: React.ReactNode;
}

export function BoutiqueProductPage({
  title,
  description,
  info,
  whatsappUrl,
  icon: Icon,
  tone = "violet",
  children,
}: BoutiqueProductPageProps) {
  const palette = tones[tone];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 pb-10 pt-4 sm:px-6 sm:pt-6">
      <Link href="/dashboard/overview" className="inline-flex">
        <Button variant="ghost" className="min-h-11 gap-2 rounded-2xl px-3 text-slate-600 hover:bg-white hover:text-slate-950">
          <ArrowLeft className="size-4" />
          Retour vers l’accueil
        </Button>
      </Link>

      <section className={cn("relative overflow-hidden rounded-[2rem] px-5 py-7 text-white shadow-[0_24px_60px_-34px_rgba(66,19,136,0.6)] sm:px-8 sm:py-9", palette.hero)}>
        <div className={cn("absolute -right-16 -top-20 size-52 rounded-full blur-3xl", palette.glow)} />
        <div className="absolute -bottom-20 left-1/4 size-44 rounded-full bg-white/10 blur-3xl" />
        <div className="relative max-w-3xl">
          <div className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.13em] ring-1", palette.badge)}>
            <ShoppingBag className="size-4" />
            Boutique en ligne
          </div>
          <div className="mt-5 flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-lg sm:size-16">
              <Icon className="size-7 sm:size-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black leading-[1.05] tracking-tight sm:text-5xl">{title}</h1>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-white/85 sm:text-base">{description}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)] lg:items-start">
        <div className="space-y-4 lg:sticky lg:top-5">
          <div className={cn("rounded-[1.6rem] border p-5 text-sm font-medium leading-6 shadow-sm", palette.info)}>
            <Sparkles className="mb-3 size-6" />
            {info}
          </div>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-[1.25rem] bg-[#128C7E] px-5 py-3 text-center text-sm font-black text-white shadow-[0_16px_32px_-18px_rgba(18,140,126,0.8)] transition hover:-translate-y-0.5 hover:bg-[#0f7a6f] focus:outline-none focus:ring-4 focus:ring-emerald-200"
          >
            <MessageCircle className="size-5" />
            Demander plus d’informations
            <ExternalLink className="size-4" />
          </a>
        </div>

        {children}
      </section>
    </div>
  );
}
