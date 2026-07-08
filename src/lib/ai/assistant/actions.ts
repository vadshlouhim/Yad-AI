import type { createAdminClient } from "@/lib/supabase/admin";
import type { BillingGate } from "@/lib/billing";
import { getToolDef } from "./registry";
import { resolveSensitivity } from "./permissions";
import type { ExecuteResult } from "./types";

// Façade de compatibilité de l'exécuteur d'actions.
// La logique vit désormais dans les définitions d'outils (tools/*, via registry).
// Conservée pour pending.ts et /api/ai/action : signatures inchangées, et les
// PendingAction déjà en base (kind = nom d'outil) restent exécutables.

type Admin = ReturnType<typeof createAdminClient>;

export type ActionKind = string;

export type { ExecuteResult };

export interface ExecuteContext {
  admin: Admin;
  communityId: string;
  userId: string | null;
  gate?: BillingGate;
}

/** Une action est "mutante" si sa sensibilité est REVERSIBLE ou IRREVERSIBLE. */
export function isMutatingAction(kind: string): boolean {
  const sensitivity = resolveSensitivity(kind);
  return sensitivity === "REVERSIBLE" || sensitivity === "IRREVERSIBLE";
}

export function actionLabelFor(kind: string): string {
  return getToolDef(kind)?.label ?? "Action de l'assistant";
}

// Produit un résumé lisible de l'action (affiché sur la carte, l'email, la notif).
export function summarizeAction(kind: string, payload: Record<string, unknown>): string {
  const def = getToolDef(kind);
  if (!def) return "Action de l'assistant.";
  try {
    return def.summarize(payload);
  } catch {
    return `${def.label}.`;
  }
}

// Exécute réellement une action. Utilisé immédiatement en mode AUTO,
// ou après validation utilisateur (PendingAction / carte de panneau).
export async function executeAction(
  ctx: ExecuteContext,
  kind: string,
  payload: Record<string, unknown>
): Promise<ExecuteResult> {
  const def = getToolDef(kind);
  if (!def?.execute) {
    return { success: false, message: `Action inconnue : ${kind}.` };
  }
  try {
    return await def.execute(ctx, payload);
  } catch (error) {
    return { success: false, message: `Erreur : ${(error as Error).message}` };
  }
}
