"use client";

import Link from "next/link";
import { CheckCircle2, Clock3, Loader2, Mail, MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import { useDemoState } from "./demo-state";
import { FacebookIcon, InstagramIcon } from "@/components/layout/dashboard-nav";

const CHANNELS = [
  { name: "Instagram", icon: InstagramIcon, color: "text-pink-600 bg-pink-50" },
  { name: "Facebook", icon: FacebookIcon, color: "text-blue-600 bg-blue-50" },
  { name: "WhatsApp", icon: MessageCircle, color: "text-emerald-600 bg-emerald-50" },
  { name: "Email", icon: Mail, color: "text-red-600 bg-red-50" },
];

export function DemoSocialPublisher() {
  const { state, adaptChannels, schedulePublication } = useDemoState();
  const [selected, setSelected] = useState<string[]>(state.adaptedChannels.length ? state.adaptedChannels : CHANNELS.map((channel) => channel.name));
  const [loading, setLoading] = useState<"adapt" | "schedule" | null>(null);
  function toggle(name: string) { setSelected((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]); }
  function adapt() { setLoading("adapt"); window.setTimeout(() => { adaptChannels(selected); setLoading(null); }, 850); }
  function schedule() { setLoading("schedule"); window.setTimeout(() => { schedulePublication(); setLoading(null); }, 750); }
  return (
    <div className="space-y-5 pt-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-blue-600">Parcours de démonstration · Étape 4</p><h1 className="mt-2 text-2xl font-bold text-slate-900">Diffusion multicanale</h1><p className="mt-1 text-sm text-slate-500">Adaptez le même message à chaque réseau puis planifiez sa diffusion.</p></section>
      <div className="grid gap-5 lg:grid-cols-[330px_minmax(0,1fr)]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-slate-900">Canaux de diffusion</h2><div className="mt-4 space-y-2">{CHANNELS.map(({ name, icon: Icon, color }) => { const checked = selected.includes(name); return <button key={name} type="button" onClick={() => toggle(name)} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${checked ? "border-blue-300 bg-blue-50/50" : "border-slate-200 bg-white"}`}><span className={`flex size-9 items-center justify-center rounded-xl ${color}`}><Icon className="size-4" /></span><span className="flex-1 text-sm font-semibold text-slate-700">{name}</span><span className={`flex size-5 items-center justify-center rounded-full border ${checked ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"}`}>{checked && <CheckCircle2 className="size-3.5" />}</span></button>; })}</div><button type="button" disabled={!selected.length || loading !== null} onClick={adapt} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60">{loading === "adapt" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Générer les adaptations</button></section>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Aperçus générés</h2><p className="mt-1 text-xs text-slate-500">Contenu fictif adapté au format de chaque canal</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Simulation</span></div>{state.adaptedChannels.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{state.adaptedChannels.map((channel) => <article key={channel} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-blue-600">{channel}</p><p className="mt-2 text-sm font-bold text-slate-900">Grand Chabbat communautaire ✨</p><p className="mt-2 text-xs leading-5 text-slate-600">Rejoignez-nous vendredi à 19h30 pour un moment chaleureux, un dîner convivial et une soirée inspirante.</p><p className="mt-2 text-xs text-blue-600">#Chabbat #Paris #Communauté</p></article>)}</div> : <div className="mt-4 flex min-h-52 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center text-sm text-slate-400">Sélectionnez les canaux et générez les adaptations.</div>}{state.adaptedChannels.length > 0 && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-blue-950 p-4 text-white"><div><p className="text-sm font-bold">Tout est prêt</p><p className="mt-1 text-xs text-blue-200">Programmation simulée jeudi à 18h00</p></div><button type="button" onClick={schedule} disabled={loading !== null} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-blue-950">{loading === "schedule" ? <Loader2 className="size-4 animate-spin" /> : <Clock3 className="size-4" />} Planifier</button></div>}</section>
      </div>
      {state.publicationScheduled && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900"><span>✓ Publications planifiées avec succès dans la démo.</span><Link href="/demo/publications" className="rounded-xl bg-emerald-700 px-4 py-2 text-xs text-white">Voir l’historique →</Link></div>}
    </div>
  );
}
