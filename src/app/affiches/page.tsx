import type { Metadata } from "next";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { PublicPosterGallery } from "@/components/templates/public-poster-gallery";
import type { PosterGalleryTemplate } from "@/components/templates/poster-gallery";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTemplateAssetUrl } from "@/lib/templates/shared";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Affiches et visuels — EasyCom IA",
  description: "Parcourez la banque publique d'affiches EasyCom IA et découvrez les modèles personnalisables avec l'intelligence artificielle.",
  alternates: { canonical: "/affiches" },
  openGraph: {
    title: "Affiches et visuels — EasyCom IA",
    description: "Découvrez toutes les affiches publiques disponibles dans la banque visuelle EasyCom IA.",
    url: "/affiches",
    type: "website",
  },
};

export default async function PublicPostersPage() {
  const admin = createAdminClient();
  const { data: templates, error } = await admin
    .from("Template")
    .select("id, name, description, category, subCategory, originalUrl, thumbnailUrl, previewUrl, isGlobal, isPremium, tags, usageCount")
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
