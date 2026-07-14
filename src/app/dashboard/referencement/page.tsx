import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, Search, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { AgentPageBanner } from "@/components/dashboard/agent-page-banner";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Referencement - EasyCom IA" };

const whatsappUrl =
  "https://wa.me/33668508898?text=Bonjour%2C%20je%20suis%20int%C3%A9ress%C3%A9%20par%20vos%20services%20de%20r%C3%A9f%C3%A9rencement%20de%20site%20web.%20Pourriez-vous%20m%E2%80%99en%20dire%20plus%2C%20s%E2%80%99il%20vous%20pla%C3%AEt%20%3F";

export default function ReferencementPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-6 sm:px-6">
      <AgentPageBanner
        eyebrow="Visibilité"
        title="Référencement sur Google et les agents IA"
        description="Nous renforçons votre présence sur Google et dans les réponses des agents IA, avec une présentation claire, cohérente et pensée pour être recommandée au bon moment."
        icon={Search}
        tone="teal"
        stats={[
          { label: "SEO local", value: "Google" },
          { label: "IA", value: "Agents" },
          { label: "Présence", value: "Durable" },
        ]}
      />

      <div className="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
          {[
            { icon: Search, title: "Trouvable", text: "Vos informations importantes deviennent plus claires pour Google." },
            { icon: TrendingUp, title: "Recommandable", text: "Votre activité est structurée pour mieux ressortir dans les recherches pertinentes." },
            { icon: ShieldCheck, title: "Cohérent", text: "Le discours, les pages et les signaux restent alignés." },
          ].map((item) => (
            <div key={item.title} className="rounded-3xl border border-teal-100 bg-teal-50/40 p-5">
              <item.icon className="mx-auto size-7 text-teal-700" />
              <h2 className="mt-3 text-base font-black text-slate-950">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex w-full flex-col items-center gap-4">
          <Link href={whatsappUrl} target="_blank" rel="noreferrer" className="w-full sm:w-auto">
            <Button className="h-12 w-full rounded-2xl bg-teal-700 px-6 text-white shadow-[0_14px_30px_rgba(15,118,110,0.20)] transition hover:-translate-y-0.5 hover:bg-teal-800 sm:w-auto">
              <MessageCircle className="size-4" />
              Contactez-nous via WhatsApp
            </Button>
          </Link>

          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-4 py-2 text-xs font-semibold text-teal-700">
            <Sparkles className="size-3.5" />
            Google, SEO local, agents IA et visibilité naturelle
          </div>
        </div>
      </div>
    </div>
  );
}
