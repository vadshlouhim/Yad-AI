"use client";

import { useState } from "react";
import { BellRing, CalendarClock, Mail, Sparkles, X } from "lucide-react";
import { AgentPageBanner } from "@/components/dashboard/agent-page-banner";
import { Button } from "@/components/ui/button";

const features = [
  { icon: Sparkles, label: "Contenu IA", detail: "Vos événements et vos photos deviennent une newsletter prête à relire." },
  { icon: CalendarClock, label: "Envoi programmé", detail: "Choisissez la date et l'heure qui conviennent à votre communauté." },
  { icon: BellRing, label: "Validation avant envoi", detail: "Recevez un rappel pour vérifier l'email avant son départ automatique." },
];

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
          tone="slate"
          flat
        />

        <section className="grid gap-3 sm:grid-cols-3">
          {features.map(({ icon: Icon, label, detail }) => (
            <article
              key={label}
              className="animate-fade-in min-w-0 rounded-2xl border border-lime-100 bg-white p-4 shadow-[0_16px_38px_-28px_rgba(77,124,15,0.52)] transition duration-200 hover:-translate-y-0.5 hover:border-lime-200"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-lime-50 text-lime-700">
                <Icon className="size-5" />
              </span>
              <h2 className="mt-4 text-sm font-black text-slate-950">{label}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">{detail}</p>
            </article>
          ))}
        </section>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="newsletter-dialog-title"
            className="animate-fade-in relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.34)]"
          >
            <div className="h-1.5 bg-lime-500" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-5 flex size-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Fermer"
            >
              <X className="size-5" />
            </button>

            <div className="p-6 sm:p-7">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-lime-50 text-lime-700 shadow-sm shadow-lime-100">
                <Mail className="size-7" />
              </span>
              <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-lime-700">Bientôt disponible</p>
              <h1 id="newsletter-dialog-title" className="mt-2 pr-8 text-2xl font-black text-slate-950 sm:text-3xl">
                Votre newsletter, prête au bon moment
              </h1>
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
