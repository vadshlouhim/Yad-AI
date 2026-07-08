import type { BillingGate } from "@/lib/billing";
import { getBillingGate } from "@/lib/billing";
import type { AssistantToolContext } from "../types";

/**
 * Résout le gate billing : réutilise celui pré-calculé par le chat route, sinon
 * le recalcule (confirmation différée d'un PendingAction, voie directe /api/ai/action).
 * Retourne null si aucun userId (exécution issue d'une automation) — les handlers
 * ne gatent alors pas, comportement historique de l'exécuteur.
 */
export async function resolveGate(ctx: AssistantToolContext): Promise<BillingGate | null> {
  if (ctx.gate) return ctx.gate;
  if (!ctx.userId) return null;
  return getBillingGate(ctx.admin, ctx.userId);
}

export function frDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function frDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export function panelId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function truncate(text: string, max = 90): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}
