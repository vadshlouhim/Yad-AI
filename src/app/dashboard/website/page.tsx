import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Globe, Mail, Palette, ShieldCheck, Sparkles } from "lucide-react";
import { AgentPageBanner } from "@/components/dashboard/agent-page-banner";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Site web - EasyCom IA" };

const contactUrl =
  "https://wa.me/33668508898?text=Bonjour%2C%20je%20suis%20int%C3%A9ress%C3%A9%20par%20vos%20services%20de%20cr%C3%A9ation%20de%20site%20web.%20Pourriez-vous%20m%E2%80%99en%20dire%20plus%2C%20s%E2%80%99il%20vous%20pla%C3%AEt%20%3F";

export default function WebsiteCreationPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-6 sm:px-6">
      <AgentPageBanner
        eyebrow="Service web"
        title="Site web"
        description="Nous créons des sites professionnels, modernes et élégants pour les Bate Habad, synagogues et associations communautaires, avec un accompagnement clair de la conception à la mise en ligne."
        icon={Globe}
        tone="purple"
        stats={[
          { label: "Design", value: "Sur mesure" },
          { label: "Mobile", value: "Optimisé" },
          { label: "Projet", value: "Accompagné" },
        ]}
      />

      <div className="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
          {[
            { icon: Palette, title: "Design clair", text: "Une présentation propre, rassurante et adaptée à votre communauté." },
            { icon: ShieldCheck, title: "Structure pro", text: "Horaires, événements, contact et informations importantes bien organisés." },
            { icon: Sparkles, title: "Effet premium", text: "Un rendu moderne qui donne envie de découvrir vos activités." },
          ].map((item) => (
            <div key={item.title} className="rounded-3xl border border-violet-100 bg-violet-50/40 p-5">
              <item.icon className="mx-auto size-7 text-[#421388]" />
              <h2 className="mt-3 text-base font-black text-slate-950">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex w-full flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link href={contactUrl} target="_blank" rel="noreferrer" className="w-full sm:w-auto">
            <Button className="h-12 w-full rounded-2xl bg-[#421388] px-6 text-white shadow-[0_14px_30px_rgba(66,19,136,0.20)] transition hover:-translate-y-0.5 hover:bg-[#35106f] sm:w-auto">
              <Mail className="size-4" />
              Contactez notre equipe professionnelle
            </Button>
          </Link>

          <Link href="https://webfityou.com" target="_blank" rel="noreferrer" className="w-full sm:w-auto">
            <Button
              variant="outline"
              className="h-12 w-full rounded-2xl border-[#421388]/20 bg-white px-6 text-[#421388] transition hover:-translate-y-0.5 hover:bg-violet-50 sm:w-auto"
            >
              <ArrowRight className="size-4" />
              Voir nos creations web deja creees pour la communaute
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
