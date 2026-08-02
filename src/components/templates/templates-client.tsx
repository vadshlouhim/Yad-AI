"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, ArrowLeft, Download, Check,
  Pencil, Crown, ImageIcon, Loader2, Paintbrush, Search, X, Lock,
  Type, ShieldCheck, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AGENT_IMAGE_URLS } from "@/lib/agents";
import { UpgradeModal } from "@/components/billing/upgrade-modal";
import { AgentPageBanner } from "@/components/dashboard/agent-page-banner";
import type { BillingConfig, BillingUsage } from "@/lib/billing";
import {
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
} from "@/lib/templates/shared";
import {
  buildFreePosterTextBlocks,
  buildStructuredPosterTextBlocks,
  type PosterInputPriority,
  type PosterInputTextBlock,
} from "@/lib/templates/input-blocks";

const ZALMAN_VISUALS_AGENT_IMAGE_URL = AGENT_IMAGE_URLS.zalman;

// ============================================================
// TYPES
// ============================================================

interface DesignZone {
  id: string;
  label: string;
  type?: string;
  variableKey?: string;
  variableType?: string;
  defaultText: string;
  x: number;
  y: number;
  width: number;
  height: number;
  align?: "left" | "center" | "right";
  fontSize: number;
  color: string;
  fontFamily: string;
  overflow?: "shrink" | "wrap" | "truncate" | "hide";
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  subCategory: string | null;
  originalUrl: string | null;
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

interface TemplateShabbatTimes {
  date?: string;
  hebrewDate?: string;
  parasha?: string;
  entry: string;
  exit: string;
}

interface Props {
  templates: Template[];
  community: Community;
  shabbatTimes: TemplateShabbatTimes | null;
  plan: string;
  billingConfig: BillingConfig;
  billingUsage: BillingUsage;
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
  gan_israel: "Gan IsraÃ«l",
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

function getZoneVariableKey(zone: DesignZone): string {
  return zone.variableKey ?? zone.type ?? zone.id;
}

function isImageLikeZone(zone: DesignZone): boolean {
  const key = getZoneVariableKey(zone).toUpperCase();
  const type = (zone.type ?? "").toUpperCase();
  const variableType = (zone.variableType ?? "").toUpperCase();

  return key.includes("LOGO")
    || key.includes("IMAGE")
    || key.includes("PHOTO")
    || type.includes("IMAGE")
    || type.includes("PHOTO")
    || variableType.includes("IMAGE")
    || variableType.includes("PHOTO");
}

function TemplateCard({
  template,
  locked,
  onSelect,
}: {
  template: Template;
  locked: boolean;
  onSelect: (template: Template) => void;
}) {
  return (
    <Card
      className={cn(
        "group cursor-pointer overflow-hidden rounded-[1.4rem] border border-amber-300 bg-white p-2 shadow-[0_14px_30px_-22px_rgba(146,64,14,0.22)] transition-all duration-200 hover:-translate-y-1 hover:border-amber-400 hover:shadow-[0_22px_40px_-24px_rgba(146,64,14,0.28)] active:scale-[0.99]",
        locked && "opacity-75"
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
              {CATEGORY_EMOJI[template.category] ?? "ðŸ–¼ï¸"} {CATEGORY_LABELS[template.category] ?? template.category}
            </Badge>
            {template.subCategory && (
              <Badge variant="secondary" className="bg-slate-900/70 text-[10px] text-white">
                {formatSubCategoryLabel(template.subCategory, template.category)}
              </Badge>
            )}
          </div>

          {(template.isPremium || locked) && (
            <div className="absolute right-2 top-2">
              <Badge className={cn("gap-1 text-[10px] text-white", locked ? "bg-slate-900" : "bg-amber-500")}>
                {locked ? <Lock className="size-3" /> : <Crown className="size-3" />}
                {locked ? "Payant" : "Premium"}
              </Badge>
            </div>
          )}

          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
            <Button
              size="sm"
              className="opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
            >
              {locked ? <Lock className="mr-1.5 size-4" /> : <Sparkles className="mr-1.5 size-4" />}
              {locked ? "Débloquer" : "Personnaliser"}
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
type InputMode = "structured" | "free";
type VisualReport = {
  passed: boolean;
  score: number;
  issues: Array<{ code: string; message: string; blockId?: string }>;
};

const STRUCTURED_FIELDS: Array<{
  id: string;
  label: string;
  role: string;
  priority: PosterInputPriority;
  placeholder: string;
  rows?: number;
}> = [
  { id: "title", label: "Titre principal", role: "title", priority: "main", placeholder: "Titre exact" },
  { id: "date", label: "Date", role: "date", priority: "important", placeholder: "Date exacte" },
  { id: "time", label: "Heure", role: "time", priority: "important", placeholder: "Heure exacte" },
  { id: "location", label: "Lieu", role: "location", priority: "important", placeholder: "Nom exact du lieu" },
  { id: "address", label: "Adresse", role: "address", priority: "complementary", placeholder: "Adresse exacte" },
  { id: "program", label: "Programme", role: "program", priority: "complementary", placeholder: "Programme exact", rows: 3 },
  { id: "speaker", label: "Intervenant", role: "speaker", priority: "important", placeholder: "Nom exact" },
  { id: "contact", label: "Contact", role: "contact", priority: "complementary", placeholder: "Téléphone ou contact exact" },
  { id: "details", label: "Texte complémentaire", role: "details", priority: "complementary", placeholder: "Texte exact", rows: 3 },
];

function buildTextBlocks(
  mode: InputMode,
  structuredTexts: Record<string, string>,
  freeText: string,
){
  if (mode === "structured") {
    return buildStructuredPosterTextBlocks(STRUCTURED_FIELDS, structuredTexts);
  }
  return buildFreePosterTextBlocks(freeText);
}

function isLegacyPosterEditorEnabled() {
  return false;
}

export function TemplatesClient({
  templates,
  plan,
  billingConfig,
  billingUsage,
  galleryTitle = "BANQUE D'AFFICHES",
  gallerySubtitle = "Choisissez une affiche, ajoutez vos textes exacts et conservez le design d'origine intact.",
  showGalleryFilters = true,
  emptyTitle = "Aucune affiche trouvée",
  emptyDescription = "Ajuste la recherche ou change de catégorie pour élargir les résultats.",
}: Props) {
  const [step, setStep] = useState<Step>("gallery");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSubCategory, setActiveSubCategory] = useState<string | null>(null);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("structured");
  const [structuredTexts, setStructuredTexts] = useState<Record<string, string>>({});
  const [freeText, setFreeText] = useState("");
  const [generatedTexts, setGeneratedTexts] = useState<Record<string, string>>({});
  const [aiChatPrompt, setAiChatPrompt] = useState("");
  const [aiChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [aiChatLoading] = useState(false);
  const [editingZone, setEditingZone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [compositionPlan, setCompositionPlan] = useState<Record<string, unknown> | null>(null);
  const [visualReport, setVisualReport] = useState<VisualReport | null>(null);
  const [textHash, setTextHash] = useState<string | null>(null);
  const [usedTextBlocks, setUsedTextBlocks] = useState<PosterInputTextBlock[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [imageError, setImageError] = useState("");
  const [upgradeOpen, setUpgradeOpen] = useState(false);

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

  const isPremiumUser = plan !== "FREE_TRIAL";
  const firstUnlockedTemplateId = sortTemplates(templates)[0]?.id ?? null;
  const freePosterAlreadyUsed = billingUsage.posterGenerations >= 1;

  function isTemplateLocked(template: Template) {
    if (isPremiumUser) return false;
    if (freePosterAlreadyUsed) return true;
    return template.id !== firstUnlockedTemplateId;
  }

  // â”€â”€ SÃ©lectionner un template â”€â”€
  function selectTemplate(template: Template) {
    if (isTemplateLocked(template)) {
      setUpgradeOpen(true);
      return;
    }
    setSelectedTemplate(template);
    setInputMode("structured");
    setStructuredTexts({});
    setFreeText("");
    setGeneratedImageUrl(null);
    setCompositionPlan(null);
    setVisualReport(null);
    setTextHash(null);
    setUsedTextBlocks([]);
    setAccepted(false);
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

  async function generateImage(requestAnotherLayout = false) {
    if (!selectedTemplate) return;
    const textBlocks = buildTextBlocks(inputMode, structuredTexts, freeText);
    if (!selectedTemplate.originalUrl) {
      setImageError("Le fichier original de ce template doit être téléversé avant sa personnalisation.");
      return;
    }
    if (textBlocks.length === 0) {
      setImageError("Renseignez au moins un texte exact avant de composer l'affiche.");
      return;
    }

    setImageError("");
    setLoading(true);
    setAccepted(false);
    try {
      const res = await fetch("/api/templates/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          textBlocks,
          previousPlan: requestAnotherLayout ? compositionPlan : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "PAYWALL_REQUIRED") {
          setUpgradeOpen(true);
          return;
        }
        throw new Error(data.error ?? "Impossible de générer l'affiche.");
      }
      setGeneratedImageUrl(data.imageUrl);
      setCompositionPlan(data.plan ?? null);
      setVisualReport(data.visualReport ?? null);
      setTextHash(data.textHash ?? null);
      setUsedTextBlocks(Array.isArray(data.usedTextBlocks) ? data.usedTextBlocks : textBlocks);
      setStep("preview");
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Impossible de générer l'affiche.");
    } finally {
      setLoading(false);
    }
  }

  // â”€â”€ Retour â”€â”€
  function goBack() {
    if (step === "preview") setStep("questions");
    else if (step === "questions") {
      setStep("gallery");
      setSelectedTemplate(null);
    }
  }

  // â”€â”€ TÃ©lÃ©charger l'affiche gÃ©nÃ©rÃ©e â”€â”€
  async function downloadPoster() {
    if (!generatedImageUrl) return;
    setRendering(true);
    window.open(generatedImageUrl, "_blank", "noopener,noreferrer");
    setRendering(false);
  }

  async function applyAiChatToVariables() {
    setImageError("La répartition par zones a été remplacée par la composition visuelle automatique.");
    setAiChatPrompt("");
  }

  // ============================================================
  // RENDER â€” GALERIE
  // ============================================================

  if (step === "gallery") {
    return (
      <div className="space-y-8">
        <UpgradeModal
          open={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
          config={billingConfig}
          featureLabel="Affiches"
          title="Débloquez toutes les affiches"
          description="Le mode gratuit permet de modifier une seule affiche. Passez au mode payant pour personnaliser toute la banque d'affiches sans limite."
        />
        <AgentPageBanner
          eyebrow="Banque visuelle"
          title={galleryTitle}
          description={gallerySubtitle}
          icon={ImageIcon}
          titleIcon={Paintbrush}
          tone="rose"
          flat
        />

        <section className="grid items-center gap-5 overflow-hidden rounded-[1.6rem] border border-rose-100 bg-gradient-to-br from-rose-50 via-white to-orange-50 p-5 shadow-[0_18px_46px_-34px_rgba(190,18,60,0.55)] md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0 space-y-4">
            <div className="relative max-w-2xl rounded-[1.25rem] border border-white/80 bg-white/90 p-4 shadow-sm">
              <div className="absolute -right-2 top-8 hidden h-4 w-4 rotate-45 border-r border-t border-white/80 bg-white/90 md:block" />
              <p className="text-sm font-semibold leading-6 text-slate-700">
                Je suis Zalman, votre agent de composition typographique sur template fixe
              </p>
            </div>
          </div>
          <div className="relative mx-auto flex h-36 w-32 items-end justify-center overflow-visible md:h-40 md:w-36">
            <img
              src={ZALMAN_VISUALS_AGENT_IMAGE_URL}
              alt=""
              aria-hidden="true"
              className="absolute bottom-[-1.1rem] h-48 w-36 object-contain object-bottom drop-shadow-[0_18px_24px_rgba(15,23,42,0.18)] md:h-56 md:w-40"
            />
          </div>
        </section>

        <section className="grid gap-3">
          {[
            { icon: ImageIcon, label: "Bibliothèque", value: `${templates.length} affiches disponibles`, tone: "text-rose-800 bg-rose-50 border-rose-100" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={cn("animate-fade-in flex min-w-0 items-center gap-3 rounded-2xl border p-4 shadow-sm", item.tone)}>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm"><Icon className="size-5" /></span>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.12em]">{item.label}</p>
                  <p className="mt-1 truncate text-sm font-black text-slate-900">{item.value}</p>
                </div>
              </div>
            );
          })}
        </section>

        {showGalleryFilters && (
        <Card className="rounded-[1.5rem] border-rose-100 bg-white/95 shadow-[0_18px_48px_-34px_rgba(190,24,93,0.22)]">
          <CardContent className="space-y-5 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher une fête, un cours, une affiche, un thème..."
                  className="w-full rounded-2xl border border-rose-200 bg-rose-50/40 py-3 pl-10 pr-11 text-sm text-slate-700 outline-none transition focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100"
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
                className={cn(
                  "rounded-full border-rose-200",
                  activeCategory === null ? "bg-rose-600 text-white hover:bg-rose-700" : "text-rose-700 hover:border-rose-300 hover:bg-rose-50"
                )}
                onClick={() => handleCategoryChange(null)}
              >
                Toutes ({templates.length})
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={activeCategory === cat ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "rounded-full border-rose-200",
                    activeCategory === cat ? "bg-rose-600 text-white hover:bg-rose-700" : "text-rose-700 hover:border-rose-300 hover:bg-rose-50"
                  )}
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
                    className={cn(
                      "rounded-full border-rose-200",
                      activeSubCategory === null ? "bg-rose-600 text-white hover:bg-rose-700" : "text-rose-700 hover:border-rose-300 hover:bg-rose-50"
                    )}
                    onClick={() => handleSubCategoryChange(null)}
                  >
                    Tous
                  </Button>
                  {availableSubCategories.map((group) => (
                    <Button
                      key={group.key}
                      variant={activeSubCategory === group.key ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "rounded-full border-rose-200",
                        activeSubCategory === group.key ? "bg-rose-600 text-white hover:bg-rose-700" : "text-rose-700 hover:border-rose-300 hover:bg-rose-50"
                      )}
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
                    className={cn(
                      "rounded-full border-rose-200",
                      activeCollection === null ? "bg-rose-600 text-white hover:bg-rose-700" : "text-rose-700 hover:border-rose-300 hover:bg-rose-50"
                    )}
                    onClick={() => setActiveCollection(null)}
                  >
                    Toutes
                  </Button>
                  {availableCollections.map((collection) => (
                    <Button
                      key={collection.key}
                      variant={activeCollection === collection.key ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "rounded-full border-rose-200",
                        activeCollection === collection.key ? "bg-rose-600 text-white hover:bg-rose-700" : "text-rose-700 hover:border-rose-300 hover:bg-rose-50"
                      )}
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
                            {group.templates.length} affiche{group.templates.length > 1 ? "s" : ""} dans ce sous-thÃ¨me
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                        {group.templates.map((template) => (
                          <TemplateCard
                            key={template.id}
                            template={template}
                            locked={isTemplateLocked(template)}
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

  if (step === "questions" && selectedTemplate) {
    const textBlocks = buildTextBlocks(inputMode, structuredTexts, freeText);
    const hasLongUnbrokenLine = textBlocks.some((block) =>
      block.text.split(/\r?\n/).some((line) => line.trim().length > 55)
    );

    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <UpgradeModal
          open={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
          config={billingConfig}
          featureLabel="Affiches"
          title="Débloquez toutes les affiches"
          description="Le mode gratuit permet de modifier une seule affiche."
        />

        <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
          <Button variant="ghost" size="icon" onClick={goBack} aria-label="Retour à la galerie">
            <ArrowLeft className="size-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900">Personnaliser l&apos;affiche</h1>
            <p className="truncate text-sm text-slate-500">{selectedTemplate.name}</p>
          </div>
        </div>

        <div className="grid gap-7 lg:grid-cols-[minmax(260px,0.72fr)_minmax(0,1.28fr)]">
          <div className="space-y-3">
            <div className="aspect-[3/4] overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              <PosterThumbnail template={selectedTemplate} className="h-full w-full object-contain" />
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <ShieldCheck className="size-4 text-emerald-600" />
              Fond original verrouillé
            </div>
            {!selectedTemplate.originalUrl && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                La source originale doit être téléversée par l&apos;administrateur avant utilisation.
              </p>
            )}
          </div>

          <div className="space-y-5">
            <div className="inline-flex w-full rounded-lg border border-slate-200 bg-slate-100 p-1 sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setInputMode("structured");
                  setGeneratedImageUrl(null);
                  setImageError("");
                }}
                className={cn(
                  "flex-1 rounded-md px-4 py-2 text-sm font-semibold transition sm:flex-none",
                  inputMode === "structured" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
                )}
              >
                Champs structurés
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputMode("free");
                  setGeneratedImageUrl(null);
                  setImageError("");
                }}
                className={cn(
                  "flex-1 rounded-md px-4 py-2 text-sm font-semibold transition sm:flex-none",
                  inputMode === "free" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
                )}
              >
                Texte libre
              </button>
            </div>

            {inputMode === "structured" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {STRUCTURED_FIELDS.map((field) => (
                  <label
                    key={field.id}
                    className={cn("block space-y-1.5", field.rows && "sm:col-span-2")}
                  >
                    <span className="text-xs font-semibold uppercase text-slate-500">{field.label}</span>
                    <textarea
                      dir="auto"
                      rows={field.rows ?? 2}
                      value={structuredTexts[field.id] ?? ""}
                      onChange={(event) => {
                        setStructuredTexts((previous) => ({ ...previous, [field.id]: event.target.value }));
                        setGeneratedImageUrl(null);
                        setCompositionPlan(null);
                        setUsedTextBlocks([]);
                        setImageError("");
                      }}
                      placeholder={field.placeholder}
                      className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                    />
                  </label>
                ))}
              </div>
            ) : (
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase text-slate-500">Informations de l’affiche</span>
                <textarea
                  dir="auto"
                  rows={14}
                  value={freeText}
                  onChange={(event) => {
                    setFreeText(event.target.value);
                    setGeneratedImageUrl(null);
                    setCompositionPlan(null);
                    setUsedTextBlocks([]);
                    setImageError("");
                  }}
                  placeholder={"Décrivez l’événement : titre, date, heure, lieu et informations utiles"}
                  className="w-full resize-y rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                />
              </label>
            )}

            <div className={cn(
              "rounded-lg border px-4 py-3 text-sm leading-6",
              hasLongUnbrokenLine
                ? "border-amber-300 bg-amber-50 text-amber-900"
                : "border-blue-200 bg-blue-50 text-blue-800",
            )}>
              <p className="font-semibold">Sélection intelligente des informations</p>
              <p className="mt-1 text-xs leading-5">
                L’IA conservera uniquement les informations essentielles pour l’affiche, sans inventer de contenu.
                {hasLongUnbrokenLine && " Vous pouvez aussi séparer les informations avec la touche Entrée."}
              </p>
            </div>

            {imageError && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {imageError}
              </p>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={goBack}>
                <ArrowLeft className="mr-2 size-4" />
                Retour
              </Button>
              <Button
                onClick={() => void generateImage()}
                disabled={loading || textBlocks.length === 0 || !selectedTemplate.originalUrl}
                className="bg-rose-700 text-white hover:bg-rose-800"
              >
                {loading ? (
                  <><Loader2 className="mr-2 size-4 animate-spin" /> Analyse et composition...</>
                ) : (
                  <><Sparkles className="mr-2 size-4" /> Composer l&apos;affiche</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "preview" && selectedTemplate && generatedImageUrl) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setStep("questions")} aria-label="Modifier les textes">
              <ArrowLeft className="size-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Aperçu validé</h1>
              <p className="text-sm text-slate-500">{selectedTemplate.name}</p>
            </div>
          </div>
          {visualReport?.passed && (
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <ShieldCheck className="size-4" />
              Contrôle visuel {Math.round(visualReport.score)}/100
            </div>
          )}
        </div>

        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
            <img
              src={generatedImageUrl}
              alt={`Affiche personnalisée - ${selectedTemplate.name}`}
              className="mx-auto max-h-[78vh] w-full object-contain"
            />
          </div>

          <aside className="space-y-4">
            <div className="border-b border-slate-200 pb-4">
              <p className="text-sm font-semibold text-slate-900">Informations retenues par l’IA</p>
              <div className="mt-3 space-y-2">
                {(usedTextBlocks.length > 0 ? usedTextBlocks : buildTextBlocks(inputMode, structuredTexts, freeText)).map((block) => (
                  <p key={block.id} dir="auto" className="whitespace-pre-wrap text-sm leading-5 text-slate-600">
                    {block.text}
                  </p>
                ))}
              </div>
              {textHash && <p className="mt-3 font-mono text-[11px] text-slate-400">Hash {textHash.slice(0, 16)}</p>}
            </div>

            {accepted ? (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-800">
                <Check className="size-4" />
                Affiche acceptée
              </div>
            ) : (
              <Button onClick={() => setAccepted(true)} className="w-full bg-emerald-600 text-white hover:bg-emerald-700">
                <Check className="mr-2 size-4" />
                Accepter
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => void generateImage(true)}
              disabled={loading}
              className="w-full"
            >
              {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
              Autre disposition
            </Button>

            <Button
              onClick={downloadPoster}
              loading={rendering}
              className="w-full bg-rose-700 text-white hover:bg-rose-800"
            >
              <Download className="mr-2 size-4" />
              Télécharger le PNG
            </Button>

            <Button variant="ghost" onClick={() => setStep("questions")} className="w-full">
              Modifier les textes
            </Button>
            {imageError && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {imageError}
              </p>
            )}
          </aside>
        </div>
      </div>
    );
  }

  // Legacy markup retained temporarily for data migration, never rendered.
  // ============================================================
  // RENDER - QUESTIONS DE PERSONNALISATION
  // ============================================================

  if (isLegacyPosterEditorEnabled() && step === "questions" && selectedTemplate) {
    const textZones = (selectedTemplate.design ?? []).filter((zone) => !isImageLikeZone(zone));
    const hasExactText = textZones.some(
      (zone) => (generatedTexts[zone.id] ?? "").trim().length > 0
    );

    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <UpgradeModal
          open={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
          config={billingConfig}
          featureLabel="Affiches"
          title="Débloquez toutes les affiches"
          description="Le mode gratuit permet de modifier une seule affiche. Passez au mode payant pour personnaliser toute la banque d'affiches sans limite."
        />
        {/* Header */}
        <div className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-white px-3 py-2 shadow-sm">
          <Button variant="ghost" size="icon" onClick={goBack} className="text-rose-700 hover:bg-rose-50 hover:text-rose-900">
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
        <Card className="overflow-hidden rounded-2xl border-rose-100 bg-rose-50 p-2 shadow-sm ring-1 ring-white/80">
          <div className="flex gap-4 p-4">
            <div className="w-32 shrink-0 rounded-xl border border-rose-100 bg-white p-1.5 shadow-inner">
              <div className="aspect-[3/4] overflow-hidden rounded-lg bg-slate-100">
                <PosterThumbnail
                  template={selectedTemplate}
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">{selectedTemplate.name}</h3>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                <ShieldCheck className="size-3.5" />
                Template verrouillé
              </div>
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

        {/* Textes exacts */}
        <Card className="border-rose-100 shadow-sm">
          <CardContent className="space-y-4 py-5">
            <div className="flex items-center gap-2">
              <Type className="size-4 text-rose-600" />
              <p className="text-sm font-semibold text-slate-800">Textes à ajouter</p>
            </div>

            {textZones.length > 0 ? (
              <div className="space-y-4">
                {textZones.map((zone) => (
                  <div key={zone.id} className="space-y-1.5">
                    <label
                      htmlFor={`poster-zone-${zone.id}`}
                      className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500"
                    >
                      {zone.label}
                    </label>
                    <textarea
                      id={`poster-zone-${zone.id}`}
                      dir="auto"
                      value={generatedTexts[zone.id] ?? ""}
                      onChange={(event) => {
                        setGeneratedTexts((previous) => ({
                          ...previous,
                          [zone.id]: event.target.value,
                        }));
                        setGeneratedImageUrl(null);
                        setImageError("");
                      }}
                      placeholder="Texte exact"
                      rows={2}
                      className="min-h-16 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                Cet éditeur historique est désactivé.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Répartition optionnelle */}
        {textZones.length > 0 && (
        <Card className="border-rose-100 bg-rose-50/70 shadow-sm">
          <CardContent className="space-y-4 py-5">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-rose-600" />
              <p className="text-sm font-semibold text-slate-800">Répartir des informations exactes</p>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl bg-rose-100 p-2 text-rose-700">
                  <Sparkles className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">Assistant de répartition</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Les passages reconnus sont copiés tels quels dans les champs.
                  </p>
                </div>
              </div>

              {aiChatMessages.length > 0 && (
                <div className="mt-4 max-h-44 space-y-2 overflow-y-auto rounded-2xl bg-slate-50 p-3">
                  {aiChatMessages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={cn(
                        "max-w-[90%] rounded-2xl px-3 py-2 text-xs leading-5",
                        message.role === "user"
                          ? "ml-auto bg-rose-700 text-white"
                          : "bg-white text-slate-600 shadow-sm"
                      )}
                    >
                      {message.content}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50/70 p-3">
                <textarea
                  value={aiChatPrompt}
                  onChange={(event) => setAiChatPrompt(event.target.value)}
                  onKeyDown={(event) => {
                    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                      event.preventDefault();
                      void applyAiChatToVariables();
                    }
                  }}
                  dir="auto"
                  placeholder={"Titre : [texte exact]\nDate : [texte exact]\nLieu : [texte exact]"}
                  className="min-h-[92px] w-full resize-y rounded-2xl border border-rose-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                />
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500">Ctrl/Cmd + Entrée</p>
                  <Button
                    type="button"
                    onClick={applyAiChatToVariables}
                    disabled={aiChatLoading || loading || aiChatPrompt.trim().length === 0}
                    className="rounded-2xl bg-rose-700 text-white hover:bg-rose-800"
                  >
                    {aiChatLoading ? (
                      <><Loader2 className="mr-2 size-4 animate-spin" /> Répartition...</>
                    ) : (
                      <><Sparkles className="mr-2 size-4" /> Répartir les textes</>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {imageError && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {imageError}
          </p>
        )}

        {/* Action */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={goBack} className="flex-1 border-rose-200 text-rose-800 hover:bg-rose-50 hover:text-rose-900">
            <ArrowLeft className="size-4 mr-2" /> Retour
          </Button>
          <Button
            onClick={() => void generateImage()}
            disabled={loading || !hasExactText}
            className="flex-1 bg-rose-700 text-white hover:bg-rose-800"
          >
            {loading ? (
              <><Loader2 className="size-4 mr-2 animate-spin" /> Composition...</>
            ) : (
              <><Type className="size-4 mr-2" /> Composer l&apos;affiche</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER â€” PREVIEW & Ã‰DITION
  // ============================================================

  if (isLegacyPosterEditorEnabled() && step === "preview" && selectedTemplate) {
    const zones = (selectedTemplate.design as DesignZone[])
      .filter((zone) => !isImageLikeZone(zone));

    return (
      <div className="space-y-6">
        <UpgradeModal
          open={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
          config={billingConfig}
          featureLabel="Affiches"
          title="Débloquez toutes les affiches"
          description="Le mode gratuit permet de modifier une seule affiche. Passez au mode payant pour personnaliser toute la banque d'affiches sans limite."
        />
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
            className="bg-rose-700 text-white hover:bg-rose-800"
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
                  alt={`Affiche personnalisée - ${selectedTemplate.name}`}
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
                  className="absolute cursor-pointer rounded transition-all hover:outline hover:outline-2 hover:outline-dashed hover:outline-rose-500"
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
                    dir="auto"
                    className="flex h-full w-full items-center justify-center whitespace-pre-wrap p-1 leading-tight"
                    style={{
                      fontSize: `${zone.fontSize * 0.6}px`,
                      color: zone.color,
                      fontFamily: zone.fontFamily,
                      textAlign: zone.align ?? "center",
                    }}
                  >
                    {generatedTexts[zone.id] ?? ""}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Panneau d'édition des textes */}
          <div className="space-y-4">
            {/* Recomposition déterministe de l'image */}
            <Card className="border-rose-100 bg-rose-50/70">
              <CardContent className="space-y-3 py-4">
                <div className="flex items-center gap-2">
                  <Type className="size-4 text-rose-600" />
                  <p className="text-sm font-semibold text-slate-700">Mettre à jour l&apos;affiche</p>
                </div>
                <p className="text-sm leading-6 text-slate-500">
                  Le fond reste verrouillé. Seuls les calques de texte ci-dessous sont recomposés.
                </p>
                {imageError && <p className="text-sm font-medium text-red-600">{imageError}</p>}
                <Button
                  onClick={() => void generateImage()}
                  disabled={loading}
                  className="w-full bg-rose-700 text-white hover:bg-rose-800"
                >
                  {loading ? (
                    <><Loader2 className="size-4 mr-2 animate-spin" /> Composition...</>
                  ) : (
                    <><Type className="size-4 mr-2" /> {generatedImageUrl ? "Mettre à jour" : "Composer l'affiche"}</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {zones.length > 0 && (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 mb-4">
                  <Pencil className="size-4 text-rose-600" />
                  <p className="text-sm font-semibold text-slate-700">Textes ajoutés</p>
                </div>

                <div className="space-y-3">
                  {zones.map((zone) => (
                    <div key={zone.id}>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">
                        {zone.label}
                      </label>
                      {editingZone === zone.id ? (
                          <div className="flex gap-2">
                            <textarea
                              dir="auto"
                              rows={2}
                              value={generatedTexts[zone.id] ?? ""}
                              onChange={(e) => {
                                setGeneratedTexts((prev) => ({
                                  ...prev,
                                  [zone.id]: e.target.value,
                                }));
                                setGeneratedImageUrl(null);
                                setImageError("");
                              }}
                              autoFocus
                              className="min-h-16 flex-1 resize-y rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
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
                          <p dir="auto" className="flex-1 whitespace-pre-wrap text-sm text-slate-800">
                            {generatedTexts[zone.id] || "Zone vide"}
                          </p>
                          <Pencil className="size-3.5 text-slate-300 transition-colors group-hover:text-rose-600" />
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
              className="h-12 w-full bg-rose-700 text-base text-white hover:bg-rose-800"
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
