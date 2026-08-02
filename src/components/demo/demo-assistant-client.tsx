"use client";

import Link from "next/link";
import { Bot, CheckCircle2, ImageIcon, Loader2, Send, Sparkles } from "lucide-react";
import { useState } from "react";
import { useDemoState } from "./demo-state";

export function DemoAssistantClient() {
  const { state, generateContent } = useDemoState();
  const [customPrompt, setCustomPrompt] = useState("");
  const prompt = customPrompt || `Prépare toute la communication pour ${state.event?.title ?? "le prochain Chabbat"}.`;
  const [loading, setLoading] = useState(false);
  function runPrompt() { if (!prompt.trim()) return; setLoading(true); window.setTimeout(() => { generateContent(); setLoading(false); }, 1100); }
  return (
    <div className="space-y-5 pt-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-blue-600">Parcours de démonstration · Étape 2</p><h1 className="mt-2 text-2xl font-bold text-slate-900">Assistant IA</h1><p className="mt-1 text-sm text-slate-500">Transformez l’événement en plan de communication multicanal.</p></section>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-950 text-white"><Bot className="size-4" /></span><div className="rounded-2xl rounded-tl-md bg-slate-100 p-3 text-sm leading-6 text-slate-700">Bonjour Rabbi Lévi. J’ai chargé votre agenda, vos horaires et vos canaux. Que souhaitez-vous préparer ?</div></div><div className="mt-4 flex gap-2"><textarea value={prompt} onChange={(event) => setCustomPrompt(event.target.value)} className="min-h-24 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" aria-label="Demande à l’assistant" /><button type="button" onClick={runPrompt} disabled={loading || !prompt.trim()} className="flex w-12 items-center justify-center rounded-2xl bg-blue-600 text-white disabled:opacity-60" aria-label="Envoyer la demande">{loading ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}</button></div>
          {state.contentGenerated && <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950" role="status"><p className="flex items-center gap-2 font-bold"><Sparkles className="size-4" /> Plan de communication prêt</p><ul className="mt-2 space-y-1.5 text-xs leading-5"><li>• Jeudi 18h : publication Instagram et Facebook</li><li>• Vendredi 12h : rappel WhatsApp personnalisé</li><li>• Affiche avec horaires, lieu et appel à participation</li></ul><Link href="/demo/templates" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white"><ImageIcon className="size-4" /> Choisir l’affiche →</Link></div>}
        </section>
        <aside className="space-y-3"><div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm font-bold text-slate-900">Contexte utilisé</p><div className="mt-3 space-y-2 text-xs text-slate-600"><p>✓ Profil de la communauté</p><p>✓ Calendrier et horaires</p><p>✓ Canaux connectés</p><p>✓ Ton éditorial chaleureux</p></div></div><div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900"><p className="flex items-center gap-2 font-bold"><CheckCircle2 className="size-4" /> Mode sûr</p><p className="mt-1">Cette réponse est prédéfinie. Aucun service IA n’est appelé.</p></div></aside>
      </div>
    </div>
  );
}
