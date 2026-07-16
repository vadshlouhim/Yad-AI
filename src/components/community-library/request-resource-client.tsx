"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import {
  RESOURCE_CATEGORIES,
  RESOURCE_THEMES,
  URGENCY_LABELS,
  type ResourceCategory,
  type ResourceTheme,
  type RequestUrgency,
} from "@/lib/community-library";

interface FormState {
  title: string;
  description: string;
  category: ResourceCategory;
  theme: ResourceTheme;
  urgency: RequestUrgency;
}

export function RequestResourceClient() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    title: "",
    description: "",
    category: "Cours",
    theme: "Torah",
    urgency: "medium",
  });
  const [refining, setRefining] = useState(false);
  const [aiRefined, setAiRefined] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const set = (key: keyof FormState) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleRefine = async () => {
    if (!form.title || !form.description) return;
    setRefining(true);
    try {
      const res = await fetch("/api/community-library/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refine", ...form }),
      });
      const data = await res.json();
      if (data.refined) {
        setForm((f) => ({
          ...f,
          title: data.refined.title ?? f.title,
          description: data.refined.description ?? f.description,
        }));
        setAiRefined(true);
      }
    } finally {
      setRefining(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.title || !form.description) { setError("Veuillez remplir le titre et la description."); return; }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/community-library/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", ...form, aiRefined }),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push("/dashboard/community-library"), 2000);
      } else {
        const data = await res.json();
        setError(data.error ?? "Une erreur est survenue");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-16 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-teal-50">
          <CheckCircle className="size-10 text-teal-600" />
        </div>
        <h2 className="mt-4 text-xl font-black text-slate-900">Demande envoyée !</h2>
        <p className="mt-2 text-sm text-slate-500">Les membres de votre communauté pourront y répondre. Redirection…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 sm:px-6">
      <div className="rounded-3xl bg-[#063c37] p-5 text-white shadow-[0_18px_45px_-30px_rgba(6,95,70,0.60)] sm:p-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="rounded-xl border border-white/15 bg-white/10 p-2 hover:bg-white/20">
            <ArrowLeft className="size-4 text-white" />
          </button>
          <div className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-teal-100"><MessageCircle className="size-5 animate-pulse" /></div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-200">Bibliothèque communautaire</p>
            <h1 className="mt-1 text-xl font-black">Faire une demande</h1>
            <p className="mt-1 text-sm text-white/75">Décrivez la ressource dont votre communauté a besoin</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-teal-100 bg-white p-6 shadow-[0_18px_45px_-30px_rgba(6,95,70,0.28)]">
        {/* Titre */}
        <div className="mb-4">
          <label className="mb-1 block text-xs font-semibold text-slate-700">Titre de la demande *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set("title")(e.target.value)}
            placeholder="Ex : Discours de Bar-Mitsva en français pour jeunes adultes"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="mb-1 block text-xs font-semibold text-slate-700">Description *</label>
          <textarea
            value={form.description}
            onChange={(e) => set("description")(e.target.value)}
            placeholder="Décrivez en détail le type de ressource dont vous avez besoin, le contexte, le public cible…"
            rows={4}
            className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
        </div>

        {/* Catégorie + Thème */}
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Catégorie *</label>
            <select
              value={form.category}
              onChange={(e) => set("category")(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
            >
              {RESOURCE_CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Thème *</label>
            <select
              value={form.theme}
              onChange={(e) => set("theme")(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
            >
              {RESOURCE_THEMES.map((th) => <option key={th}>{th}</option>)}
            </select>
          </div>
        </div>

        {/* Urgence */}
        <div className="mb-5">
          <label className="mb-2 block text-xs font-semibold text-slate-700">Urgence</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            {(["low", "medium", "high"] as RequestUrgency[]).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => set("urgency")(u)}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${form.urgency === u
                  ? u === "high" ? "bg-rose-500 text-white" : u === "medium" ? "bg-amber-500 text-white" : "bg-slate-500 text-white"
                  : "border border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {URGENCY_LABELS[u]}
              </button>
            ))}
          </div>
        </div>

        {/* Affiner avec IA */}
        <button
          type="button"
          onClick={handleRefine}
          disabled={refining || !form.title || !form.description}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 py-2.5 text-sm font-semibold text-teal-800 hover:bg-teal-100 disabled:opacity-50"
        >
          <Sparkles className="size-4" />
          {refining ? "Affinement en cours…" : aiRefined ? "Réaffiner avec l'IA" : "Affiner la demande avec l'IA"}
        </button>

        {aiRefined && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800">
            <Sparkles className="size-3.5" /> Demande affinée par l&apos;assistant IA
          </div>
        )}

        {error && (
          <p className="mb-3 text-sm font-semibold text-red-600">{error}</p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !form.title || !form.description}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-700 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
          >
            <MessageCircle className="size-4" />
            {submitting ? "Envoi…" : "Soumettre la demande"}
          </button>
        </div>
      </div>
    </div>
  );
}
