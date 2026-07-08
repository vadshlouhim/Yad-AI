import type { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";

type Admin = ReturnType<typeof createAdminClient>;

/** Génère un slug unique en ajoutant un compteur si nécessaire ("nom", "nom-1", "nom-2"...) */
export async function slugifyUnique(admin: Admin, name: string): Promise<string> {
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const { data: existing } = await admin.from("Community").select("id").eq("slug", slug).maybeSingle();
    if (!existing) return slug;
    slug = `${baseSlug}-${counter++}`;
  }
}

/**
 * Le sélecteur de type de structure a été retiré de l'onboarding : toute nouvelle
 * communauté est créée en "ASSOCIATION" par défaut (modifiable plus tard dans les
 * Paramètres). Cette fonction reste isolée pour ne pas dépendre du défaut Prisma
 * (`SYNAGOGUE`), qui serait incorrect ici.
 */
export function defaultCommunityType(): "ASSOCIATION" {
  return "ASSOCIATION";
}
