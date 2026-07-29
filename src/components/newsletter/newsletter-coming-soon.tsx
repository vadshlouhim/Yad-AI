"use client";

import { useState } from "react";
import { BellRing, CalendarClock, Mail, Sparkles, X } from "lucide-react";
import { AgentPageBanner } from "@/components/dashboard/agent-page-banner";
import { Button } from "@/components/ui/button";
import { AGENT_IMAGE_URLS } from "@/lib/agents";

const features = [
  { icon: Sparkles, label: "Contenu IA", detail: "Vos événements et vos photos deviennent une newsletter prête à relire." },
  { icon: CalendarClock, label: "Envoi programmé", detail: "Choisissez la date et l'heure qui conviennent à votre communauté." },
  { icon: BellRing, label: "Validation avant envoi", detail: "Recevez un rappel pour vérifier l'email avant son départ automatique." },
];

const LEVIK_NEWSLETTER_IMAGE = AGENT_IMAGE_URLS.tsemah;

export function NewsletterComingSoon() {
  const [open, setOpen] = useState(true);

  return (
    <>
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <AgentPageBanner
          eyebrow="Communication intelligente"
          title="Création de newsletter"
          description="Préparez vos prochaines newsletters depuis vos événements, vos photos et le calendrier de votre communauté."
          icon={Mail}
          imageUrl={LEVIK_NEWSLETTER_IMAGE}
          imageAlt="Levik, agent IA Newsletter"
          bubbleTitle="Je suis Levik, l’agent IA responsable de vos newsletters"
          bubbleTitleClassName="text-slate-950"
          bubbleText="Je rassemble vos contenus pour créer une newsletter claire, prête à relire et à programmer."
          tone="lime"
          flat
        />

        <section className="grid gap-3 sm:grid-cols-3">
          {features.map(({ icon: Icon, label, detail }) => (
            <article
              key={label}
              className="animate-fade-in min-w-0 rounded-2xl border border-lime-100 bg-white p-5 shadow-[0_18px_42px_-30px_rgba(54,83,20,0.42)] transition duration-200 hover:-translate-y-0.5 hover:border-lime-300"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-lime-50 text-lime-800">
                <Icon className="size-5 animate-pulse" />
              </span>
              <h2 className="mt-4 text-sm font-black text-slate-950">{label}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">{detail}</p>
            </article>
          ))}
        </section>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[2147483647] flex items-start justify-center overflow-y-auto bg-slate-950/60 px-4 py-6 backdrop-blur-sm sm:items-center">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="newsletter-dialog-title"
            className="animate-fade-in relative my-auto w-full max-w-lg overflow-hidden rounded-[2rem] border border-lime-100 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.34)]"
          >
            <div className="bg-[#365314] px-6 pb-5 pt-6 text-white sm:px-7">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-white/10 text-lime-100">
                <Mail className="size-6" />
              </span>
              <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-lime-200">Bientôt disponible</p>
              <h1 id="newsletter-dialog-title" className="mt-2 pr-8 text-2xl font-black sm:text-3xl">
                Votre newsletter, prête au bon moment
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-5 flex size-9 items-center justify-center rounded-xl text-white/80 transition hover:bg-white/10 hover:text-white"
              aria-label="Fermer"
            >
              <X className="size-5" />
            </button>

            <div className="p-6 sm:p-7">
              <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600 sm:text-[15px]">
                <p>Levik pourra créer vos newsletters à partir de vos événements et de vos photos, puis les programmer à la date choisie.</p>
                <p>Vous pourrez aussi recevoir une notification avant l’envoi, afin de vérifier et valider l’email avant qu’il parte automatiquement.</p>
              </div>
              <Button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-7 h-11 w-full rounded-2xl bg-lime-600 font-bold text-white shadow-sm shadow-lime-200 hover:bg-lime-700"
              >
                Compris
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
