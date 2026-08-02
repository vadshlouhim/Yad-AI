"use client";

import { CheckCircle2, Clock3, Loader2, Lock, Play, Sparkles } from "lucide-react";
import { useState } from "react";
import type { DemoModuleConfig } from "@/lib/demo/modules";
import { useDemoState } from "./demo-state";

export function DemoModuleClient({ moduleKey, config }: { moduleKey: string; config: DemoModuleConfig }) {
  const { completeAction, state } = useDemoState();
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const actionId = `module:${moduleKey}`;
  const completed = state.completedActions.includes(actionId);

  function runSimulation() {
    setLoading(true);
    window.setTimeout(() => {
      completeAction(actionId);
      setLoading(false);
    }, 900);
  }

  return (
    <div className="space-y-5 pt-8">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-blue-700 p-6 text-white sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/20">
              <Lock className="size-3.5" /> Simulation privée
            </span>
            {config.future && <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-amber-950">Bientôt disponible</span>}
          </div>
          <h1 className="mt-4 text-2xl font-bold sm:text-3xl">{config.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100">{config.subtitle}</p>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-3">
          {config.highlights.map((highlight) => (
            <div key={highlight} className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700">
              <CheckCircle2 className="size-4 text-emerald-500" /> {highlight}
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900">Aperçu du module</h2>
              <p className="mt-1 text-xs text-slate-500">Données entièrement fictives</p>
            </div>
            <Sparkles className="size-5 text-amber-500" />
          </div>
          <div className="mt-4 space-y-3">
            {config.items.map((item, index) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">{index + 1}</span>
                <span className="flex-1 text-sm font-medium text-slate-700">{item}</span>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">Démo</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-slate-900">Action guidée</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">Ajoutez une consigne facultative puis lancez la simulation.</p>
          <label className="mt-4 block text-xs font-semibold text-slate-700" htmlFor={`demo-note-${moduleKey.replaceAll("/", "-")}`}>Consigne</label>
          <textarea
            id={`demo-note-${moduleKey.replaceAll("/", "-")}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Ex. Utiliser un ton chaleureux et concis"
            className="mt-2 min-h-24 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="button"
            onClick={runSimulation}
            disabled={loading}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-70"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            {loading ? "Simulation en cours…" : config.action}
          </button>
          {completed && (
            <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">
              <p className="flex items-center gap-2 font-bold"><CheckCircle2 className="size-4" /> Résultat prêt</p>
              <p className="mt-1 text-xs leading-5">L’action a été simulée localement. Aucun envoi réel n’a eu lieu.</p>
            </div>
          )}
          {!completed && (
            <p className="mt-3 flex items-center gap-2 text-xs text-slate-400"><Clock3 className="size-3.5" /> Résultat déterministe en moins d’une seconde</p>
          )}
        </section>
      </div>
    </div>
  );
}
