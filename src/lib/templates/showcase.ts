import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTemplateAssetUrl } from "@/lib/templates/shared";

export type ShowcasePoster = { id: string; imageUrl: string };

/**
 * Real posters from the public gallery, most used first, for the home page slideshow.
 * Cached for an hour so the home page never waits on the database.
 */
export const getShowcasePosters = unstable_cache(
  async (locale: string): Promise<ShowcasePoster[]> => {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("Template")
      .select("id, thumbnailUrl")
      .eq("isActive", true)
      .eq("isGlobal", true)
      .contains("languages", [locale === "he" ? "he" : "fr"])
      .not("thumbnailUrl", "is", null)
      .order("usageCount", { ascending: false })
      .limit(12);
    if (error) {
      console.error("[Home showcase] Unable to load posters:", error);
      return [];
    }
    return (data ?? []).flatMap((template) => {
      const imageUrl = resolveTemplateAssetUrl(template.thumbnailUrl);
      return imageUrl ? [{ id: template.id, imageUrl }] : [];
    });
  },
  ["home-showcase-posters"],
  { revalidate: 3600 },
);
