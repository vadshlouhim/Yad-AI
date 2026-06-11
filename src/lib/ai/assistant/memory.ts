import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

// Types de mémoire alignés sur l'enum AIMemoryType du schéma.
const VALID_MEMORY_TYPES = new Set([
  "EDITORIAL_PREFERENCE",
  "EVENT_PATTERN",
  "CONTENT_STYLE",
  "CHANNEL_PREFERENCE",
  "VOCABULARY",
  "RECURRING_CONTENT",
  "USER_FEEDBACK",
]);

export interface RememberInput {
  type: string;
  key: string;
  value: unknown;
}

// Enregistre (ou met à jour) un fait mémorisé sur la communauté.
// Upsert sur (communityId, type, key) — contrainte unique du schéma.
export async function rememberFact(
  admin: Admin,
  communityId: string,
  input: RememberInput
): Promise<{ success: boolean; message: string }> {
  const type = VALID_MEMORY_TYPES.has(input.type) ? input.type : "USER_FEEDBACK";
  const key = String(input.key ?? "").trim().slice(0, 120);
  if (!key) return { success: false, message: "Clé de mémoire vide." };

  const now = new Date().toISOString();
  const value = typeof input.value === "string" ? input.value : input.value ?? null;

  const { data: existing } = await admin
    .from("AIMemory")
    .select("id")
    .eq("communityId", communityId)
    .eq("type", type)
    .eq("key", key)
    .maybeSingle();

  if (existing) {
    await admin
      .from("AIMemory")
      .update({ value, relevance: 1.0, updatedAt: now })
      .eq("id", (existing as { id: string }).id);
  } else {
    await admin.from("AIMemory").insert({
      id: crypto.randomUUID(),
      communityId,
      type,
      key,
      value,
      relevance: 1.0,
      createdAt: now,
      updatedAt: now,
    });
  }

  return { success: true, message: "Information mémorisée." };
}
