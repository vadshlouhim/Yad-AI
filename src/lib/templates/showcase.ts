import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTemplateAssetUrl } from "@/lib/templates/shared";
import { isScheduleTimesTemplate } from "@/lib/templates/taxonomy";

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
      .select("id, thumbnailUrl, category, subCategory, tags")
      .eq("isActive", true)
      .eq("isGlobal", true)
      .contains("languages", [locale === "he" ? "he" : "fr"])
      .not("thumbnailUrl", "is", null)
      .order("usageCount", { ascending: false })
      .limit(40);
    if (error) {
      console.error("[Home showcase] Unable to load posters:", error);
      return [];
    }
    return (data ?? []).filter((template) => !isScheduleTimesTemplate(template)).flatMap((template) => {
      const imageUrl = resolveTemplateAssetUrl(template.thumbnailUrl);
      return imageUrl ? [{ id: template.id, imageUrl }] : [];
    }).slice(0, 12);
  },
  ["home-showcase-posters-v2"],
  { revalidate: 3600 },
);
