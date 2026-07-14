"use client";

import { useState } from "react";
import { BookOpen, Clock3, Loader2, ScrollText, Sparkles } from "lucide-react";
import { AgentPageBanner } from "@/components/dashboard/agent-page-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TorahDuration = "5 minutes" | "10 minutes" | "15 minutes" | "30 minutes" | "Plus de 45 minutes";

interface TorahGenerationResult {
  title: string;
  introduction: string;
  outline: string[];
  body: string;
  conclusion: string;
  sources: string[];
  note?: string;
}

const DURATIONS: TorahDuration[] = ["5 minutes", "10 minutes", "15 minutes", "30 minutes", "Plus de 45 minutes"];
const SHMOUEL_TORAH_IMAGE =
  "https://xicipkwqvuoaavvdgnnb.supabase.co/storage/v1/object/public/Image%20du%20site/Shmouel%20Torah.webp";
const DEFAULT_AUTHORIZED_SOURCES = ["chabad.org", "loubavitch.fr", "sefaria.org"];

export function TorahClient() {
  const [selectedDuration, setSelectedDuration] = useState<TorahDuration>("10 minutes");
  const [prompt, setPrompt] = useState("");
  const [sourceInput, setSourceInput] = useState("");
  const [authorizedSources, setAuthorizedSources] = useState(DEFAULT_AUTHORIZED_SOURCES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TorahGenerationResult | null>(null);

  function addAuthorizedSource() {
    const normalized = sourceInput.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
    if (!normalized || authorizedSources.includes(normalized)) return;
    setAuthorizedSources((current) => [...current, normalized]);
    setSourceInput("");
  }

  async function createCourse() {
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/torah/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration: selectedDuration,
          prompt: prompt.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "Erreur lors de la generation du cours");
      }

      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la generation du cours");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <AgentPageBanner
        eyebrow="Agent Torah"
        title="Cours de Torah IA"
        description="Choisissez la durée, le public et le sujet du cours : Shmouel structure vos contenus Torah dans une interface claire, moderne et prête à utiliser."
        icon={BookOpen}
        imageUrl={SHMOUEL_TORAH_IMAGE}
        imageAlt="Shmouel, agent IA Torah"
        bubbleTitle="Je suis Shmouel, l’agent IA responsable des cours de Torah"
        bubbleText="J’organise vos contenus Torah et je vous aide à partager les bonnes ressources au bon moment"
        tone="amber"
      />

      <Card className="rounded-3xl border-amber-200 bg-white shadow-sm">
        <CardContent className="space-y-6 p-6">
          <div>
            <div className="mb-3 h-1.5 w-10 rounded-full bg-amber-500" />
            <p className="text-lg font-semibold text-slate-900">
              Souhaitez-vous créer un cours de Torah ? En combien de temps ?
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {DURATIONS.map((duration) => {
              const active = selectedDuration === duration;
              return (
                <button
                  key={duration}
                  type="button"
                  onClick={() => setSelectedDuration(duration)}
                  className={cn(
                    "rounded-2xl border px-4 py-4 text-left transition-all duration-200",
                    active
                      ? "border-amber-400 bg-amber-50 text-amber-900 shadow-[0_14px_28px_-22px_rgba(146,64,14,0.28)]"
                      : "border-slate-200 bg-white text-slate-600 hover:border-amber-200 hover:bg-amber-50/40",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Clock3 className={cn("size-4", active ? "text-amber-700" : "text-slate-400")} />
                    <span className="text-sm font-semibold">{duration}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded-3xl border border-amber-100 bg-amber-50/40 p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-amber-700" />
              <p className="text-sm font-semibold text-slate-800">Dites-moi un peu de quoi vous voulez parler.</p>
            </div>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Exemple : Paracha, éducation, émouna, Chabbat, fêtes juives, hassidout, un sujet précis ou un public particulier…"
              className="mt-4 min-h-[220px] w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
            />
            <p className="mt-3 text-sm text-slate-500">
              L&apos;IA doit travailler uniquement à partir de chabad.org, loubavitch.fr et sefaria.org. Si elle ne
              trouve pas l&apos;information dans ces sources, elle doit le dire clairement.
            </p>

            <div className="mt-5 rounded-3xl border border-amber-100 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-black text-slate-900">Sources autorisées</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Ajoutez les sites que vous voulez voir apparaître dans votre cadre de travail.
                  </p>
                </div>
                <div className="flex w-full gap-2 sm:max-w-md">
                  <input
                    value={sourceInput}
                    onChange={(event) => setSourceInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addAuthorizedSource();
                      }
                    }}
                    placeholder="exemple.org"
                    className="min-w-0 flex-1 rounded-2xl border border-amber-200 bg-amber-50/30 px-4 py-2.5 text-sm outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
                  />
                  <Button type="button" onClick={addAuthorizedSource} className="rounded-2xl bg-amber-600 text-white hover:bg-amber-700">
                    Ajouter
                  </Button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {authorizedSources.map((source) => (
                  <button
                    key={source}
                    type="button"
                    onClick={() => setAuthorizedSources((current) => current.filter((item) => item !== source))}
                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 transition hover:border-amber-300 hover:bg-amber-100"
                    title="Retirer cette source"
                  >
                    {source}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
                Sources affichées : {authorizedSources.join(", ")}
              </div>
              <Button
                onClick={createCourse}
                disabled={loading || prompt.trim().length === 0}
                className="bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800 focus-visible:ring-amber-500"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Créer mon cours avec l&apos;IA
                  </>
                )}
              </Button>
            </div>

            {error && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-4">
          <Card className="rounded-3xl border-amber-200 bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <BookOpen className="size-5 text-amber-700" />
                <h2 className="text-2xl font-bold text-slate-900">{result.title}</h2>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-700">{result.introduction}</p>

              {result.outline.length > 0 && (
                <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
                  <div className="flex items-center gap-2">
                    <ScrollText className="size-4 text-amber-700" />
                    <p className="text-sm font-semibold text-slate-800">Plan du cours</p>
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    {result.outline.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6 whitespace-pre-wrap text-sm leading-7 text-slate-700">{result.body}</div>
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                {result.conclusion}
              </div>

              <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
                <p className="text-sm font-semibold text-slate-800">Sources mentionnées</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {result.sources.map((source) => (
                    <li key={source}>- {source}</li>
                  ))}
                </ul>
                {result.note && <p className="mt-3 text-sm text-amber-800">{result.note}</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
