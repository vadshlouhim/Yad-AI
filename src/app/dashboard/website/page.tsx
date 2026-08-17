import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Globe, Mail, Palette, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Site web - EasyCom IA" };

const contactUrl =
  "https://wa.me/33668508898?text=Bonjour%2C%20je%20suis%20int%C3%A9ress%C3%A9%20par%20vos%20services%20de%20cr%C3%A9ation%20de%20site%20web.%20Pourriez-vous%20m%E2%80%99en%20dire%20plus%2C%20s%E2%80%99il%20vous%20pla%C3%AEt%20%3F";

export default function WebsiteCreationPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 pb-10 pt-4 sm:px-6 sm:pt-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#421388] px-5 py-7 text-white shadow-[0_24px_60px_-34px_rgba(66,19,136,0.65)] sm:px-9 sm:py-10">
        <div className="absolute -right-16 -top-20 size-56 rounded-full bg-fuchsia-400/25 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 size-48 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] ring-1 ring-white/20">
              <Globe className="size-4" /> Création de site web
            </div>
            <h1 className="mt-5 text-3xl font-black leading-tight tracking-tight sm:text-5xl">Votre communauté mérite un site remarquable</h1>
            <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-violet-100 sm:text-base">
              Nous créons des sites professionnels, modernes et élégants pour les Bate Habad, synagogues et associations communautaires.
            </p>
          </div>
          <div className="flex size-20 items-center justify-center rounded-[1.75rem] bg-white text-[#421388] shadow-xl sm:size-24">
            <Globe className="size-10 sm:size-12" />
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)] sm:p-7">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Palette, title: "Design clair", text: "Une présentation propre, rassurante et adaptée à votre communauté.", className: "bg-[#075ce5]" },
            { icon: ShieldCheck, title: "Structure pro", text: "Horaires, événements, contact et informations importantes bien organisés.", className: "bg-[#07989c]" },
            { icon: Sparkles, title: "Effet premium", text: "Un rendu moderne qui donne envie de découvrir vos activités.", className: "bg-[#d92c75]" },
          ].map((item) => (
            <div key={item.title} className={`${item.className} rounded-[1.6rem] p-5 text-white shadow-lg`}>
              <div className="flex size-11 items-center justify-center rounded-2xl bg-white text-slate-900"><item.icon className="size-6" /></div>
              <h2 className="mt-4 text-lg font-black">{item.title}</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-white/85">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-[1.6rem] bg-violet-50 p-5 text-left sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <div className="flex items-center gap-2 text-base font-black text-[#421388]"><Check className="size-5" /> Un accompagnement de A à Z</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">De la conception à la mise en ligne, chaque étape reste claire et maîtrisée.</p>
          </div>
          <div className="mt-5 flex w-full flex-col gap-3 sm:mt-0 sm:w-auto sm:min-w-[300px]">
          <Link href={contactUrl} target="_blank" rel="noreferrer" className="w-full sm:w-auto">
            <Button className="h-12 w-full rounded-2xl bg-[#421388] px-6 font-bold text-white shadow-lg hover:bg-[#35106f]">
              <Mail className="size-4" />
              Contactez notre équipe
            </Button>
          </Link>

          <Link href="https://webfityou.com" target="_blank" rel="noreferrer" className="w-full sm:w-auto">
            <Button variant="outline" className="h-12 w-full rounded-2xl border-violet-200 bg-white px-6 font-bold text-[#421388] hover:bg-violet-100">
              <ArrowRight className="size-4" />
              Voir nos créations
            </Button>
          </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
