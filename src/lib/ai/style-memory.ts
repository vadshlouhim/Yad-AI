import { createAdminClient } from "@/lib/supabase/admin";

function buildStyleHints(original: string, updated: string) {
  const hints: string[] = [];
  if (updated.length < original.length * 0.85) hints.push("Préférer des messages plus concis.");
  if (updated.length > original.length * 1.15) hints.push("Préférer des messages plus détaillés.");
  if (/[!?]{2,}/.test(original) && !/[!?]{2,}/.test(updated)) hints.push("Limiter la ponctuation expressive.");
  if (/\n/.test(updated) && !/\n/.test(original)) hints.push("Structurer en plusieurs lignes lisibles.");
  if (/#\w+/.test(original) && !/#\w+/.test(updated)) hints.push("Réduire l'usage des hashtags.");
  return hints;
}

export async function learnUserStylePreference(params: {
  communityId: string;
  originalBody: string;
  updatedBody: string;
}) {
  const { communityId, originalBody, updatedBody } = params;
  if (!originalBody || !updatedBody || originalBody === updatedBody) return;

  const hints = buildStyleHints(originalBody, updatedBody);
  if (hints.length === 0) return;

  const admin = createAdminClient();
  const now = new Date().toISOString();
  await admin.from("AIMemory").upsert(
    {
      id: crypto.randomUUID(),
      communityId,
      type: "CONTENT_STYLE",
      key: "user_style_preferences",
      relevance: 0.95,
      value: {
        learnedAt: now,
        hints,
        sampleOriginal: originalBody.slice(0, 400),
        sampleUpdated: updatedBody.slice(0, 400),
      },
      updatedAt: now,
    },
    { onConflict: "communityId,type,key" },
  );

  const { data: community } = await admin.from("Community").select("editorialRules").eq("id", communityId).single();
  const existingRules = (community?.editorialRules ?? "").trim();
  const merged = [...new Set([...(existingRules ? [existingRules] : []), ...hints])].join("\n");
  await admin.from("Community").update({ editorialRules: merged, updatedAt: now }).eq("id", communityId);
}
