"use client";

import { CheckCircle2, Link2 } from "lucide-react";
import { DemoFeaturePage } from "@/components/demo/demo-feature-page";
import { DEMO_CHANNELS } from "@/lib/demo/data";
import { useDemoState } from "@/components/demo/demo-state";

export default function DemoSettingsChannelsPage() {
  const { state, toggleChannel } = useDemoState();
  return <DemoFeaturePage title="Connecter mes réseaux" subtitle="Simulation sûre de connexion des canaux sociaux et de messagerie." highlights={["Instagram / Facebook", "Telegram / WhatsApp / Email", "Statuts persistants dans la démo"]} primaryCta={{ label: "Vérifier les connexions" }}><div className="grid gap-3 sm:grid-cols-2">{DEMO_CHANNELS.map((channel) => { const connected = state.connectedChannels.includes(channel.name); return <article key={channel.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><p className="font-semibold text-slate-900">{channel.name}</p><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${connected ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{connected && <CheckCircle2 className="size-3" />}{connected ? "Connecté" : "Non connecté"}</span></div><p className="mt-2 text-sm text-slate-500">{channel.handle ?? "Aucun identifiant public"}</p><button type="button" onClick={() => toggleChannel(channel.name)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Link2 className="size-3.5" />{connected ? "Déconnecter dans la démo" : "Connecter dans la démo"}</button></article>; })}</div></DemoFeaturePage>;
}
