"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { Baby, BookOpen, CalendarDays, Check, ChevronDown, Clock3, Copy, FileDown, Globe2, GraduationCap, Loader2, Plus, ScrollText, Share2, Sparkles, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AGENT_IMAGE_URLS } from "@/lib/agents";
import { downloadTorahCoursePdf } from "@/lib/torah-pdf";

type TorahDuration = "5 minutes" | "10 minutes" | "15 minutes" | "30 minutes" | "Plus de 45 minutes";
type TorahTheme = "general" | "youth" | "children" | "event";

interface TorahGenerationResult {
  title: string;
  introduction: string;
  outline: string[];
  body: string;
  conclusion: string;
  sources: string[];
  note?: string;
}

const DURATIONS: Array<{ value: TorahDuration; short: string; color: string }> = [
  { value: "5 minutes", short: "5 min", color: "from-cyan-500 to-blue-500" },
  { value: "10 minutes", short: "10 min", color: "from-teal-500 to-emerald-500" },
  { value: "15 minutes", short: "15 min", color: "from-violet-500 to-fuchsia-500" },
  { value: "30 minutes", short: "30 min", color: "from-orange-500 to-amber-500" },
  { value: "Plus de 45 minutes", short: "+45 min", color: "from-rose-500 to-pink-600" },
];
const THEMES: Array<{ value: TorahTheme; label: string; description: string; icon: typeof Users; active: string; idle: string }> = [
  { value: "general", label: "Tout public", description: "Un cours accessible et fédérateur", icon: Users, active: "border-teal-400 bg-gradient-to-br from-[#0faeb3] to-[#078e9b] text-white shadow-teal-200", idle: "border-teal-100 bg-[#fffaf4] text-slate-700 hover:bg-teal-50" },
  { value: "youth", label: "Pour les jeunes", description: "Un ton vivant et actuel", icon: GraduationCap, active: "border-violet-400 bg-gradient-to-br from-[#7130d8] to-[#5420ad] text-white shadow-violet-200", idle: "border-violet-100 bg-[#fffaf4] text-slate-700 hover:bg-violet-50" },
  { value: "children", label: "Pour les enfants", description: "Des mots simples et des exemples", icon: Baby, active: "border-orange-400 bg-gradient-to-br from-[#ffbd17] to-[#ee9100] text-white shadow-orange-200", idle: "border-orange-100 bg-[#fffaf4] text-slate-700 hover:bg-orange-50" },
  { value: "event", label: "Événement précis", description: "Bar-mitsva, naissance, décès…", icon: CalendarDays, active: "border-rose-400 bg-gradient-to-br from-[#f64c89] to-[#d92d7c] text-white shadow-rose-200", idle: "border-rose-100 bg-[#fffaf4] text-slate-700 hover:bg-rose-50" },
];
const SHMOUEL_TORAH_IMAGE = AGENT_IMAGE_URLS.shmouel;
const DEFAULT_AUTHORIZED_SOURCES = ["chabad.org", "loubavitch.fr", "sefaria.org"];

export function TorahClient() {
  const [selectedDuration, setSelectedDuration] = useState<TorahDuration>("10 minutes");
  const [selectedTheme, setSelectedTheme] = useState<TorahTheme>("general");
  const [eventContext, setEventContext] = useState("");
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
    if (selectedTheme === "event" && !eventContext.trim()) {
      setError("Précisez l’événement auquel le cours doit être adapté.");
      return;
    }
    if (authorizedSources.length === 0) {
      setError("Conservez ou ajoutez au moins une source autorisée.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/torah/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration: selectedDuration,
          prompt: prompt.trim(),
          theme: selectedTheme,
          eventContext: eventContext.trim(),
          authorizedSources,
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
    <div className="space-y-5 sm:space-y-6">
      <section className="relative min-h-[11rem] overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_72%_12%,#7028bd_0%,#421388_45%,#210763_100%)] px-5 py-5 text-white shadow-[0_24px_58px_rgba(49,13,108,0.26)] sm:min-h-[17rem] sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -right-8 -top-12 size-48 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 size-52 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="relative z-10 max-w-[68%] sm:max-w-3xl">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white/15 text-white shadow-lg ring-1 ring-white/20 sm:size-12"><BookOpen className="size-6" /></span>
          <h1 className="mt-4 text-[clamp(2rem,9vw,2.75rem)] font-black uppercase leading-[1.02] tracking-[-0.045em] sm:mt-5 sm:text-4xl">Cours de Torah IA</h1>
          <p className="mt-3 hidden max-w-2xl text-base font-semibold leading-7 text-white/85 sm:block sm:text-lg">Shmouel structure un cours adapté à votre public, votre sujet et votre temps.</p>
        </div>
        <Image src={SHMOUEL_TORAH_IMAGE} alt="Shmouel, agent IA Torah" width={240} height={280} className="pointer-events-none absolute -bottom-3 -right-5 z-10 h-[10.5rem] w-auto object-contain object-bottom drop-shadow-[0_18px_24px_rgba(12,2,35,0.34)] sm:-right-2 sm:h-[16rem]" priority />
      </section>

      <Card className="overflow-hidden rounded-[2rem] border border-violet-100 bg-white shadow-[0_18px_46px_rgba(66,19,136,0.09)]">
        <CardContent className="space-y-4 p-4 sm:space-y-5 sm:p-6">
          <div className="relative overflow-hidden rounded-[1.6rem] border border-violet-100 bg-[#fbf8ff] p-5 shadow-[0_14px_34px_rgba(66,19,136,0.09)] sm:p-6">
            <div className="pointer-events-none absolute -right-12 -top-16 size-40 rounded-full bg-violet-200/45 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-16 left-1/3 size-32 rounded-full bg-teal-100/70 blur-2xl" />
            <div className="relative flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#421388] text-white shadow-lg shadow-violet-200"><Sparkles className="size-6" /></span>
              <div><p className="text-base font-black uppercase tracking-[0.12em] text-[#6b2ac8]">Préparons votre cours</p><h2 className="mt-1 text-2xl font-black uppercase leading-tight text-slate-950 sm:text-3xl">Un contenu adapté à votre temps et à votre public</h2></div>
            </div>
          </div>

          <section className="rounded-[1.6rem] border border-cyan-100 bg-[#fffaf4] p-4 shadow-[0_12px_30px_rgba(8,167,173,0.07)] sm:p-5">
            <div className="flex items-center gap-3"><Clock3 className="size-7 shrink-0 text-teal-700" /><h3 className="text-lg font-black uppercase tracking-wide text-slate-950 sm:text-xl">Durée souhaitée</h3></div>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {DURATIONS.map((duration) => {
              const active = selectedDuration === duration.value;
              return (
                <button
                  key={duration.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedDuration(duration.value)}
                  className={cn(
                    "relative min-h-16 overflow-hidden rounded-xl border px-2 py-3 text-center text-base font-black transition sm:min-h-[4.5rem] sm:rounded-2xl sm:text-lg",
                    active ? `border-transparent bg-gradient-to-r ${duration.color} text-white shadow-md` : "border-slate-200 bg-slate-50 text-slate-600 hover:border-teal-200",
                  )}
                >
                  {active ? <Check className="absolute right-1.5 top-1.5 size-3.5" /> : null}
                  {duration.short}
                </button>
              );
            })}
            </div>
          </section>

          <section className="rounded-[1.6rem] border border-violet-100 bg-[#fffaf4] p-4 shadow-[0_12px_30px_rgba(66,19,136,0.07)] sm:p-5">
            <div className="flex items-center gap-3"><Users className="size-7 shrink-0 text-violet-700" /><h3 className="text-lg font-black uppercase tracking-wide text-slate-950 sm:text-xl">À qui s’adresse le cours ?</h3></div>
            <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
              {THEMES.map((theme) => {
                const active = selectedTheme === theme.value;
                const Icon = theme.icon;
                return <button key={theme.value} type="button" aria-pressed={active} onClick={() => { setSelectedTheme(theme.value); setError(null); }} className={cn("min-h-28 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5", active ? `${theme.active} shadow-lg` : theme.idle)}><span className="flex items-start justify-between gap-2"><span className="flex size-11 items-center justify-center rounded-xl bg-white text-[#421388] shadow-sm"><Icon className="size-6" /></span>{active ? <Check className="size-5" /> : null}</span><span className="mt-3 block text-lg font-black uppercase leading-tight tracking-wide">{theme.label}</span></button>;
              })}
            </div>
            {selectedTheme === "event" ? <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-4"><label htmlFor="torah-event-context" className="text-base font-black uppercase tracking-wide text-rose-900">Quel événement ?</label><textarea id="torah-event-context" value={eventContext} onChange={(event) => setEventContext(event.target.value)} rows={3} placeholder="Ex. Bar-mitsva de David, naissance, mariage, anniversaire d’un décès…" className="mt-2 w-full resize-y rounded-xl border border-rose-200 bg-white px-4 py-3 text-base leading-7 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-100" /></div> : null}
          </section>

          <div className="rounded-[1.6rem] border border-teal-100 bg-gradient-to-br from-[#f0fffc] to-[#effcff] p-4 shadow-[0_12px_30px_rgba(8,124,118,0.07)] sm:p-5">
            <div className="flex items-center gap-2">
              <BookOpen className="size-7 shrink-0 text-teal-700" />
              <p className="text-lg font-black uppercase tracking-wide text-slate-950 sm:text-xl">Sujet du cours</p>
            </div>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              className="mt-3 min-h-40 w-full resize-y rounded-2xl border border-teal-200 bg-white px-4 py-4 text-base font-medium leading-7 text-slate-800 outline-none transition placeholder:text-slate-500 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 sm:min-h-44 sm:text-lg"
            />

            <div className="mt-4 rounded-3xl border border-violet-100 bg-[#fffaf4] p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><Globe2 className="size-5" /></span>
                  <div><p className="text-lg font-black uppercase tracking-wide text-slate-950">Sources autorisées</p><p className="mt-1 text-base font-medium leading-6 text-slate-600">Les trois sources fiables sont actives par défaut. Retirez-les ou ajoutez vos propres sites.</p></div>
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
                    className="min-w-0 flex-1 rounded-xl border border-violet-200 bg-violet-50/40 px-3 py-3 text-base font-medium outline-none transition placeholder:text-slate-500 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100"
                  />
                  <Button type="button" size="icon" onClick={addAuthorizedSource} className="size-11 shrink-0 rounded-xl bg-gradient-to-br from-[#7130d8] to-[#5420ad] text-white shadow-md shadow-violet-200 hover:brightness-105" aria-label="Ajouter la source">
                    <Plus className="size-5" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {authorizedSources.map((source) => <span key={source} className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 py-1.5 pl-3 pr-1.5 text-base font-bold text-violet-800"><span className="max-w-44 truncate">{source}</span><button type="button" onClick={() => setAuthorizedSources((current) => current.filter((item) => item !== source))} className="flex size-8 items-center justify-center rounded-full bg-white text-violet-500 transition hover:bg-rose-100 hover:text-rose-600" aria-label={`Retirer ${source}`}><X className="size-4" /></button></span>)}
                {authorizedSources.length === 0 ? <span className="text-base font-bold text-rose-700">Ajoutez au moins une source.</span> : null}
              </div>
            </div>

            <div className="relative mt-4 flex flex-col gap-3 overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_80%_0%,#7028bd_0%,#421388_48%,#210763_100%)] p-4 text-white shadow-lg shadow-violet-200 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-base sm:text-lg"><p className="font-black uppercase tracking-wide">{selectedDuration} · {THEMES.find((theme) => theme.value === selectedTheme)?.label}</p><p className="mt-1 text-base font-medium text-violet-100">{authorizedSources.length} source{authorizedSources.length > 1 ? "s" : ""} autorisée{authorizedSources.length > 1 ? "s" : ""}</p></div>
              <Button
                onClick={createCourse}
                disabled={loading || prompt.trim().length < 10 || authorizedSources.length === 0}
                className="min-h-14 w-full rounded-2xl bg-gradient-to-r from-[#ffbd17] to-[#f06b45] px-5 text-base font-black text-white shadow-lg shadow-violet-950/30 hover:brightness-110 sm:w-auto sm:text-lg"
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
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-base font-semibold leading-6 text-red-700">
                {error}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {result && courseDialogOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[2147483647] flex items-start justify-center overflow-y-auto bg-slate-950/65 p-3 py-4 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Cours de Torah généré">
          <Card className="my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-violet-100 bg-[#fffaf4] shadow-[0_28px_80px_rgba(33,7,99,0.4)] sm:max-h-[90vh]">
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[radial-gradient(circle_at_80%_0%,#7028bd_0%,#421388_48%,#210763_100%)] px-4 py-3 text-white sm:px-6">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20"><BookOpen className="size-4 text-white" /></span>
                <p className="truncate text-base font-black uppercase tracking-wide">Cours de Torah généré</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setCourseDialogOpen(false)} className="shrink-0 text-white hover:bg-white/10 hover:text-white" aria-label="Fermer le cours">
                <X className="size-5" />
              </Button>
            </div>
            <CardContent className="min-h-0 flex-1 overflow-y-auto bg-white p-4 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ffbd17] to-[#ee9100] text-white shadow-lg shadow-amber-200"><BookOpen className="size-5" /></span>
                  <h2 className="text-2xl font-black uppercase leading-tight tracking-tight text-slate-950 sm:text-3xl">{result.title}</h2>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button type="button" variant="outline" onClick={copyCourse} className="min-h-11 rounded-xl border-blue-200 bg-blue-50 text-base font-black text-blue-700 hover:bg-blue-100">
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    {copied ? "Copié" : "Copier"}
                  </Button>
                  <Button type="button" onClick={downloadPdf} disabled={generatingPdf} className="min-h-11 rounded-xl bg-gradient-to-br from-[#7130d8] to-[#5420ad] text-base font-black text-white shadow-md shadow-violet-200 hover:brightness-105">
                    {generatingPdf ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
                    PDF
                  </Button>
                </div>
              </div>
              <p className="mt-5 text-lg font-medium leading-8 text-slate-800">{result.introduction}</p>

              {result.outline.length > 0 && (
                <div className="mt-6 rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <ScrollText className="size-4 text-amber-700" />
                    <p className="text-lg font-black uppercase tracking-wide text-slate-950">Plan du cours</p>
                  </div>
                  <ul className="mt-3 space-y-2 text-lg font-medium leading-8 text-slate-800">
                    {result.outline.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6 whitespace-pre-wrap text-lg font-medium leading-8 text-slate-800">{result.body}</div>
              <div className="mt-6 rounded-2xl border border-violet-100 bg-[#fffaf4] px-4 py-4 text-lg font-semibold leading-8 text-slate-800 shadow-sm">
                {result.conclusion}
              </div>

              {(result.sources.length > 0 || result.note) && (
                <div className="mt-6 overflow-hidden rounded-2xl border border-violet-100 bg-violet-50/55">
                  <button
                    type="button"
                    onClick={() => setSourcesOpen((open) => !open)}
                    aria-expanded={sourcesOpen}
                    className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-violet-100/60"
                  >
                    <span className="text-base font-black uppercase tracking-wide text-slate-900">Sources mentionnées</span>
                    <ChevronDown className={cn("size-4 shrink-0 text-violet-800 transition-transform", sourcesOpen && "rotate-180")} />
                  </button>
                  {sourcesOpen && (
                    <div className="border-t border-violet-100 px-4 pb-4 pt-1">
                      {result.sources.length > 0 && (
                        <ul className="mt-3 space-y-2 text-base font-medium leading-7 text-slate-700">
                          {result.sources.map((source) => (
                            <li key={source}>- {source}</li>
                          ))}
                        </ul>
                      )}
                      {result.note && <p className="mt-3 text-base font-medium leading-7 text-violet-900">{result.note}</p>}
                    </div>
                  )}
                </div>
              )}

              <section className="mt-8 flex justify-end border-t border-violet-100 pt-6" aria-label="Partager ce cours">
                <Button asChild className="min-h-12 rounded-xl bg-gradient-to-r from-[#7130d8] to-[#d92d7c] px-5 text-base font-black text-white shadow-lg shadow-violet-200 hover:brightness-105">
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
