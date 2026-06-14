"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, ArrowLeft, Download, Check,
  Pencil, Crown, ImageIcon, Loader2, Search, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
} from "@/lib/templates/shared";

// ============================================================
// TYPES
// ============================================================

interface DesignZone {
  id: string;
  label: string;
  type: "title" | "subtitle" | "date" | "time" | "location" | "body" | "contact" | "cta";
  defaultText: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
  fontFamily: string;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  subCategory: string | null;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  design: DesignZone[];
  isGlobal: boolean;
  isPremium: boolean;
  tags: string[];
  usageCount: number;
}

interface Community {
  id: string;
  name: string;
  city: string | null;
  tone: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  religiousStream: string | null;
  plan: string;
}

interface Props {
  templates: Template[];
  community: Community;
  plan: string;
  galleryTitle?: string;
  gallerySubtitle?: string;
  showGalleryFilters?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

// ============================================================
// CONSTANTES
// ============================================================

const CATEGORY_ORDER = [
  "SHABBAT",
  "HOLIDAY",
  "EVENT",
  "COURSE",
  "ANNOUNCEMENT",
  "GREETING",
  "RECAP",
  "GENERAL",
] as const;

const SUBCATEGORY_LABELS: Record<string, string> = {
  tichri: "Tichri",
  pessah: "Pessah",
  heures_de_chabbat: "Horaires de Chabbat",
  repas_de_chabbat: "Repas de Chabbat",
  lag_baomer: "Lag Baomer",
  roch_hachana: "Roch Hachana",
  yom_kippour: "Yom Kippour",
  tou_bichvat: "Tou Bichvat",
  "19_kislev": "19 Kislev",
  "10_chevat": "10 Chevat",
  "11_nissan": "11 Nissan",
  "3_tamouz": "3 Tamouz",
  cours_de_torah: "Cours de Torah",
  assemblee_de_torah: "Assemblée de Torah",
  dejeuner_et_etude: "Déjeuner et étude",
  gan_israel: "Gan Israël",
  jeunesse_cteen: "Jeunesse CTeen",
  bar_mitsva: "Bar Mitsva",
  kiddouch_levana: "Kiddouch Levana",
  peres_et_fils: "Pères et fils",
  prelevement_de_la_halla: "Prélèvement de la halla",
  coupe_de_chevaux: "Coupe de cheveux",
  introduction_du_sefer_torah: "Introduction du Sefer Torah",
  notre_victoire: "Notre victoire",
};

const DEEP_FILTER_SUBCATEGORIES = new Set(["tichri", "pessah"]);

function formatSubCategoryLabel(value: string | null | undefined, category: string): string {
  const normalized = (value ?? "").trim();
  if (!normalized) return CATEGORY_LABELS[category] ?? category;
  if (SUBCATEGORY_LABELS[normalized]) return SUBCATEGORY_LABELS[normalized];

  return normalized
    .split("_")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildTemplateSearchText(template: Template): string {
  return normalizeSearch([
    template.name,
    template.description ?? "",
    template.subCategory ?? "",
    CATEGORY_LABELS[template.category] ?? template.category,
    ...(template.tags ?? []),
  ].join(" "));
}

function sortTemplates(templates: Template[]): Template[] {
  return [...templates].sort((left, right) => {
    if ((right.usageCount ?? 0) !== (left.usageCount ?? 0)) {
      return (right.usageCount ?? 0) - (left.usageCount ?? 0);
    }

    return left.name.localeCompare(right.name, "fr", { sensitivity: "base" });
  });
}

function groupBySubCategory(templates: Template[]) {
  const groups = new Map<string, { key: string; label: string; templates: Template[] }>();

  for (const template of sortTemplates(templates)) {
    const key = template.subCategory?.trim() || "__default__";
    const existing = groups.get(key);

    if (existing) {
      existing.templates.push(template);
      continue;
    }

    groups.set(key, {
      key,
      label: formatSubCategoryLabel(template.subCategory, template.category),
      templates: [template],
    });
  }

  return [...groups.values()].sort((left, right) => {
    if (right.templates.length !== left.templates.length) {
      return right.templates.length - left.templates.length;
    }

    return left.label.localeCompare(right.label, "fr", { sensitivity: "base" });
  });
}

function buildCategorySections(templates: Template[]) {
  const grouped = new Map<string, Template[]>();

  for (const template of templates) {
    const existing = grouped.get(template.category) ?? [];
    existing.push(template);
    grouped.set(template.category, existing);
  }

  const orderedCategories = [
    ...CATEGORY_ORDER.filter((category) => grouped.has(category)),
    ...[...grouped.keys()]
      .filter((category) => !CATEGORY_ORDER.includes(category as (typeof CATEGORY_ORDER)[number]))
      .sort((left, right) => left.localeCompare(right, "fr", { sensitivity: "base" })),
  ];

  return orderedCategories.map((category) => {
    const categoryTemplates = sortTemplates(grouped.get(category) ?? []);

    return {
      category,
      label: CATEGORY_LABELS[category] ?? category,
      emoji: CATEGORY_EMOJI[category] ?? "🖼️",
      templates: categoryTemplates,
      groups: groupBySubCategory(categoryTemplates),
    };
  });
}

function PosterThumbnail({
  template,
  className,
}: {
  template: Pick<Template, "name" | "thumbnailUrl" | "previewUrl">;
  className: string;
}) {
  const initialSource = template.previewUrl ?? template.thumbnailUrl;
  const [imageSource, setImageSource] = useState<string | null>(initialSource);

  if (!imageSource) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-100">
        <ImageIcon className="size-10 text-slate-300" />
      </div>
    );
  }

  return (
    <img
      src={imageSource}
      alt={template.name}
      className={className}
      onError={() => {
        if (imageSource !== template.thumbnailUrl && template.thumbnailUrl) {
          setImageSource(template.thumbnailUrl);
          return;
        }

        setImageSource(null);
      }}
    />
  );
}

function TemplateCard({
  template,
  isPremiumUser,
  onSelect,
}: {
  template: Template;
  isPremiumUser: boolean;
  onSelect: (template: Template) => void;
}) {
  return (
    <Card
      className={cn(
        "group cursor-pointer overflow-hidden rounded-[1.4rem] border border-amber-300 bg-white p-2 shadow-[0_14px_30px_-22px_rgba(146,64,14,0.22)] transition-all duration-200 hover:-translate-y-1 hover:border-amber-400 hover:shadow-[0_22px_40px_-24px_rgba(146,64,14,0.28)] active:scale-[0.99]",
        template.isPremium && !isPremiumUser && "opacity-60"
      )}
      onClick={() => onSelect(template)}
    >
      <div className="rounded-[1rem] border border-amber-100 bg-white p-1.5 shadow-inner">
        <div className="relative aspect-[3/4] overflow-hidden rounded-[0.9rem] bg-slate-100">
          <PosterThumbnail
            template={template}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />

          <div className="hidden absolute left-2 top-2 max-w-[70%] flex-wrap gap-1.5">
            <Badge variant="secondary" className="bg-white/90 text-[10px] backdrop-blur">
              {CATEGORY_EMOJI[template.category] ?? "🖼️"} {CATEGORY_LABELS[template.category] ?? template.category}
            </Badge>
            {template.subCategory && (
              <Badge variant="secondary" className="bg-slate-900/70 text-[10px] text-white">
                {formatSubCategoryLabel(template.subCategory, template.category)}
              </Badge>
            )}
          </div>

          {template.isPremium && (
            <div className="absolute right-2 top-2">
              <Badge className="gap-1 bg-amber-500 text-[10px] text-white">
                <Crown className="size-3" /> Premium
              </Badge>
            </div>
          )}

          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
            <Button
              size="sm"
              className="opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
            >
              <Sparkles className="mr-1.5 size-4" />
              Personnaliser
            </Button>
          </div>
        </div>
      </div>

      <CardContent className="px-1 pb-1 pt-3">
        <p className="line-clamp-2 text-sm font-semibold text-slate-900">{template.name}</p>
      </CardContent>
    </Card>
  );
}

// ============================================================
// COMPOSANT
// ============================================================

type Step = "gallery" | "questions" | "preview";

export function TemplatesClient({
  templates,
  community,
  plan,
  galleryTitle = "BANQUE D'AFFICHES",
  gallerySubtitle = "Choisissez parmi plus de 250 affiches pretes a personnaliser, ajoutez vos informations, puis laissez l'IA adapter le modele et le publier en un clic.",
  showGalleryFilters = true,
  emptyTitle = "Aucune affiche trouvee",
  emptyDescription = "Ajuste la recherche ou change de categorie pour elargir les resultats.",
}: Props) {
  const [step, setStep] = useState<Step>("gallery");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSubCategory, setActiveSubCategory] = useState<string | null>(null);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [generatedTexts, setGeneratedTexts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [editingZone, setEditingZone] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState("");

  const categories = buildCategorySections(templates).map((section) => section.category);
  const searchValue = normalizeSearch(search);
  const templatesForActiveCategory = activeCategory
    ? templates.filter((template) => template.category === activeCategory)
    : [];
  const availableSubCategories = groupBySubCategory(templatesForActiveCategory);
  const templatesForActiveSubCategory = activeCategory && activeSubCategory
    ? templatesForActiveCategory.filter(
        (template) => (template.subCategory?.trim() || "__default__") === activeSubCategory
      )
    : [];
  const canUseDeepFilter = Boolean(activeSubCategory && DEEP_FILTER_SUBCATEGORIES.has(activeSubCategory));
  const availableCollections = canUseDeepFilter
    ? [...new Map(
        sortTemplates(templatesForActiveSubCategory).map((template) => [
          normalizeSearch(template.name),
          {
            key: normalizeSearch(template.name),
            label: template.name,
            total: templatesForActiveSubCategory.filter(
              (candidate) => normalizeSearch(candidate.name) === normalizeSearch(template.name)
            ).length,
          },
        ])
      ).values()]
    : [];
  const filteredTemplates = templates.filter((template) => {
    if (activeCategory && template.category !== activeCategory) {
      return false;
    }

    if (activeSubCategory && (template.subCategory?.trim() || "__default__") !== activeSubCategory) {
      return false;
    }

    if (canUseDeepFilter && activeCollection && normalizeSearch(template.name) !== activeCollection) {
      return false;
    }

    if (!searchValue) {
      return true;
    }

    return buildTemplateSearchText(template).includes(searchValue);
  });
  const categorySections = buildCategorySections(filteredTemplates);
  const subCategoryCount = new Set(
    templates.map((template) => template.subCategory?.trim()).filter(Boolean)
  ).size;

  const isPremiumUser = plan !== "FREE_TRIAL";

  // ── Sélectionner un template ──
  function selectTemplate(template: Template) {
    if (template.isPremium && !isPremiumUser) return;
    setSelectedTemplate(template);
    setAssistantPrompt("");
    setGeneratedTexts({});
    setGeneratedImageUrl(null);
    setImageError("");
    setStep("questions");
  }

  function handleCategoryChange(category: string | null) {
    setActiveCategory(category);
    setActiveSubCategory(null);
    setActiveCollection(null);
  }

  function handleSubCategoryChange(subCategory: string | null) {
    setActiveSubCategory(subCategory);
    setActiveCollection(null);
  }

  // ── Générer la nouvelle affiche (image) via fal.ai / nano-banana ──
  async function generateImage() {
    if (!selectedTemplate) return;
    const request = assistantPrompt.trim();
    if (!request) {
      setImageError("Décrivez la modification souhaitée pour l'affiche.");
      return;
    }

    setImageError("");
    setLoading(true);
    try {
      const res = await fetch("/api/templates/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: selectedTemplate.id, userRequest: request }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Impossible de générer l'affiche.");
      setGeneratedImageUrl(data.imageUrl);
      setStep("preview");
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Impossible de générer l'affiche.");
    } finally {
      setLoading(false);
    }
  }

  // ── Retour ──
  function goBack() {
    if (step === "preview") setStep("questions");
    else if (step === "questions") {
      setStep("gallery");
      setSelectedTemplate(null);
    }
  }

  // ── Télécharger l'affiche générée ──
  async function downloadPoster() {
    if (!selectedTemplate) return;

    // Si une affiche a déjà été générée par l'IA (image), on l'ouvre directement.
    if (generatedImageUrl) {
      window.open(generatedImageUrl, "_blank", "noopener,noreferrer");
      return;
    }

    setRendering(true);
    try {
      const res = await fetch("/api/templates/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          generatedTexts,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Impossible de générer l'affiche");
      }

      window.open(data.imageUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error(error);
      alert("Impossible de générer l'affiche pour le moment.");
    } finally {
      setRendering(false);
    }
  }

  // ============================================================
  // RENDER — GALERIE
  // ============================================================

  if (step === "gallery") {
    return (
      <div className="space-y-8">
        <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-[#8a4b11] via-[#a86216] to-[#c98319] p-6 shadow-[0_18px_40px_-28px_rgba(146,64,14,0.35)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 h-1.5 w-10 rounded-full bg-amber-200/90" />
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
                {galleryTitle}
              </h1>
              <p className="mt-2 text-sm leading-6 text-amber-50/90">
                {gallerySubtitle}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Card className="rounded-2xl border-white/20 bg-white/10 shadow-sm backdrop-blur">
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-wide text-amber-100">Affiches</p>
                  <p className="mt-1 text-2xl font-bold text-white">{templates.length}</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-white/20 bg-white/10 shadow-sm backdrop-blur">
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-wide text-amber-100">Catégories</p>
                  <p className="mt-1 text-2xl font-bold text-white">{categories.length}</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-white/20 bg-white/10 shadow-sm backdrop-blur">
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-wide text-amber-100">Sous-thèmes</p>
                  <p className="mt-1 text-2xl font-bold text-white">{subCategoryCount}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {showGalleryFilters && (
        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardContent className="space-y-5 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher une fête, un cours, une affiche, un thème…"
                  className="w-full rounded-2xl border border-amber-200 bg-amber-50/40 py-3 pl-10 pr-11 text-sm text-slate-700 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                    aria-label="Effacer la recherche"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
              <div className="text-xs text-slate-500">
                {filteredTemplates.length} affiche{filteredTemplates.length > 1 ? "s" : ""} affichée{filteredTemplates.length > 1 ? "s" : ""}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant={activeCategory === null ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                onClick={() => handleCategoryChange(null)}
              >
                Toutes ({templates.length})
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={activeCategory === cat ? "default" : "outline"}
                  size="sm"
                  className="rounded-full"
                  onClick={() => handleCategoryChange(cat)}
                >
                  {CATEGORY_EMOJI[cat] ?? "🖼️"} {CATEGORY_LABELS[cat] ?? cat} (
                  {templates.filter((t) => t.category === cat).length})
                </Button>
              ))}
            </div>

            {activeCategory && availableSubCategories.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Sous-thèmes dans {CATEGORY_LABELS[activeCategory] ?? activeCategory}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={activeSubCategory === null ? "default" : "outline"}
                    size="sm"
                    className="rounded-full"
                    onClick={() => handleSubCategoryChange(null)}
                  >
                    Tous
                  </Button>
                  {availableSubCategories.map((group) => (
                    <Button
                      key={group.key}
                      variant={activeSubCategory === group.key ? "default" : "outline"}
                      size="sm"
                      className="rounded-full"
                      onClick={() => handleSubCategoryChange(group.key)}
                    >
                      {group.label} ({group.templates.length})
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {canUseDeepFilter && activeSubCategory && availableCollections.length > 1 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Collections dans {formatSubCategoryLabel(activeSubCategory, activeCategory ?? "GENERAL")}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={activeCollection === null ? "default" : "outline"}
                    size="sm"
                    className="rounded-full"
                    onClick={() => setActiveCollection(null)}
                  >
                    Toutes
                  </Button>
                  {availableCollections.map((collection) => (
                    <Button
                      key={collection.key}
                      variant={activeCollection === collection.key ? "default" : "outline"}
                      size="sm"
                      className="rounded-full"
                      onClick={() => setActiveCollection(collection.key)}
                    >
                      {collection.label} ({collection.total})
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-slate-400">
              <ImageIcon className="size-16 mb-4" />
              <p className="text-lg font-medium">{emptyTitle}</p>
              <p className="text-sm mt-1">
                {emptyDescription}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {categorySections.map((section) => (
              <section key={section.category} className="space-y-5">
                <div className="hidden flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {section.emoji} {section.label}
                    </p>
                    <h2 className="mt-1 text-2xl font-bold text-slate-900">
                      {section.templates.length} affiche{section.templates.length > 1 ? "s" : ""}
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {section.groups.slice(0, 6).map((group) => (
                      <Badge key={group.key} variant="outline" className="rounded-full px-3 py-1 text-xs">
                        {group.label} · {group.templates.length}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  {section.groups.map((group) => (
                    <div key={`${section.category}-${group.key}`} className="space-y-3">
                      <div className="hidden items-center justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-slate-900">{group.label}</h3>
                          <p className="text-xs text-slate-500">
                            {group.templates.length} affiche{group.templates.length > 1 ? "s" : ""} dans ce sous-thème
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                        {group.templates.map((template) => (
                          <TemplateCard
                            key={template.id}
                            template={template}
                            isPremiumUser={isPremiumUser}
                            onSelect={selectTemplate}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // RENDER — QUESTIONS DE PERSONNALISATION
  // ============================================================

  if (step === "questions" && selectedTemplate) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Personnaliser l&apos;affiche</h1>
            <p className="text-sm text-slate-500">
              {selectedTemplate.name} · {CATEGORY_LABELS[selectedTemplate.category]}
            </p>
          </div>
        </div>

        {/* Aperçu du template choisi */}
        <Card className="overflow-hidden rounded-2xl border-blue-100 bg-gradient-to-br from-blue-50 via-sky-100 to-indigo-100 p-2 shadow-sm ring-1 ring-white/80">
          <div className="flex gap-4 p-4">
            <div className="w-32 shrink-0 rounded-xl border border-blue-100 bg-white p-1.5 shadow-inner">
              <div className="aspect-[3/4] overflow-hidden rounded-lg bg-slate-100">
                <PosterThumbnail
                  template={selectedTemplate}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">{selectedTemplate.name}</h3>
              {selectedTemplate.description && (
                <p className="text-sm text-slate-500 mt-1">{selectedTemplate.description}</p>
              )}
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {selectedTemplate.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px]">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Info communauté pré-remplie */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="size-4 text-violet-500" />
              <p className="text-sm font-semibold text-slate-700">
                Informations de {community.name} (pré-remplies)
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
              {community.city && <p>📍 {community.city}</p>}
              {community.phone && <p>📞 {community.phone}</p>}
              {community.email && <p>📧 {community.email}</p>}
              {community.website && <p>🌐 {community.website}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Assistant IA */}
        <Card className="border-violet-100 bg-gradient-to-br from-white via-violet-50/70 to-fuchsia-50/60 shadow-sm">
          <CardContent className="space-y-4 py-5">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
                <Sparkles className="size-3.5" />
                Assistant IA
              </div>
              <p className="text-sm font-semibold text-slate-800">
                Donnez-moi un maximum d&apos;informations, et l&apos;IA personnalisera l&apos;affiche selon ce que
                vous indiquez.
              </p>
              <p className="text-sm text-slate-500">
                Écrivez naturellement votre demande : indiquez le type d&apos;événement, la date, l&apos;heure, le
                lieu, le public concerné, le texte à ajouter, le style souhaité et toute information utile.
                L&apos;IA comprendra votre message et personnalisera l&apos;affiche directement.
              </p>
            </div>

            <div className="rounded-3xl border border-violet-200 bg-white p-4 shadow-inner">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Décrivez librement votre affiche
              </label>
              <textarea
                value={assistantPrompt}
                onChange={(event) => setAssistantPrompt(event.target.value)}
                placeholder="Exemple : Je veux créer une affiche pour un cours de Torah mardi soir à 20h30 au Beth Habad, animé par le Rav Cohen, sur le thème de la paracha. Je veux un style chaleureux, moderne et professionnel."
                className="min-h-[220px] w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
              />
            </div>
          </CardContent>
        </Card>

        {imageError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {imageError}
          </p>
        )}

        {/* Action */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={goBack} className="flex-1">
            <ArrowLeft className="size-4 mr-2" /> Retour
          </Button>
          <Button
            onClick={generateImage}
            disabled={loading || assistantPrompt.trim().length === 0}
            className="flex-1 bg-gradient-to-r from-blue-600 to-violet-600 text-white"
          >
            {loading ? (
              <><Loader2 className="size-4 mr-2 animate-spin" /> Génération de l&apos;affiche...</>
            ) : (
              <><Sparkles className="size-4 mr-2" /> Générer l&apos;affiche</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER — PREVIEW & ÉDITION
  // ============================================================

  if (step === "preview" && selectedTemplate) {
    const zones = selectedTemplate.design as DesignZone[];

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={goBack}>
              <ArrowLeft className="size-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Aperçu de l&apos;affiche</h1>
              <p className="text-sm text-slate-500">
                Modifiez les textes si besoin, puis téléchargez
              </p>
            </div>
          </div>
          <Button
            onClick={downloadPoster}
            loading={rendering}
            className="bg-gradient-to-r from-blue-600 to-violet-600 text-white"
          >
            <Download className="size-4 mr-2" /> Télécharger
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Preview de l'affiche */}
          <Card className="overflow-hidden">
            <div className="relative aspect-[3/4] bg-slate-900">
              {generatedImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={generatedImageUrl}
                  alt={`Affiche générée — ${selectedTemplate.name}`}
                  className="h-full w-full object-contain"
                />
              ) : (
                <PosterThumbnail
                  template={selectedTemplate}
                  className="h-full w-full object-cover"
                />
              )}

              {/* Zones de texte superposées (modèle texte uniquement) */}
              {!generatedImageUrl && zones.map((zone) => (
                <div
                  key={zone.id}
                  className="absolute cursor-pointer hover:outline hover:outline-2 hover:outline-blue-400 hover:outline-dashed rounded transition-all"
                  style={{
                    left: `${zone.x}%`,
                    top: `${zone.y}%`,
                    width: `${zone.width}%`,
                    height: `${zone.height}%`,
                  }}
                  onClick={() => setEditingZone(zone.id)}
                  title={`Cliquer pour modifier : ${zone.label}`}
                >
                  <div
                    className="w-full h-full flex items-center justify-center p-1 text-center leading-tight"
                    style={{
                      fontSize: `${zone.fontSize * 0.6}px`,
                      color: zone.color,
                      fontFamily: zone.fontFamily,
                    }}
                  >
                    {generatedTexts[zone.id] ?? zone.defaultText}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Panneau d'édition des textes */}
          <div className="space-y-4">
            {/* Demande de modification + régénération de l'image */}
            <Card className="border-violet-100 bg-gradient-to-br from-white via-violet-50/60 to-fuchsia-50/50">
              <CardContent className="space-y-3 py-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-violet-500" />
                  <p className="text-sm font-semibold text-slate-700">Affiner l&apos;affiche</p>
                </div>
                <textarea
                  value={assistantPrompt}
                  onChange={(event) => setAssistantPrompt(event.target.value)}
                  placeholder="Décrivez la modification : changez la date, le titre, les couleurs, ajoutez une information…"
                  className="min-h-[110px] w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                />
                {imageError && <p className="text-sm font-medium text-red-600">{imageError}</p>}
                <Button
                  onClick={generateImage}
                  disabled={loading || assistantPrompt.trim().length === 0}
                  className="w-full bg-gradient-to-r from-blue-600 to-violet-600 text-white"
                >
                  {loading ? (
                    <><Loader2 className="size-4 mr-2 animate-spin" /> Génération de l&apos;affiche...</>
                  ) : (
                    <><Sparkles className="size-4 mr-2" /> {generatedImageUrl ? "Régénérer l'affiche" : "Générer l'affiche"}</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {zones.length > 0 && (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 mb-4">
                  <Pencil className="size-4 text-blue-500" />
                  <p className="text-sm font-semibold text-slate-700">Textes générés par l&apos;IA</p>
                </div>

                <div className="space-y-3">
                  {zones.map((zone) => (
                    <div key={zone.id}>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">
                        {zone.label}
                      </label>
                      {editingZone === zone.id ? (
                        <div className="flex gap-2">
                          <input
                            value={generatedTexts[zone.id] ?? zone.defaultText}
                            onChange={(e) =>
                              setGeneratedTexts((prev) => ({
                                ...prev,
                                [zone.id]: e.target.value,
                              }))
                            }
                            autoFocus
                            className="flex-1 rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setEditingZone(null)}
                          >
                            <Check className="size-4 text-emerald-600" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          className="group flex items-center gap-2 cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 hover:border-blue-300 transition-colors"
                          onClick={() => setEditingZone(zone.id)}
                        >
                          <p className="flex-1 text-sm text-slate-800">
                            {generatedTexts[zone.id] ?? zone.defaultText}
                          </p>
                          <Pencil className="size-3.5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            )}

            {/* Actions */}
            <Button variant="outline" onClick={() => setStep("questions")} className="w-full">
              <ArrowLeft className="size-4 mr-2" /> Modifier ma demande
            </Button>

            <Button
              onClick={downloadPoster}
              loading={rendering}
              disabled={!generatedImageUrl}
              className="w-full bg-gradient-to-r from-blue-600 to-violet-600 text-white h-12 text-base"
            >
              <Download className="size-5 mr-2" /> Télécharger l&apos;affiche
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
