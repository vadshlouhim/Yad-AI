"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Download,
  ImageIcon,
  Library,
  Loader2,
  Paintbrush,
  Search,
  Sparkles,
} from "lucide-react";
import { UpgradeModal } from "@/components/billing/upgrade-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { BillingConfig, BillingUsage } from "@/lib/billing";
import { CATEGORY_EMOJI, CATEGORY_LABELS } from "@/lib/templates/shared";
import { cn } from "@/lib/utils";

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  subCategory: string | null;
  originalUrl: string | null;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  isGlobal: boolean;
  isPremium: boolean;
  tags: string[];
  usageCount: number;
}

interface Community {
  id: string;
  name: string;
  city: string | null;
  logoUrl: string | null;
  tone: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  religiousStream: string | null;
  timezone?: string | null;
  plan: string;
}

interface Props {
  templates: Template[];
  community: Community;
  shabbatTimes: unknown;
  plan: string;
  billingConfig: BillingConfig;
  billingUsage: BillingUsage;
  galleryTitle?: string;
  gallerySubtitle?: string;
  showGalleryFilters?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

interface PosterChange {
  label: string;
  currentText: string;
  newText: string;
}

interface PosterBrief {
  summary: string;
  changes: PosterChange[];
  textsToRemove: string[];
  editPrompt: string;
  unchangedElements: string[];
  missingInformation: string[];
}

interface GeneratedAsset {
  imageUrl: string;
  storagePath: string;
  size: number;
  width: number | null;
  height: number | null;
}

type Step = "gallery" | "request" | "confirm" | "preview";

const CATEGORY_TONES = [
  "border-blue-300 bg-blue-50 text-blue-700",
  "border-teal-300 bg-teal-50 text-teal-700",
  "border-amber-300 bg-amber-50 text-amber-800",
  "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700",
  "border-violet-300 bg-violet-50 text-violet-700",
  "border-rose-300 bg-rose-50 text-rose-700",
];

function templateImage(template: Template) {
  return template.previewUrl ?? template.thumbnailUrl ?? template.originalUrl;
}

export function TemplatesClient({
  templates,
  plan,
  billingConfig,
  billingUsage,
  galleryTitle = "BANQUE D'AFFICHES",
  gallerySubtitle = "Choisissez une affiche et décrivez simplement les textes à modifier.",
  showGalleryFilters = true,
  emptyTitle = "Aucune affiche trouvée",
  emptyDescription = "Modifiez votre recherche ou choisissez une autre catégorie.",
}: Props) {
  const [step, setStep] = useState<Step>("gallery");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [requestText, setRequestText] = useState("");
  const [brief, setBrief] = useState<PosterBrief | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generatedAsset, setGeneratedAsset] = useState<GeneratedAsset | null>(null);
  const [savingLibrary, setSavingLibrary] = useState(false);
  const [librarySaved, setLibrarySaved] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const categories = useMemo(() => [...new Set(templates.map((template) => template.category))], [templates]);
  const filteredTemplates = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("fr");
    return templates.filter((template) => {
      if (category && template.category !== category) return false;
      if (!needle) return true;
      return [template.name, template.description ?? "", template.subCategory ?? "", ...(template.tags ?? [])]
        .join(" ")
        .toLocaleLowerCase("fr")
        .includes(needle);
    });
  }, [category, search, templates]);

  const freePosterAlreadyUsed = plan === "FREE_TRIAL" && billingUsage.posterGenerations >= 1;

  function selectTemplate(template: Template) {
    if (freePosterAlreadyUsed || (plan === "FREE_TRIAL" && template.isPremium)) {
      setUpgradeOpen(true);
      return;
    }
    setSelectedTemplate(template);
    setRequestText("");
    setBrief(null);
    setGeneratedImageUrl(null);
    setGeneratedAsset(null);
    setLibrarySaved(false);
    setActionMessage("");
    setError("");
    setStep("request");
  }

  async function analyzeRequest() {
    if (!selectedTemplate || !requestText.trim()) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/templates/analyze-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: selectedTemplate.id, request: requestText.trim() }),
      });
      const data = (await response.json()) as PosterBrief & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Gemini n'a pas pu comprendre la demande.");
      if (!Array.isArray(data.changes) || data.changes.length === 0) {
        throw new Error("Aucune modification précise n'a été identifiée. Indiquez les textes à remplacer.");
      }
      setBrief(data);
      setStep("confirm");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Analyse impossible.");
    } finally {
      setLoading(false);
    }
  }

  function updateChange(index: number, patch: Partial<PosterChange>) {
    setBrief((current) =>
      current
        ? {
            ...current,
            changes: current.changes.map((change, changeIndex) =>
              changeIndex === index ? { ...change, ...patch } : change
            ),
          }
        : current
    );
  }

  async function generatePoster() {
    if (!selectedTemplate || !brief) return;
    const changes = brief.changes.filter((change) => change.label.trim() && change.newText.trim());
    if (changes.length === 0 || brief.missingInformation.length > 0) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/templates/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          changes,
          textsToRemove: brief.textsToRemove,
          editPrompt: brief.editPrompt,
          resolution: "1k",
        }),
      });
      const data = (await response.json()) as {
        imageUrl?: string;
        storagePath?: string;
        size?: number;
        width?: number | null;
        height?: number | null;
        error?: string;
        code?: string;
      };
      if (!response.ok) {
        if (data.code === "PAYWALL_REQUIRED") {
          setUpgradeOpen(true);
          return;
        }
        throw new Error(data.error ?? "Le moteur d'image n'a pas pu personnaliser l'affiche.");
      }
      if (!data.imageUrl || !data.storagePath) throw new Error("Aucune image personnalisée n'a été renvoyée.");
      setGeneratedImageUrl(data.imageUrl);
      setGeneratedAsset({
        imageUrl: data.imageUrl,
        storagePath: data.storagePath,
        size: data.size ?? 0,
        width: data.width ?? null,
        height: data.height ?? null,
      });
      setLibrarySaved(false);
      setActionMessage("");
      setStep("preview");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Modification impossible.");
    } finally {
      setLoading(false);
    }
  }

  async function saveToLibrary() {
    if (!selectedTemplate || !brief || !generatedAsset || librarySaved) return;
    setSavingLibrary(true);
    setError("");
    setActionMessage("");
    try {
      const response = await fetch("/api/templates/save-to-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          storagePath: generatedAsset.storagePath,
          size: generatedAsset.size,
          width: generatedAsset.width,
          height: generatedAsset.height,
          changes: brief.changes,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Enregistrement impossible.");
      setLibrarySaved(true);
      setActionMessage("L'affiche est enregistrée dans votre bibliothèque personnelle.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Enregistrement impossible.");
    } finally {
      setSavingLibrary(false);
    }
  }

  const modal = (
    <UpgradeModal
      open={upgradeOpen}
      onClose={() => setUpgradeOpen(false)}
      config={billingConfig}
      featureLabel="Affiches"
      title="Débloquez toutes les affiches"
      description="Le mode gratuit permet de modifier une seule affiche."
    />
  );

  if (step === "gallery") {
    return (
      <div className="space-y-7">
        {modal}
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_78%_8%,#8037ce_0%,#421388_48%,#210763_100%)] px-5 py-6 text-white shadow-[0_24px_58px_rgba(49,13,108,0.26)] sm:px-8 sm:py-8">
          <div className="pointer-events-none absolute -right-10 -top-16 size-52 rounded-full bg-fuchsia-300/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/4 size-48 rounded-full bg-amber-300/10 blur-3xl" />
          <div className="relative z-10 flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white shadow-lg ring-1 ring-white/20">
              <Paintbrush className="size-6" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-white/70">Banque visuelle</p>
              <h1 className="mt-1 text-[clamp(1.8rem,8vw,2.6rem)] font-black leading-none tracking-[-0.04em]">
                {galleryTitle}
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/80">{gallerySubtitle}</p>
              <span className="mt-4 inline-flex rounded-full bg-white/15 px-3 py-1.5 text-xs font-black ring-1 ring-white/20">
                {templates.length} affiches disponibles
              </span>
            </div>
          </div>
        </section>

        {showGalleryFilters ? (
          <Card className="overflow-hidden rounded-[2rem] border-violet-100 bg-[#fffaf4] shadow-[0_16px_42px_rgba(66,19,136,0.08)]">
            <CardContent className="space-y-5 p-4 sm:p-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#d92d7c]">Explorez les thèmes</p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">Trouvez l&apos;affiche idéale</h2>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher une affiche..."
                  className="w-full rounded-2xl border border-violet-100 bg-white py-3.5 pl-10 pr-4 text-sm shadow-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => setCategory(null)}
                  className={cn(
                    "min-h-12 rounded-2xl border px-3 text-sm font-black transition",
                    category === null
                      ? "border-[#421388] bg-gradient-to-r from-[#7130d8] to-[#421388] text-white shadow-lg shadow-violet-200"
                      : "border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
                  )}
                >
                  Toutes <span className="ml-1 opacity-70">{templates.length}</span>
                </button>
                {categories.map((item, index) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={cn(
                      "min-h-12 rounded-2xl border px-3 text-sm font-black transition hover:-translate-y-0.5",
                      category === item
                        ? "border-[#421388] bg-gradient-to-r from-[#7130d8] to-[#421388] text-white shadow-lg shadow-violet-200"
                        : CATEGORY_TONES[index % CATEGORY_TONES.length]
                    )}
                  >
                    {CATEGORY_EMOJI[item] ?? "🖼️"} {CATEGORY_LABELS[item] ?? item}{" "}
                    <span className="ml-1 opacity-70">
                      {templates.filter((template) => template.category === item).length}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-slate-500">
              <ImageIcon className="mx-auto size-12" />
              <p className="mt-3 font-semibold">{emptyTitle}</p>
              <p className="mt-1 text-sm">{emptyDescription}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
            {filteredTemplates.map((template) => {
              const image = templateImage(template);
              const locked = freePosterAlreadyUsed || (plan === "FREE_TRIAL" && template.isPremium);
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => selectTemplate(template)}
                  className="group overflow-hidden rounded-[1.4rem] border border-violet-100 bg-white text-left shadow-[0_10px_28px_rgba(66,19,136,0.08)] transition hover:-translate-y-1 hover:border-violet-300 hover:shadow-[0_18px_38px_rgba(66,19,136,0.14)] sm:rounded-[1.6rem]"
                >
                  <div className="aspect-[3/4] overflow-hidden bg-[#f7f3ee] p-1.5 sm:p-2">
                    {image ? (
                      <img src={image} alt={template.name} className="h-full w-full rounded-[1rem] object-contain transition duration-300 group-hover:scale-[1.015]" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageIcon className="size-10 text-slate-300" />
                      </div>
                    )}
                  </div>
                  <div className="p-3 sm:p-4">
                    <span className="inline-flex rounded-full bg-violet-50 px-2 py-1 text-[10px] font-black uppercase text-violet-700">
                      {CATEGORY_LABELS[template.category] ?? template.category}
                    </span>
                    <p className="mt-2 line-clamp-2 text-sm font-black text-slate-900">{template.name}</p>
                    <p className={cn("mt-1 text-xs font-semibold", locked ? "text-amber-700" : "text-[#d92d7c]")}>
                      {locked ? "Réservée" : "Personnaliser"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (!selectedTemplate) return null;
  const sourceImage = templateImage(selectedTemplate);

  if (step === "request") {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        {modal}
        <Button variant="ghost" onClick={() => setStep("gallery")} className="rounded-xl font-black text-violet-700 hover:bg-violet-50">
          <ArrowLeft className="mr-2 size-4" />
          Retour aux affiches
        </Button>
        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <Card className="overflow-hidden rounded-[2rem] border-violet-100 bg-[#f7f3ee] p-2 shadow-[0_16px_40px_rgba(66,19,136,0.1)]">
            {sourceImage ? <img src={sourceImage} alt={selectedTemplate.name} className="w-full rounded-[1.5rem] object-contain" /> : null}
          </Card>
          <Card className="overflow-hidden rounded-[2rem] border-violet-100 bg-white shadow-[0_16px_40px_rgba(66,19,136,0.09)]">
            <CardContent className="space-y-5 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7130d8] to-[#d92d7c] text-white shadow-lg shadow-violet-200">
                  <Sparkles className="size-5" />
                </span>
                <div>
                  <h1 className="mt-1 text-2xl font-black text-slate-900">Que souhaitez-vous afficher ?</h1>
                </div>
              </div>
              <textarea
                value={requestText}
                onChange={(event) => setRequestText(event.target.value)}
                rows={8}
                maxLength={4000}
                className="w-full resize-y rounded-2xl border border-violet-100 bg-[#fffaf4] px-4 py-3 text-sm leading-6 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              />
              {error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
              <Button
                onClick={() => void analyzeRequest()}
                disabled={loading || !requestText.trim()}
                className="min-h-12 w-full rounded-2xl bg-gradient-to-r from-[#7130d8] via-[#5c24ad] to-[#d92d7c] font-black text-white shadow-lg shadow-violet-200 hover:brightness-105"
              >
                {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}
                {loading ? "Analyse..." : "Créer"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === "confirm" && brief) {
    const blocked = brief.missingInformation.length > 0 || brief.changes.some((change) => !change.newText.trim());
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        {modal}
        <Button variant="ghost" onClick={() => setStep("request")} className="rounded-xl font-black text-violet-700 hover:bg-violet-50">
          <ArrowLeft className="mr-2 size-4" />
          Modifier ma demande
        </Button>
        <Card className="overflow-hidden rounded-[2rem] border-violet-100 bg-white shadow-[0_18px_46px_rgba(66,19,136,0.09)]">
          <CardContent className="space-y-6 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#16b86b] to-[#078e50] text-white shadow-lg shadow-emerald-200">
                <Check className="size-5" />
              </span>
              <div>
                <h1 className="mt-1 text-2xl font-black text-slate-900">Vérifiez les textes</h1>
              </div>
            </div>

            <div className="space-y-3">
              {brief.changes.map((change, index) => (
                <div
                  key={`${change.label}-${index}`}
                  className="grid gap-3 rounded-2xl border border-violet-100 bg-[#fffaf4] p-4 md:grid-cols-[180px_1fr]"
                >
                  <input
                    value={change.label}
                    onChange={(event) => updateChange(index, { label: event.target.value })}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold"
                    aria-label="Type de modification"
                  />
                  <input
                    value={change.newText}
                    onChange={(event) => updateChange(index, { newText: event.target.value })}
                    className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold"
                    aria-label="Nouveau texte"
                  />
                </div>
              ))}
            </div>

            {brief.missingInformation.length > 0 ? (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                {brief.missingInformation.map((item) => (
                  <p key={item} className="mt-1">
                    • {item}
                  </p>
                ))}
                <Button variant="outline" className="mt-3" onClick={() => setStep("request")}>
                  Compléter
                </Button>
              </div>
            ) : null}

            {error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

            <Button
              onClick={() => void generatePoster()}
              disabled={loading || blocked}
              className="min-h-14 w-full rounded-2xl bg-gradient-to-r from-[#16b86b] to-[#078e50] text-base font-black text-white shadow-lg shadow-emerald-200 hover:brightness-105"
            >
              {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}
              {loading ? "Génération..." : "Générer l'affiche"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "preview" && generatedImageUrl) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => setStep("confirm")} className="rounded-xl font-black text-violet-700 hover:bg-violet-50">
            <ArrowLeft className="mr-2 size-4" />
            Retour
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => window.open(generatedImageUrl, "_blank", "noopener,noreferrer")}
              className="rounded-xl border-blue-200 bg-blue-50 font-black text-blue-700 hover:bg-blue-100"
            >
              <Download className="mr-2 size-4" />
              Télécharger
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden rounded-[2rem] border-emerald-200 bg-emerald-50/40 shadow-[0_18px_42px_rgba(16,185,129,0.14)]">
          <CardContent className="p-3">
            <img src={generatedImageUrl} alt="Affiche personnalisée" className="w-full rounded-[1.5rem] object-contain" />
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-[2rem] border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 shadow-[0_14px_36px_rgba(66,19,136,0.08)]">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-black text-violet-950">Souhaitez-vous conserver cette création ?</p>
              <p className="mt-1 text-sm text-violet-800">
                Enregistrez-la dans votre bibliothèque personnelle pour la retrouver, la télécharger ou la partager plus tard.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => void saveToLibrary()}
                disabled={savingLibrary || librarySaved}
                className="rounded-xl bg-gradient-to-r from-[#7130d8] to-[#d92d7c] font-black text-white shadow-lg shadow-violet-200 hover:brightness-105"
              >
                {savingLibrary ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Library className="mr-2 size-4" />}
                {librarySaved ? "Enregistrée" : "Enregistrer"}
              </Button>
              {librarySaved ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    window.location.href = "/dashboard/media-library";
                  }}
                  className="rounded-xl border-violet-200 bg-white font-black text-violet-700"
                >
                  Voir mes créations
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {actionMessage ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{actionMessage}</p> : null}
        {error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      </div>
    );
  }

  return null;
}
