"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { BookOpen, Check, ChevronDown, Clock3, Copy, FileDown, Loader2, ScrollText, Share2, Sparkles, X } from "lucide-react";
import { AgentPageBanner } from "@/components/dashboard/agent-page-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AGENT_IMAGE_URLS } from "@/lib/agents";
import { downloadTorahCoursePdf } from "@/lib/torah-pdf";

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
const SHMOUEL_TORAH_IMAGE = AGENT_IMAGE_URLS.shmouel;
const DEFAULT_AUTHORIZED_SOURCES = ["chabad.org", "loubavitch.fr", "sefaria.org"];

export function TorahClient() {
  const [selectedDuration, setSelectedDuration] = useState<TorahDuration>("10 minutes");
  const [prompt, setPrompt] = useState("");
  const [sourceInput, setSourceInput] = useState("");
  const [authorizedSources, setAuthorizedSources] = useState(DEFAULT_AUTHORIZED_SOURCES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TorahGenerationResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);

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
      setCopied(false);
      setSourcesOpen(false);
      setCourseDialogOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la generation du cours");
    } finally {
      setLoading(false);
    }
  }

  async function copyCourse() {
    if (!result) return;
    const course = [
      result.title,
      "",
      result.introduction,
      result.body,
      result.conclusion,
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      await navigator.clipboard.writeText(course);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setError("La copie du cours est impossible pour le moment.");
    }
  }

  function downloadPdf() {
    if (!result || generatingPdf) return;
    setGeneratingPdf(true);
    try {
      downloadTorahCoursePdf(result);
    } catch {
      setError("La génération du PDF est impossible pour le moment.");
    } finally {
      setGeneratingPdf(false);
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
        bubbleTitleClassName="text-slate-950"
        bubbleText="J’organise vos contenus Torah et je vous aide à partager les bonnes ressources au bon moment"
        tone="teal-dark"
        flat
      />

      <Card className="rounded-3xl border border-teal-100 bg-white shadow-[0_18px_45px_-30px_rgba(6,95,70,0.36)]">
        <CardContent className="space-y-6 p-6">
          <div>
            <div className="mb-3 h-1.5 w-10 rounded-full bg-teal-500" />
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
                      ? "border-teal-500 bg-teal-50 text-teal-950 shadow-[0_14px_28px_-22px_rgba(6,95,70,0.34)]"
                      : "border-slate-200 bg-white text-slate-600 hover:border-teal-200 hover:bg-teal-50/50",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Clock3 className={cn("size-4 transition-transform", active ? "animate-pulse text-teal-700" : "text-slate-400")} />
                    <span className="text-sm font-semibold">{duration}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded-3xl border border-teal-100 bg-teal-50/55 p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 animate-pulse text-teal-700" />
              <p className="text-sm font-semibold text-slate-800">Dites-moi un peu de quoi vous voulez parler.</p>
            </div>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Exemple : Paracha, éducation, émouna, Chabbat, fêtes juives, hassidout, un sujet précis ou un public particulier…"
              className="mt-4 min-h-[220px] w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            />
            <p className="mt-3 text-sm text-slate-500">
              L&apos;IA doit travailler uniquement à partir de chabad.org, loubavitch.fr et sefaria.org. Si elle ne
              trouve pas l&apos;information dans ces sources, elle doit le dire clairement.
            </p>

            <div className="mt-5 rounded-3xl border border-teal-100 bg-white p-4 shadow-sm">
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
                    className="min-w-0 flex-1 rounded-2xl border border-teal-200 bg-teal-50/30 px-4 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100"
                  />
                  <Button type="button" onClick={addAuthorizedSource} className="rounded-2xl bg-teal-700 text-white hover:bg-teal-800">
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
                    className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-800 transition hover:border-teal-300 hover:bg-teal-100"
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
                className="bg-teal-700 text-white hover:bg-teal-800 active:bg-teal-900 focus-visible:ring-teal-500"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4 animate-pulse" />
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

      {result && courseDialogOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[2147483647] flex items-start justify-center overflow-y-auto bg-slate-950/65 p-3 py-4 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Cours de Torah généré">
          <Card className="my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-teal-100 bg-white shadow-2xl shadow-slate-950/40 sm:max-h-[90vh]">
            <div className="flex shrink-0 items-center justify-between border-b border-teal-100 bg-[#063c37] px-4 py-3 text-white sm:px-6">
              <div className="flex min-w-0 items-center gap-2">
                <BookOpen className="size-4 shrink-0 animate-home-float text-teal-200" />
                <p className="truncate text-sm font-bold">Cours de Torah généré</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setCourseDialogOpen(false)} className="shrink-0 text-white hover:bg-white/10 hover:text-white" aria-label="Fermer le cours">
                <X className="size-5" />
              </Button>
            </div>
            <CardContent className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  <BookOpen className="size-5 shrink-0 animate-home-float text-teal-700" />
                  <h2 className="text-2xl font-bold text-slate-900">{result.title}</h2>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button type="button" variant="outline" onClick={copyCourse} className="border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100">
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    {copied ? "Copié" : "Copier"}
                  </Button>
                  <Button type="button" onClick={downloadPdf} disabled={generatingPdf} className="bg-teal-700 text-white hover:bg-teal-800">
                    {generatingPdf ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
                    PDF
                  </Button>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-700">{result.introduction}</p>

              {result.outline.length > 0 && (
                <div className="mt-6 rounded-2xl border border-teal-100 bg-teal-50/55 p-4">
                  <div className="flex items-center gap-2">
                    <ScrollText className="size-4 animate-pulse text-teal-700" />
                    <p className="text-sm font-semibold text-slate-800">Plan du cours</p>
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    {result.outline.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-teal-500" />
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

              {(result.sources.length > 0 || result.note) && (
                <div className="mt-6 overflow-hidden rounded-2xl border border-teal-100 bg-teal-50/55">
                  <button
                    type="button"
                    onClick={() => setSourcesOpen((open) => !open)}
                    aria-expanded={sourcesOpen}
                    className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-teal-100/50"
                  >
                    <span className="text-sm font-semibold text-slate-800">Sources mentionnées</span>
                    <ChevronDown className={cn("size-4 shrink-0 text-teal-800 transition-transform", sourcesOpen && "rotate-180")} />
                  </button>
                  {sourcesOpen && (
                    <div className="border-t border-teal-100 px-4 pb-4 pt-1">
                      {result.sources.length > 0 && (
                        <ul className="mt-3 space-y-2 text-sm text-slate-600">
                          {result.sources.map((source) => (
                            <li key={source}>- {source}</li>
                          ))}
                        </ul>
                      )}
                      {result.note && <p className="mt-3 text-sm text-teal-800">{result.note}</p>}
                    </div>
                  )}
                </div>
              )}

              <section className="mt-8 flex justify-end border-t border-teal-100 pt-6" aria-label="Partager ce cours">
                <Button asChild className="bg-teal-700 text-white hover:bg-teal-800">
                  <Link href="/dashboard/social-networks">
                    <Share2 className="size-4" />
                    Partager sur les reseaux
                  </Link>
                </Button>
              </section>
            </CardContent>
          </Card>
        </div>,
        document.body
      )}
    </div>
  );
}
