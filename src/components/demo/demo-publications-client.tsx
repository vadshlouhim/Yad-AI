"use client";

import Link from "next/link";
import { CalendarClock, CheckCircle2, RotateCcw, Send } from "lucide-react";
import { DEMO_PUBLICATIONS } from "@/lib/demo/data";
import { useDemoState } from "./demo-state";

const STATUS: Record<string, { label: string; style: string }> = {
  PUBLISHED: { label: "Publiée", style: "bg-emerald-50 text-emerald-700" },
  SCHEDULED: { label: "Planifiée", style: "bg-purple-50 text-purple-700" },
  FAILED: { label: "À vérifier", style: "bg-red-50 text-red-700" },
  FALLBACK_READY: { label: "Prête", style: "bg-blue-50 text-blue-700" },
};

export function DemoPublicationsClient() {
  const { state, completeAction } = useDemoState();
  const retried = state.completedActions.includes("retry-publication");
  const publications = state.publicationScheduled ? [{ id: "journey-publication", channelType: state.adaptedChannels.join(", "), status: "SCHEDULED", content: "Grand Chabbat communautaire — rejoignez-nous vendredi à 19h30.", scheduledAt: new Date("2026-08-06T18:00:00"), event: { title: state.event?.title ?? "Grand Chabbat communautaire" } }, ...DEMO_PUBLICATIONS] : DEMO_PUBLICATIONS;
  return <div className="space-y-5 pt-8"><section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-blue-600">Parcours de démonstration · Étape 5</p><h1 className="mt-2 text-2xl font-bold text-slate-900">Historique des publications</h1><p className="mt-1 text-sm text-slate-500">Suivez les contenus planifiés, publiés ou à vérifier.</p></section>{state.publicationScheduled && <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><CheckCircle2 className="size-5" /><div><p className="font-bold">Scénario complet terminé</p><p className="mt-0.5 text-xs">L’événement, le contenu, le visuel et les publications ont été préparés sans aucun envoi réel.</p></div></div>}<div className="grid gap-3">{publications.map((publication) => { const status = publication.id === "pub-failed-1" && retried ? STATUS.SCHEDULED : STATUS[publication.status] ?? STATUS.SCHEDULED; return <article key={publication.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-xl bg-blue-950 px-2.5 py-1 text-xs font-bold text-white">{publication.channelType}</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.style}`}>{publication.id === "pub-failed-1" && retried ? "Replanifiée" : status.label}</span></div><p className="mt-3 text-sm font-semibold text-slate-800">{publication.content}</p>{publication.event && <p className="mt-1 text-xs text-slate-500">Événement : {publication.event.title}</p>}</div>{publication.id === "pub-failed-1" && !retried && <button type="button" onClick={() => completeAction("retry-publication")} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"><RotateCcw className="size-3.5" /> Relancer</button>}</div><div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-400">{publication.status === "PUBLISHED" ? <Send className="size-3.5" /> : <CalendarClock className="size-3.5" />} Action simulée · aucune diffusion externe</div></article>; })}</div><Link href="/demo" className="inline-flex rounded-xl bg-blue-950 px-4 py-2.5 text-sm font-bold text-white">Retour au tableau de bord</Link></div>;
}
