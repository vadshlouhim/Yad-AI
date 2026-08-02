"use client";

import { useState } from "react";
import { DEMO_DRAFTS } from "@/lib/demo/data";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, FileText, Plus, Sparkles } from "lucide-react";
import { CONTENT_STATUS_LABELS, truncate } from "@/lib/utils";
import { useDemoState } from "@/components/demo/demo-state";

const FILTERS = ["Tous", "Brouillons", "Propositions IA", "Prêt à publier"] as const;
const STATUS_BY_FILTER: Record<(typeof FILTERS)[number], string | null> = { Tous: null, Brouillons: "DRAFT", "Propositions IA": "AI_PROPOSAL", "Prêt à publier": "READY_TO_PUBLISH" };
const STATUS_VARIANT: Record<string, "draft" | "info" | "ready"> = { DRAFT: "draft", AI_PROPOSAL: "info", READY_TO_PUBLISH: "ready" };

export default function DemoContentPage() {
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]>("Tous");
  const { state, generateContent } = useDemoState();
  const wantedStatus = STATUS_BY_FILTER[activeFilter];
  const drafts = DEMO_DRAFTS.filter((draft) => !wantedStatus || draft.status === wantedStatus);
  return <div className="space-y-6 pt-10"><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-bold text-slate-900">Contenus</h1><p className="mt-1 text-slate-500">Brouillons, propositions IA et contenus prêts à publier</p></div><button type="button" onClick={generateContent} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white"><Plus className="size-4" /> Générer un contenu</button></div>{state.contentGenerated && <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900"><CheckCircle2 className="size-4" /> Nouveau contenu fictif généré et ajouté au parcours.</div>}<div className="flex flex-wrap gap-2">{FILTERS.map((filter) => <button type="button" key={filter} onClick={() => setActiveFilter(filter)} className={`rounded-xl px-3 py-2 text-sm font-semibold ${activeFilter === filter ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>{filter}</button>)}</div><div className="grid gap-3">{drafts.map((draft) => <Card key={draft.id} className="rounded-2xl border-slate-200"><CardContent className="flex items-start gap-4 p-4"><span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${draft.aiGenerated ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{draft.aiGenerated ? <Sparkles className="size-5" /> : <FileText className="size-5" />}</span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><p className="font-semibold text-slate-800">{draft.title ?? truncate(draft.body, 60)}</p><Badge variant={STATUS_VARIANT[draft.status] ?? "draft"}>{CONTENT_STATUS_LABELS[draft.status] ?? draft.status}</Badge></div><p className="mt-1 line-clamp-2 text-sm text-slate-500">{truncate(draft.body, 140)}</p>{draft.event && <p className="mt-2 text-xs font-semibold text-blue-600">Événement : {draft.event.title}</p>}</div></CardContent></Card>)}</div></div>;
}
