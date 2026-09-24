import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export async function getPosterSource(
  admin: SupabaseClient<Database>,
  communityId: string,
  mediaId: unknown,
  userId?: string,
) {
  if (typeof mediaId !== "string" || !mediaId) return null;
  let query = admin
    .from("MediaFile")
    .select("*")
    .eq("id", mediaId)
    .eq("communityId", communityId)
    .eq("source", "TEMPLATE_GENERATION");
  if (userId) query = query.eq("userId", userId);
  const { data, error } = await query.single();
  if (error || !data || !data.templateId || !data.publicId.startsWith(`generated-ai/${communityId}/`)) throw new Error("Affiche source introuvable ou inaccessible.");
  return data;
}

export async function assertPosterEditSchema(admin: SupabaseClient<Database>) {
  const { error } = await admin.from("MediaFile").select("id, editState", { head: true }).limit(1);
  if (error) {
    console.error("[Poster edit schema]", error.code, error.message);
    throw new Error("La sauvegarde des affiches est temporairement indisponible. Réessayez après la mise à jour du service.");
  }
}

export function trustedCommunityLogo(value: unknown, communityId: string): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    const origin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    const path = decodeURIComponent(url.pathname);
    return !url.username && !url.password && !path.split("/").some((part) => part === "." || part === "..") && url.protocol === origin.protocol && url.host === origin.host && path.startsWith(`/storage/v1/object/public/community-assets/${communityId}/`) ? url.toString() : null;
  } catch { return null; }
}

export function logoEditInstructions(logoUrl: string | null): string {
  return logoUrl ? "The second reference image is the official community logo. Replace any previous community logo with this exact logo once in the existing branding area. Keep it fully visible, never redraw, crop, distort or recolor it. This explicit logo replacement is the only permitted graphical change. Never print its URL." : "Preserve the existing logo. Do not invent a logo.";
}
