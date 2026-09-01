"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import { ArrowLeft, ImageIcon, Paintbrush, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORY_EMOJI, CATEGORY_LABELS } from "@/lib/templates/shared";
import { cn } from "@/lib/utils";

export interface PosterGalleryTemplate {
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

interface PosterStatus {
  label: string;
  className: string;
}

interface Props {
  templates: PosterGalleryTemplate[];
  onSelect: (template: PosterGalleryTemplate) => void;
  getStatus?: (template: PosterGalleryTemplate) => PosterStatus;
  galleryTitle?: string;
  gallerySubtitle?: string;
  showGalleryFilters?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

const CATEGORY_TONES = [
  "border-blue-300 bg-blue-50 text-blue-700",
  "border-teal-300 bg-teal-50 text-teal-700",
  "border-amber-300 bg-amber-50 text-amber-800",
  "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700",
  "border-violet-300 bg-violet-50 text-violet-700",
  "border-rose-300 bg-rose-50 text-rose-700",
];

const JEWISH_CALENDAR_ORDER = [
  "Tichri", "19 Kisslev", "Hannoucah", "Didan Notsah", "Youd Chavat", "Tou Bichvat", "Pourim", "Youd Aleph Nissan", "Pessah", "Lag Baomer", "Chavouot", "Guimel Tamouz",
];

function splitSubCategory(value: string | null) {
  return value?.split(" › ").map((part) => part.trim()).filter(Boolean) ?? [];
}

function sortSubCategories(values: string[], category: string | null) {
  return [...values].sort((left, right) => {
    if (category === "HOLIDAY") {
      const leftIndex = JEWISH_CALENDAR_ORDER.indexOf(left);
      const rightIndex = JEWISH_CALENDAR_ORDER.indexOf(right);
      if (leftIndex >= 0 || rightIndex >= 0) return (leftIndex < 0 ? 999 : leftIndex) - (rightIndex < 0 ? 999 : rightIndex);
    }
    return left.localeCompare(right, "fr");
  });
}

export function posterTemplateImage(template: PosterGalleryTemplate) {
  return template.previewUrl ?? template.thumbnailUrl ?? template.originalUrl;
}

export function PosterGallery({
  templates,
  onSelect,
  getStatus = () => ({ label: "Voir l'affiche", className: "text-[#d92d7c]" }),
  galleryTitle = "BANQUE D'AFFICHES",
  gallerySubtitle = "Choisissez une affiche et décrivez simplement les textes à modifier.",
  showGalleryFilters = true,
  emptyTitle = "Aucune affiche trouvée",
  emptyDescription = "Modifiez votre recherche ou choisissez une autre catégorie.",
}: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [subCategoryPath, setSubCategoryPath] = useState<string[]>([]);

  const categories = useMemo(() => [...new Set(templates.map((template) => template.category))], [templates]);
  const filteredTemplates = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("fr");
    return templates.filter((template) => {
      if (category && template.category !== category) return false;
      if (subCategoryPath.length && !subCategoryPath.every((part, index) => splitSubCategory(template.subCategory)[index] === part)) return false;
      if (!needle) return true;
      return [template.name, template.description ?? "", template.subCategory ?? "", ...(template.tags ?? [])]
        .join(" ")
        .toLocaleLowerCase("fr")
        .includes(needle);
    });
  }, [category, search, subCategoryPath, templates]);
  const nextSubCategories = useMemo(() => {
    if (!category) return [];
    const options = new Set<string>();
    for (const template of templates) {
      if (template.category !== category) continue;
      const parts = splitSubCategory(template.subCategory);
      if (subCategoryPath.every((part, index) => parts[index] === part) && parts[subCategoryPath.length]) {
        options.add(parts[subCategoryPath.length]);
      }
    }
    return sortSubCategories(Array.from(options), category);
  }, [category, subCategoryPath, templates]);

  return (
    <div className="space-y-7">
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
                aria-label="Rechercher une affiche"
                className="w-full rounded-2xl border border-violet-100 bg-white py-3.5 pl-10 pr-4 text-sm shadow-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <button
                type="button"
                onClick={() => { setCategory(null); setSubCategoryPath([]); }}
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
                  onClick={() => { setCategory(item); setSubCategoryPath([]); }}
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
            {category && nextSubCategories.length > 0 ? (
              <div className="rounded-[1.5rem] border border-violet-100 bg-white p-3.5 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.13em] text-violet-700">
                    {subCategoryPath.length ? subCategoryPath.join(" · ") : "Choisissez un thème"}
                  </p>
                  {subCategoryPath.length > 0 ? <button type="button" onClick={() => setSubCategoryPath((path) => path.slice(0, -1))} className="inline-flex items-center gap-1 rounded-xl bg-violet-50 px-2.5 py-1.5 text-xs font-black text-violet-700 hover:bg-violet-100"><ArrowLeft className="size-3.5" />Retour</button> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {nextSubCategories.map((item, index) => <button key={item} type="button" onClick={() => setSubCategoryPath((path) => [...path, item])} className={cn("min-h-11 rounded-2xl border px-3.5 text-sm font-black transition hover:-translate-y-0.5", CATEGORY_TONES[(index + 1) % CATEGORY_TONES.length])}>{item}<span className="ml-1.5 opacity-65">{templates.filter((template) => template.category === category && [...subCategoryPath, item].every((part, pathIndex) => splitSubCategory(template.subCategory)[pathIndex] === part)).length}</span></button>)}
                </div>
              </div>
            ) : null}
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
            const image = posterTemplateImage(template);
            const status = getStatus(template);
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => onSelect(template)}
                className="group overflow-hidden rounded-[1.4rem] border border-violet-100 bg-white text-left shadow-[0_10px_28px_rgba(66,19,136,0.08)] transition hover:-translate-y-1 hover:border-violet-300 hover:shadow-[0_18px_38px_rgba(66,19,136,0.14)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300 sm:rounded-[1.6rem]"
              >
                <div className="aspect-[3/4] overflow-hidden bg-[#f7f3ee] p-1.5 sm:p-2">
                  {image ? (
                    <img
                      src={image}
                      alt={template.name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full rounded-[1rem] object-contain transition duration-300 group-hover:scale-[1.015]"
                    />
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
                  <p className={cn("mt-1 text-xs font-semibold", status.className)}>{status.label}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
