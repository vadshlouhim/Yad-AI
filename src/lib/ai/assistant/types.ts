import type { ChatCompletionFunctionTool } from "openai/resources/chat/completions";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { BillingGate } from "@/lib/billing";
import type { DataPanel } from "./panels";

type Admin = ReturnType<typeof createAdminClient>;

/** Contexte d'exécution d'un outil (lecture ou mutation). */
export interface AssistantToolContext {
  admin: Admin;
  communityId: string;
  userId: string | null;
  /**
   * Gate billing pré-calculé par le chat route quand disponible. Les handlers qui en
   * ont besoin le recalculent s'il est absent (ex. confirmation différée d'un
   * PendingAction via /api/ai/action, où il n'est pas fourni).
   */
  gate?: BillingGate;
}

export interface ExecuteResult {
  success: boolean;
  message: string;
  /** Code structuré consommé par /api/ai/action et le client (modal upgrade). */
  code?: "PAYWALL_REQUIRED";
  data?: Record<string, unknown>;
}

/** Résultat d'un outil de lecture : version compacte pour le LLM + panneau riche optionnel pour le client. */
export interface ReadResult {
  llmResult: unknown;
  panel?: DataPanel;
}

/** Contexte de construction du catalogue (filtrage par palier, variantes de description). */
export interface BuildToolsContext {
  gmailConnected: boolean;
  tier: BillingGate["tier"];
  isPaid: boolean;
  isSuperAdmin: boolean;
}

/**
 * Définition complète d'un outil de l'assistant : schéma OpenAI, libellés FR,
 * et handler de lecture (`read`) ou de mutation (`execute`). La sensibilité et
 * les gates de palier vivent dans permissions.ts (source de vérité séparée,
 * invariant 1:1 vérifié par le registre).
 */
export interface AssistantToolDef {
  name: string;
  schema: ChatCompletionFunctionTool;
  /** Libellé FR court (cartes, notifications). */
  label: string;
  /** Résumé FR lisible de l'action à partir du payload (cartes, emails, notifs). */
  summarize: (payload: Record<string, unknown>) => string;
  /** Masque l'outil du catalogue selon le contexte (palier insuffisant, canal absent…). */
  availability?: (ctx: BuildToolsContext) => boolean;
  read?: (ctx: AssistantToolContext, args: Record<string, unknown>) => Promise<ReadResult>;
  execute?: (ctx: AssistantToolContext, payload: Record<string, unknown>) => Promise<ExecuteResult>;
}
