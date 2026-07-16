"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, ArrowLeft, Download, Check,
  Pencil, Crown, ImageIcon, Loader2, Paintbrush, Search, X, Lock,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UpgradeModal } from "@/components/billing/upgrade-modal";
import { AgentPageBanner } from "@/components/dashboard/agent-page-banner";
import type { BillingConfig, BillingUsage } from "@/lib/billing";
import {
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
} from "@/lib/templates/shared";

const CHATGPT_VISUAL_CREATOR_URL =
  "https://chatgpt.com/g/g-6a57add3a0d08191b66d9d72eac619a7-createur-d-affiches-visuels-by-easycom-ai";
const ZALMAN_VISUALS_AGENT_IMAGE_URL = "/agents/zalman-visuals-transparent.png";

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

function formatShabbatAutoValue(shabbatTimes: TemplateShabbatTimes | null): string {
  if (!shabbatTimes?.entry) return "Entrée : 20h41\nSortie : 21h53";
  return [
    shabbatTimes.parasha ? `Paracha : ${shabbatTimes.parasha}` : null,
    `Entrée : ${shabbatTimes.entry}`,
    shabbatTimes.exit ? `Sortie : ${shabbatTimes.exit}` : null,
  ].filter(Boolean).join("\n");
}

function buildDefaultZoneValue(zone: DesignZone, community: Community, shabbatTimes: TemplateShabbatTimes | null): string {
  const key = getZoneVariableKey(zone);

  if (key === "BET_DIN_NAME" || key === "ORGANIZATION_NAME") return community.name;
  if (key === "LOCATION") return community.city ?? community.address ?? zone.defaultText;
  if (key === "CONTACT") return community.phone ?? community.email ?? community.website ?? zone.defaultText;
  if (key === "USER_LOGO") return community.logoUrl ?? zone.defaultText;
  if (key === "TITLE") return community.name;
  if (key === "SUBTITLE") return community.city ? `Ã€ ${community.city}` : zone.defaultText;
  if (key === "MESSAGE") return "Shabbat Shalom Ã  tous.";
  if (key === "SHABBAT_TIMES") return formatShabbatAutoValue(shabbatTimes);

  return zone.defaultText || `{{${key}}}`;
}

function looksLikeMediaUrl(value: string): boolean {
  return /^https?:\/\/\S+/i.test(value) || /^data:image\//i.test(value);
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

function getZoneDisplayValue(zone: DesignZone, value: string): string {
  if (isImageLikeZone(zone) && looksLikeMediaUrl(value)) {
    return "Photo ajoutée";
  }

  return value;
}

function buildInitialGeneratedTexts(template: Template, community: Community, shabbatTimes: TemplateShabbatTimes | null): Record<string, string> {
  return Object.fromEntries(
    (template.design ?? []).map((zone) => [zone.id, buildDefaultZoneValue(zone, community, shabbatTimes)])
  );
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
type AiChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function TemplatesClient({
  templates,
  community,
  shabbatTimes,
  plan,
  billingConfig,
  billingUsage,
  galleryTitle = "BANQUE D'AFFICHES",
  gallerySubtitle = "Choisissez parmi plus de 250 affiches prêtes à personnaliser, ajoutez vos informations, puis laissez l'IA adapter le modèle et le publier en un clic.",
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
  const [generatedTexts, setGeneratedTexts] = useState<Record<string, string>>({});
  const [aiChatPrompt, setAiChatPrompt] = useState("");
  const [aiChatMessages, setAiChatMessages] = useState<AiChatMessage[]>([]);
  const [aiChatLoading, setAiChatLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [editingZone, setEditingZone] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
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
    setGeneratedTexts(buildInitialGeneratedTexts(template, community, shabbatTimes));
    setAiChatPrompt("");
    setAiChatMessages([]);
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

  async function applyAiChatToVariables() {
    if (!selectedTemplate) return;
    const prompt = aiChatPrompt.trim();
    if (!prompt) {
      setImageError("Expliquez Ã  l'assistant ce que vous voulez modifier sur l'affiche.");
      return;
    }

    setImageError("");
    setAiChatLoading(true);
    setAiChatMessages((previous) => [...previous, { role: "user", content: prompt }]);

    try {
      const response = await fetch("/api/templates/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          answers: {
            instruction: prompt,
            valeurs_actuelles: generatedTexts,
            contexte: "Remplis et rédige les variables de l'affiche. Garde les informations automatiques cohérentes si elles sont déjà évidentes.",
          },
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Impossible de remplir les variables avec l'IA.");
      }

      const nextTexts = payload.generatedTexts && typeof payload.generatedTexts === "object"
        ? payload.generatedTexts as Record<string, string>
        : {};

      const mergedTexts = { ...generatedTexts, ...nextTexts };
      setGeneratedTexts(mergedTexts);
      setAiChatPrompt("");
      setAiChatMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: "J'ai rempli les variables. Je crée maintenant l'affiche finale.",
        },
      ]);
      await generateImage(mergedTexts);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de remplir les variables avec l'IA.";
      setImageError(message);
      setAiChatMessages((previous) => [...previous, { role: "assistant", content: message }]);
    } finally {
      setAiChatLoading(false);
    }
  }

  async function generateImage(textsOverride?: Record<string, string>) {
    if (!selectedTemplate) return;
    if ((selectedTemplate.design ?? []).length === 0) {
      setImageError("Ce modèle n'a pas encore de zones dynamiques configurées dans l'administration.");
      return;
    }

    setImageError("");
    setLoading(true);
    try {
      const res = await fetch("/api/templates/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: selectedTemplate.id, generatedTexts: textsOverride ?? generatedTexts }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "PAYWALL_REQUIRED") {
          setUpgradeOpen(true);
          return;
        }
        throw new Error(data.error ?? "Impossible de gÃ©nÃ©rer l'affiche.");
      }
      setGeneratedImageUrl(data.imageUrl);
      setStep("preview");
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Impossible de gÃ©nÃ©rer l'affiche.");
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
        if (data.code === "PAYWALL_REQUIRED") {
          setUpgradeOpen(true);
          return;
        }
        throw new Error(data.error ?? "Impossible de gÃ©nÃ©rer l'affiche");
      }

      window.open(data.imageUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error(error);
      alert("Impossible de gÃ©nÃ©rer l'affiche pour le moment.");
    } finally {
      setRendering(false);
    }
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
                Je suis Zalman, votre agent IA créatif pour personnaliser et créer vos visuels
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
            <a
              href={CHATGPT_VISUAL_CREATOR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-center text-xs font-bold text-rose-800 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-400 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100 sm:w-auto"
            >
              <Sparkles className="size-3.5" />
              <span>Vous ne trouvez pas ? Créez une images avec ChatGPT by EasyCom AI</span>
              <ExternalLink className="size-3.5" />
            </a>
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

  // ============================================================
  // RENDER - QUESTIONS DE PERSONNALISATION
  // ============================================================

  if (step === "questions" && selectedTemplate) {
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
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">{selectedTemplate.name}</h3>
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
        <Card className="border-rose-100 shadow-sm">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="size-4 text-rose-600" />
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
        <Card className="border-rose-100 bg-rose-50/70 shadow-sm">
          <CardContent className="space-y-4 py-5">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-800">
                <Sparkles className="size-3.5" />
                Assistant IA
              </div>
              <p className="text-sm font-semibold text-slate-800">
                Renseignez les variables détectées sur ce modèle. Le système compose ensuite automatiquement l&apos;image finale.
              </p>
            </div>

            <div className="rounded-3xl border border-rose-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-2xl bg-rose-100 p-2 text-rose-700">
                  <Sparkles className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">Chat de personnalisation IA</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Expliquez ce que vous voulez : l&apos;assistant remplit les variables, rédige le message et adapte les textes du modèle.
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
                  placeholder="Décrivez les ajustements souhaités pour votre affiche..."
                  className="min-h-[92px] w-full resize-y rounded-2xl border border-rose-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                />
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500">Astuce : Ctrl/Cmd + Entrée pour créer.</p>
                  <Button
                    type="button"
                    onClick={applyAiChatToVariables}
                    disabled={aiChatLoading || loading || aiChatPrompt.trim().length === 0 || (selectedTemplate.design ?? []).length === 0}
                    className="rounded-2xl bg-rose-700 text-white hover:bg-rose-800"
                  >
                    {aiChatLoading || loading ? (
                      <><Loader2 className="mr-2 size-4 animate-spin" /> Création de l&apos;affiche...</>
                    ) : (
                      <><Sparkles className="mr-2 size-4" /> Créer l&apos;affiche</>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {(selectedTemplate.design ?? []).length === 0 && (
              <div className="rounded-3xl border border-rose-200 bg-white p-4 shadow-inner">
                <p className="rounded-2xl border border-dashed border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                  Ce modèle n&apos;a pas encore de zones dynamiques. Ajoutez-les depuis l&apos;administration avant de générer l&apos;image finale.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {imageError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
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
            disabled={loading || (selectedTemplate.design ?? []).length === 0}
            className="flex-1 bg-rose-700 text-white hover:bg-rose-800"
          >
            {loading ? (
              <><Loader2 className="size-4 mr-2 animate-spin" /> Création de l&apos;image...</>
            ) : (
              <><Sparkles className="size-4 mr-2" /> Créer l&apos;image finale</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER â€” PREVIEW & Ã‰DITION
  // ============================================================

  if (step === "preview" && selectedTemplate) {
    const zones = selectedTemplate.design as DesignZone[];

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
                  alt={`Affiche générée - ${selectedTemplate.name}`}
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
            {/* Recomposition déterministe de l'image */}
            <Card className="border-rose-100 bg-rose-50/70">
              <CardContent className="space-y-3 py-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-rose-600" />
                  <p className="text-sm font-semibold text-slate-700">Recomposer l&apos;image finale</p>
                </div>
                <p className="text-sm leading-6 text-slate-500">
                  Modifiez les textes ci-dessous puis recréez l&apos;image. Le rendu applique simplement les zones
                  configurées par l&apos;administrateur sur le fond graphique.
                </p>
                {imageError && <p className="text-sm font-medium text-red-600">{imageError}</p>}
                <Button
                  onClick={() => void generateImage()}
                  disabled={loading}
                  className="w-full bg-rose-700 text-white hover:bg-rose-800"
                >
                  {loading ? (
                    <><Loader2 className="size-4 mr-2 animate-spin" /> Création de l&apos;image...</>
                  ) : (
                    <><Sparkles className="size-4 mr-2" /> {generatedImageUrl ? "Recréer l'image" : "Créer l'image"}</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {zones.length > 0 && (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 mb-4">
                  <Pencil className="size-4 text-rose-600" />
                  <p className="text-sm font-semibold text-slate-700">Variables du modèle</p>
                </div>

                <div className="space-y-3">
                  {zones.map((zone) => (
                    <div key={zone.id}>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">
                        {zone.label}
                      </label>
                      {editingZone === zone.id ? (
                        isImageLikeZone(zone) ? (
                          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                            <p className="flex-1 text-sm text-slate-700">Photo ajoutée automatiquement</p>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setEditingZone(null)}
                            >
                              <Check className="size-4 text-emerald-600" />
                            </Button>
                          </div>
                        ) : (
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
                              className="flex-1 rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setEditingZone(null)}
                            >
                              <Check className="size-4 text-emerald-600" />
                            </Button>
                          </div>
                        )
                      ) : (
                        <div
                          className="group flex items-center gap-2 cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 hover:border-blue-300 transition-colors"
                          onClick={() => setEditingZone(zone.id)}
                        >
                          <p className="flex-1 text-sm text-slate-800">
                            {getZoneDisplayValue(zone, generatedTexts[zone.id] ?? zone.defaultText)}
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
