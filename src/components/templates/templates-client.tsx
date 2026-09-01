"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import {
  ArrowLeft,
  Check,
  Download,
  Library,
  Loader2,
  Sparkles,
} from "lucide-react";
import { UpgradeModal } from "@/components/billing/upgrade-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { BillingConfig, BillingUsage } from "@/lib/billing";
import {
  PosterGallery,
  posterTemplateImage,
  type PosterGalleryTemplate,
} from "./poster-gallery";

type Template = PosterGalleryTemplate;

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
  initialTemplateId?: string;
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
  initialTemplateId,
}: Props) {
  const freePosterAlreadyUsed = plan === "FREE_TRIAL" && billingUsage.posterGenerations >= 1;
  const initialTemplate = initialTemplateId ? templates.find((template) => template.id === initialTemplateId) ?? null : null;
  const initialTemplateLocked = Boolean(
    initialTemplate && (freePosterAlreadyUsed || (plan === "FREE_TRIAL" && initialTemplate.isPremium))
  );
  const [step, setStep] = useState<Step>(initialTemplate && !initialTemplateLocked ? "request" : "gallery");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    initialTemplate && !initialTemplateLocked ? initialTemplate : null
  );
  const [requestText, setRequestText] = useState("");
  const [brief, setBrief] = useState<PosterBrief | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generatedAsset, setGeneratedAsset] = useState<GeneratedAsset | null>(null);
  const [savingLibrary, setSavingLibrary] = useState(false);
  const [librarySaved, setLibrarySaved] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [upgradeOpen, setUpgradeOpen] = useState(initialTemplateLocked);

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
      <>
        {modal}
        <PosterGallery
          templates={templates}
          onSelect={selectTemplate}
          getStatus={(template) => {
            const locked = freePosterAlreadyUsed || (plan === "FREE_TRIAL" && template.isPremium);
            return {
              label: locked ? "Réservée" : "Personnaliser",
              className: locked ? "text-amber-700" : "text-[#d92d7c]",
            };
          }}
          galleryTitle={galleryTitle}
          gallerySubtitle={gallerySubtitle}
          showGalleryFilters={showGalleryFilters}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
        />
      </>
    );
  }

  if (!selectedTemplate) return null;
  const sourceImage = posterTemplateImage(selectedTemplate);

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
