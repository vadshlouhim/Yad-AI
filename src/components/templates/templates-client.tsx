"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import { ArrowLeft, Check, Download, ImageIcon, Library, Loader2, Paintbrush, Search, Share2, Sparkles } from "lucide-react";
import { AgentPageBanner } from "@/components/dashboard/agent-page-banner";
import { UpgradeModal } from "@/components/billing/upgrade-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { BillingConfig, BillingUsage } from "@/lib/billing";
import { AGENT_IMAGE_URLS } from "@/lib/agents";
import { CATEGORY_EMOJI, CATEGORY_LABELS } from "@/lib/templates/shared";

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
      const data = await response.json() as PosterBrief & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Gemini n’a pas pu comprendre la demande.");
      if (!Array.isArray(data.changes) || data.changes.length === 0) {
        throw new Error("Aucune modification précise n’a été identifiée. Indiquez les textes à remplacer.");
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
    setBrief((current) => current ? {
      ...current,
      changes: current.changes.map((change, changeIndex) => changeIndex === index ? { ...change, ...patch } : change),
    } : current);
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
      const data = await response.json() as {
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
        throw new Error(data.error ?? "Le moteur d’image n’a pas pu personnaliser l’affiche.");
      }
      if (!data.imageUrl || !data.storagePath) throw new Error("Aucune image personnalisée n’a été renvoyée.");
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
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Enregistrement impossible.");
      setLibrarySaved(true);
      setActionMessage("L’affiche est enregistrée dans votre bibliothèque personnelle.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Enregistrement impossible.");
    } finally {
      setSavingLibrary(false);
    }
  }

  async function shareGeneratedImage() {
    if (!generatedAsset) return;
    setActionMessage("");
    try {
      const response = await fetch(generatedAsset.imageUrl);
      const blob = await response.blob();
      const file = new File([blob], `${selectedTemplate?.name ?? "affiche"}.png`, { type: blob.type || "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: selectedTemplate?.name ?? "Mon affiche", files: [file] });
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: selectedTemplate?.name ?? "Mon affiche", url: generatedAsset.imageUrl });
        return;
      }
      await navigator.clipboard.writeText(generatedAsset.imageUrl);
      setActionMessage("Lien copié : collez-le dans votre email ou votre réseau social.");
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError("Le partage direct n’est pas disponible sur ce navigateur. Téléchargez l’image pour la joindre manuellement.");
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
        <AgentPageBanner eyebrow="Banque visuelle" title={galleryTitle} description={gallerySubtitle} icon={ImageIcon} titleIcon={Paintbrush} tone="rose" flat />
        <section className="grid items-center gap-5 overflow-hidden rounded-[1.6rem] border border-rose-100 bg-gradient-to-br from-rose-50 via-white to-orange-50 p-5 md:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-700">Un parcours simple</p>
            <h2 className="mt-2 text-xl font-black text-slate-900">Choisissez, expliquez, confirmez</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Gemini comprend votre demande et vous la présente clairement. Après votre confirmation, l’affiche est personnalisée en conservant son identité visuelle.</p>
          </div>
          <img src={AGENT_IMAGE_URLS.zalman} alt="" className="mx-auto h-36 w-32 object-contain" />
        </section>

        {showGalleryFilters && (
          <Card><CardContent className="space-y-4 p-5">
            <div className="relative max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une affiche…" className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={category === null ? "default" : "outline"} onClick={() => setCategory(null)}>Toutes</Button>
              {categories.map((item) => <Button key={item} size="sm" variant={category === item ? "default" : "outline"} onClick={() => setCategory(item)}>{CATEGORY_EMOJI[item] ?? "🖼️"} {CATEGORY_LABELS[item] ?? item}</Button>)}
            </div>
          </CardContent></Card>
        )}

        {filteredTemplates.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-slate-500"><ImageIcon className="mx-auto size-12" /><p className="mt-3 font-semibold">{emptyTitle}</p><p className="mt-1 text-sm">{emptyDescription}</p></CardContent></Card>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            {filteredTemplates.map((template) => {
              const image = templateImage(template);
              const locked = freePosterAlreadyUsed || (plan === "FREE_TRIAL" && template.isPremium);
              return (
                <button key={template.id} type="button" onClick={() => selectTemplate(template)} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-rose-300 hover:shadow-lg">
                  <div className="aspect-[3/4] overflow-hidden bg-slate-100">
                    {image ? <img src={image} alt={template.name} className="h-full w-full object-cover transition group-hover:scale-[1.02]" /> : <div className="flex h-full items-center justify-center"><ImageIcon className="size-10 text-slate-300" /></div>}
                  </div>
                  <div className="p-3"><p className="line-clamp-2 text-sm font-bold text-slate-900">{template.name}</p><p className="mt-1 text-xs text-slate-500">{locked ? "Réservée" : "Modifier cette affiche"}</p></div>
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
        <Button variant="ghost" onClick={() => setStep("gallery")}><ArrowLeft className="mr-2 size-4" />Retour aux affiches</Button>
        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <Card className="overflow-hidden">{sourceImage && <img src={sourceImage} alt={selectedTemplate.name} className="w-full object-contain" />}</Card>
          <Card><CardContent className="space-y-5 p-6">
            <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-rose-700">{selectedTemplate.name}</p><h1 className="mt-2 text-2xl font-black text-slate-900">Que souhaitez-vous afficher ?</h1><p className="mt-2 text-sm leading-6 text-slate-600">Écrivez naturellement toutes les nouvelles informations. Gemini repérera les anciens textes à retirer ; si le template est vierge, il préparera leur ajout sans modifier le visuel.</p></div>
            <textarea value={requestText} onChange={(event) => setRequestText(event.target.value)} rows={8} maxLength={4000} placeholder="Exemple : remplace la date par dimanche 18 septembre, mets 19h30 et indique que les familles et les étudiants sont invités. Tout le reste doit rester identique." className="w-full resize-y rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100" />
            {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <Button onClick={() => void analyzeRequest()} disabled={loading || !requestText.trim()} className="w-full bg-rose-700 text-white hover:bg-rose-800">{loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}{loading ? "Gemini analyse…" : "Comprendre ma demande"}</Button>
          </CardContent></Card>
        </div>
      </div>
    );
  }

  if (step === "confirm" && brief) {
    const blocked = brief.missingInformation.length > 0 || brief.changes.some((change) => !change.newText.trim());
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        {modal}
        <Button variant="ghost" onClick={() => setStep("request")}><ArrowLeft className="mr-2 size-4" />Modifier ma demande</Button>
        <Card><CardContent className="space-y-6 p-6">
          <div><div className="flex items-center gap-2 text-emerald-700"><Check className="size-5" /><p className="text-xs font-bold uppercase tracking-[0.14em]">Compréhension de Gemini</p></div><h1 className="mt-2 text-2xl font-black text-slate-900">Confirmez les modifications</h1><p className="mt-2 text-sm leading-6 text-slate-600">{brief.summary}</p></div>
          <div className="space-y-3">
            {brief.changes.map((change, index) => (
              <div key={`${change.label}-${index}`} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[160px_1fr_1fr]">
                <input value={change.label} onChange={(event) => updateChange(index, { label: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold" aria-label="Type de modification" />
                <div><p className="mb-1 text-xs font-semibold text-slate-500">Ancien texte détecté (facultatif)</p><input value={change.currentText} onChange={(event) => updateChange(index, { currentText: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" /></div>
                <div><p className="mb-1 text-xs font-semibold text-emerald-700">Nouveau texte exact</p><input value={change.newText} onChange={(event) => updateChange(index, { newText: event.target.value })} className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold" /></div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-950">
            <p className="font-bold">Anciens textes à nettoyer pour éviter les doublons</p>
            <p className="mt-1">{brief.textsToRemove.length > 0 ? brief.textsToRemove.join(" · ") : "Aucun texte précis détecté : les anciennes informations événementielles seront tout de même vérifiées avant l’ajout."}</p>
          </div>
          <div>
            <p className="mb-2 text-sm font-bold text-slate-800">Plan d’édition préparé par Gemini</p>
            <textarea value={brief.editPrompt} onChange={(event) => setBrief((current) => current ? { ...current, editPrompt: event.target.value } : current)} rows={5} maxLength={4000} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none focus:border-emerald-400" />
          </div>
          {brief.missingInformation.length > 0 && <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-bold">Informations encore nécessaires</p>{brief.missingInformation.map((item) => <p key={item} className="mt-1">• {item}</p>)}<Button variant="outline" className="mt-3" onClick={() => setStep("request")}>Compléter ma demande</Button></div>}
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><p className="font-bold">Ce qui restera inchangé</p><p className="mt-1">{brief.unchangedElements.join(", ") || "Le fond, les couleurs, les logos, les personnes, les illustrations et la composition générale."}</p></div>
          {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <Button onClick={() => void generatePoster()} disabled={loading || blocked} className="w-full bg-emerald-600 text-white hover:bg-emerald-700">{loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}{loading ? "Création de l’affiche…" : "Je confirme et je génère"}</Button>
        </CardContent></Card>
      </div>
    );
  }

  if (step === "preview" && generatedImageUrl) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><Button variant="ghost" onClick={() => setStep("confirm")}><ArrowLeft className="mr-2 size-4" />Retour</Button><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => window.open(generatedImageUrl, "_blank", "noopener,noreferrer")}><Download className="mr-2 size-4" />Télécharger</Button><Button variant="outline" onClick={() => void shareGeneratedImage()}><Share2 className="mr-2 size-4" />Partager</Button></div></div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="overflow-hidden"><CardContent className="p-3"><p className="mb-2 text-sm font-bold text-slate-500">Template original</p>{sourceImage && <img src={sourceImage} alt="Template original" className="w-full rounded-xl object-contain" />}</CardContent></Card>
          <Card className="overflow-hidden border-emerald-200"><CardContent className="p-3"><p className="mb-2 text-sm font-bold text-emerald-700">Votre affiche personnalisée</p><img src={generatedImageUrl} alt="Affiche personnalisée" className="w-full rounded-xl object-contain" /></CardContent></Card>
        </div>
        <Card className="border-violet-200 bg-violet-50"><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black text-violet-950">Souhaitez-vous conserver cette création ?</p><p className="mt-1 text-sm text-violet-800">Enregistrez-la dans votre bibliothèque personnelle pour la retrouver, la télécharger ou la partager plus tard.</p></div><div className="flex flex-wrap gap-2"><Button onClick={() => void saveToLibrary()} disabled={savingLibrary || librarySaved} className="bg-violet-700 text-white hover:bg-violet-800">{savingLibrary ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Library className="mr-2 size-4" />}{librarySaved ? "Enregistrée" : "Enregistrer"}</Button>{librarySaved && <Button variant="outline" onClick={() => { window.location.href = "/dashboard/media-library"; }}>Voir mes créations</Button>}</div></CardContent></Card>
        {actionMessage && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{actionMessage}</p>}
        {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </div>
    );
  }

  return null;
}
