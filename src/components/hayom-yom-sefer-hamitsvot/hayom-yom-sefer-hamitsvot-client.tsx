"use client";

import { useState } from "react";
import { BookOpen, CalendarDays, Clock3, ScrollText, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const TEMPLATE_PLACEHOLDERS = [
  { title: "Hayom Yom quotidien", description: "Le texte du jour, prêt à partager.", icon: CalendarDays, tone: "text-violet-700 bg-violet-50 border-violet-100" },
  { title: "Sefer Hamitsvot", description: "Une mitsva quotidienne présentée clairement.", icon: ScrollText, tone: "text-sky-700 bg-sky-50 border-sky-100" },
  { title: "Format communauté", description: "Un modèle adapté à votre identité visuelle.", icon: BookOpen, tone: "text-amber-700 bg-amber-50 border-amber-100" },
] as const;

export function HayomYomSeferHamitsvotClient() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="container mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6">
      <section className="relative overflow-hidden rounded-[1.4rem] border border-[#421388]/30 bg-[#421388] p-6 text-white shadow-[0_22px_52px_rgba(66,19,136,0.22)] sm:p-8">
        <div className="pointer-events-none absolute inset-y-0 right-6 flex items-center" aria-hidden="true">
          <div className="rounded-full bg-white/[0.04] p-5">
            <BookOpen className="size-28 text-white/[0.08]" strokeWidth={1.6} />
          </div>
        </div>
        <div className="relative max-w-3xl">
          <div className="mb-4 h-1.5 w-12 rounded-full bg-white/80" />
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-amber-100 shadow-inner shadow-white/10">
              <BookOpen className="size-5" />
            </span>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Sefer Hamitsvot / Hayom Yom</h1>
          </div>
          <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-violet-100 sm:text-base">
            Publiez automatiquement le Sefer Hamitsvot et Hayom Yom chaque jour.
          </p>
        </div>
      </section>

      <section className="border-y border-amber-200 bg-amber-50/70 px-5 py-6 sm:px-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700 shadow-sm">
              <Clock3 className="size-5" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Bientôt disponible</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Votre contenu quotidien, bientôt automatisé</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Aucune affiche ni publication n&apos;est configurée pour le moment.</p>
            </div>
          </div>
          <Button type="button" size="xl" onClick={() => setDialogOpen(true)} className="shrink-0 bg-[#421388] hover:bg-[#35106f]">
            <Sparkles className="size-5" />
            Créez cette automatisation
          </Button>
        </div>
      </section>

      <section>
        <div className="mb-5">
          <h2 className="text-xl font-black text-slate-950">Designs de modèles</h2>
          <p className="mt-1 text-sm text-slate-500">Les premiers modèles Sefer Hamitsvot et Hayom Yom seront bientôt disponibles ici.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATE_PLACEHOLDERS.map(({ title, description, icon: Icon, tone }) => (
            <article key={title} className="overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              <div className="flex aspect-[4/5] flex-col items-center justify-center border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
                <span className={`flex size-12 items-center justify-center rounded-xl border ${tone}`}>
                  <Icon className="size-6" />
                </span>
                <p className="mt-4 text-sm font-black text-slate-800">Bientôt disponible</p>
              </div>
              <div className="px-4 py-4">
                <h3 className="text-sm font-black text-slate-950">{title}</h3>
                <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {dialogOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={() => setDialogOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="hayom-yom-dialog-title" className="w-full max-w-md rounded-2xl border border-amber-100 bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <span className="flex size-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Clock3 className="size-6" /></span>
              <button type="button" onClick={() => setDialogOpen(false)} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Fermer"><X className="size-5" /></button>
            </div>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.14em] text-amber-700">Bientôt disponible</p>
            <h2 id="hayom-yom-dialog-title" className="mt-2 text-2xl font-black text-slate-950">Sefer Hamitsvot / Hayom Yom</h2>
            <p className="mt-4 text-sm leading-6 text-slate-600">La création de cette automatisation sera disponible prochainement.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
