import type { Metadata } from "next";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { PublicPosterGallery } from "@/components/templates/public-poster-gallery";
import type { PosterGalleryTemplate } from "@/components/templates/poster-gallery";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTemplateAssetUrl } from "@/lib/templates/shared";
import { getLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const he = (await getLocale()) === "he";
  const title = he ? "מודעות ופליירים — EasyCom IA" : "Affiches et visuels — EasyCom IA";
  const description = he ? "גלו את מאגר המודעות הציבורי של EasyCom IA ואת התבניות שאפשר להתאים בעזרת AI." : "Parcourez la banque publique d'affiches EasyCom IA et découvrez les modèles personnalisables avec l'intelligence artificielle.";
  return { title, description, alternates: { canonical: "/affiches" }, openGraph: { title, description, url: "/affiches", type: "website", locale: he ? "he_IL" : "fr_FR" } };
}

export default async function PublicPostersPage() {
  const admin = createAdminClient();
  const { data: templates, error } = await admin
    .from("Template")
    .select("id, name, description, category, subCategory, originalUrl, thumbnailUrl, previewUrl, supportsAi, canvaUrl, isGlobal, isPremium, tags, usageCount")
    .eq("isActive", true)
    .eq("isGlobal", true)
    .order("category", { ascending: true })
    .order("subCategory", { ascending: true })
    .order("usageCount", { ascending: false });

  if (error) {
    console.error("[Public posters] Unable to load templates:", error);
  }

  const publicTemplates: PosterGalleryTemplate[] = (templates ?? []).map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    category: template.category,
    subCategory: template.subCategory,
    originalUrl: resolveTemplateAssetUrl(template.originalUrl),
    thumbnailUrl: resolveTemplateAssetUrl(template.thumbnailUrl),
    previewUrl: resolveTemplateAssetUrl(template.previewUrl),
    supportsAi: template.supportsAi,
    hasCanva: Boolean(template.canvaUrl),
    isGlobal: template.isGlobal,
    isPremium: template.isPremium,
    tags: template.tags ?? [],
    usageCount: template.usageCount,
  }));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <PublicNavbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <PublicPosterGallery templates={publicTemplates} />
      </main>
      <PublicFooter />
    </div>
  );
}
