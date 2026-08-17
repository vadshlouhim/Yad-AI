import type { Metadata } from "next";
import Link from "next/link";
import { Bot, MessageCircle, Search, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Referencement - EasyCom IA" };

const whatsappUrl =
  "https://wa.me/33668508898?text=Bonjour%2C%20je%20suis%20int%C3%A9ress%C3%A9%20par%20vos%20services%20de%20r%C3%A9f%C3%A9rencement%20de%20site%20web.%20Pourriez-vous%20m%E2%80%99en%20dire%20plus%2C%20s%E2%80%99il%20vous%20pla%C3%AEt%20%3F";

export default function ReferencementPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 pb-10 pt-4 sm:px-6 sm:pt-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#07989c] px-5 py-7 text-white shadow-[0_24px_60px_-34px_rgba(7,152,156,0.65)] sm:px-9 sm:py-10">
        <div className="absolute -right-16 -top-20 size-56 rounded-full bg-cyan-200/30 blur-3xl" />
        <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] ring-1 ring-white/25"><Sparkles className="size-4" /> Référencement IA</div>
            <h1 className="mt-5 text-3xl font-black leading-tight tracking-tight sm:text-5xl">Soyez trouvé sur Google et par les agents IA</h1>
            <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-teal-50 sm:text-base">Une présence claire, cohérente et pensée pour être recommandée au bon moment.</p>
          </div>
          <div className="flex size-20 items-center justify-center rounded-[1.75rem] bg-white text-teal-700 shadow-xl sm:size-24"><Search className="size-10 sm:size-12" /></div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)] sm:p-7">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Search, title: "Trouvable", text: "Vos informations importantes deviennent plus claires pour Google.", className: "bg-[#075ce5]" },
            { icon: Bot, title: "Recommandable", text: "Votre activité est structurée pour ressortir dans les réponses des agents IA.", className: "bg-[#421388]" },
            { icon: ShieldCheck, title: "Cohérent", text: "Le discours, les pages et les signaux restent alignés.", className: "bg-[#ee9d00]" },
          ].map((item) => (
            <div key={item.title} className={`${item.className} rounded-[1.6rem] p-5 text-white shadow-lg`}>
              <div className="flex size-11 items-center justify-center rounded-2xl bg-white text-slate-900"><item.icon className="size-6" /></div>
              <h2 className="mt-4 text-lg font-black">{item.title}</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-white/85">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col items-center gap-4 rounded-[1.6rem] bg-teal-50 p-5 text-center">
          <div className="inline-flex items-center gap-2 text-sm font-bold text-teal-800"><TrendingUp className="size-5" /> Google, SEO local, agents IA et visibilité naturelle</div>
          <Link href={whatsappUrl} target="_blank" rel="noreferrer" className="w-full sm:w-auto">
            <Button className="h-12 w-full rounded-2xl bg-[#07989c] px-6 font-bold text-white shadow-lg hover:bg-teal-700 sm:w-auto">
              <MessageCircle className="size-4" />
              Contactez-nous via WhatsApp
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
