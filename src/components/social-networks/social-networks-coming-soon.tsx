"use client";

import { useState } from "react";
import { MessageCircle, Share2, Sparkles, X } from "lucide-react";
import { AgentPageBanner } from "@/components/dashboard/agent-page-banner";
import { InstagramIcon } from "@/components/layout/dashboard-nav";
import { Button } from "@/components/ui/button";

function FacebookSocialIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M9 8H6v4h3v12h5V12h3.64L18 8h-4V6.33C14 5.38 14.19 5 15.12 5H19V0h-3.81C11.6 0 10 1.58 10 4.62V8H9Z" />
    </svg>
  );
}

const features = [
  { icon: Sparkles, label: "Message unique", detail: "Préparez un contenu clair à adapter à vos réseaux." },
  { icon: InstagramIcon, label: "Instagram", detail: "Publiez vos visuels et textes depuis un même espace." },
  { icon: FacebookSocialIcon, label: "Facebook", detail: "Diffusez le même message sur votre page en un clic." },
];

export function SocialNetworksComingSoon() {
  const [open, setOpen] = useState(true);

  return (
    <>
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <AgentPageBanner
          eyebrow="Réseaux sociaux"
          title="Tous mes réseaux"
          description="Préparez un seul message et retrouvez bientôt vos canaux sociaux dans une expérience unifiée."
          icon={Share2}
          tone="slate"
          flat
        />

        <section className="grid gap-3 sm:grid-cols-3">
          {features.map(({ icon: Icon, label, detail }) => (
            <article
              key={label}
              className="animate-fade-in min-w-0 rounded-2xl border border-sky-100 bg-white p-4 shadow-[0_16px_38px_-28px_rgba(14,165,233,0.58)] transition duration-200 hover:-translate-y-0.5 hover:border-sky-200"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
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
            aria-labelledby="social-networks-dialog-title"
            className="animate-fade-in relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.34)]"
          >
            <div className="h-1.5 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-5 flex size-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Fermer"
            >
              <X className="size-5" />
            </button>

            <div className="p-6 sm:p-7">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 shadow-sm shadow-sky-100">
                <MessageCircle className="size-7" />
              </span>
              <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-sky-700">Bientôt disponible</p>
              <h1 id="social-networks-dialog-title" className="mt-2 pr-8 text-2xl font-black text-slate-950 sm:text-3xl">
                Publiez sur tous vos réseaux
              </h1>
              <p className="mt-5 text-sm leading-6 text-slate-600 sm:text-[15px]">
                Bientôt vous pourrez créer un message et le publier en un clic sur Instagram et Facebook en un clic.
              </p>
              <Button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-7 h-11 w-full rounded-2xl bg-sky-600 font-bold text-white shadow-sm shadow-sky-200 hover:bg-sky-700"
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
