import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { ALL_TOOL_DEFS } from "./tools";
import { TOOL_PERMISSIONS } from "./permissions";
import type { AssistantToolDef, BuildToolsContext } from "./types";

// Registre central des outils de l'assistant : assemble les définitions par domaine,
// vérifie l'invariant 1:1 avec permissions.ts, construit le catalogue filtré par palier.

const TOOL_MAP = new Map<string, AssistantToolDef>(ALL_TOOL_DEFS.map((def) => [def.name, def]));

// ── Invariants (échec immédiat au chargement du module = erreur de config) ──
for (const def of ALL_TOOL_DEFS) {
  if (!TOOL_PERMISSIONS[def.name]) {
    throw new Error(`[assistant/registry] Outil sans permission déclarée : ${def.name}`);
  }
  if (/admin/i.test(def.name)) {
    throw new Error(`[assistant/registry] Aucun outil admin n'est autorisé dans le registre : ${def.name}`);
  }
  if (!def.read && !def.execute) {
    throw new Error(`[assistant/registry] Outil sans handler read/execute : ${def.name}`);
  }
}
for (const name of Object.keys(TOOL_PERMISSIONS)) {
  if (!TOOL_MAP.has(name)) {
    throw new Error(`[assistant/registry] Permission déclarée sans outil correspondant : ${name}`);
  }
}

export function getToolDef(name: string): AssistantToolDef | undefined {
  return TOOL_MAP.get(name);
}

/**
 * Construit le catalogue OpenAI filtré par le contexte (palier, connexions).
 * Les outils indisponibles sont MASQUÉS (pas visibles-mais-refusants) — une ligne
 * du prompt système signale que certaines fonctionnalités demandent une offre supérieure.
 */
export function buildTools(ctx: BuildToolsContext): ChatCompletionTool[] {
  const tools: ChatCompletionTool[] = [];
  for (const def of ALL_TOOL_DEFS) {
    if (def.availability && !def.availability(ctx)) continue;
    // Variante de description dynamique pour send_email selon l'état Gmail.
    if (def.name === "send_email") {
      tools.push({
        type: "function",
        function: {
          ...def.schema.function,
          description: ctx.gmailConnected
            ? "Prépare et envoie un email depuis la boîte Gmail connectée."
            : "Prépare et envoie un email (via le canal email configuré, fallback Resend).",
        },
      });
      continue;
    }
    tools.push(def.schema);
  }
  return tools;
}

/** Noms des outils masqués pour ce contexte (pour la ligne d'information du prompt). */
export function hiddenToolDomains(ctx: BuildToolsContext): string[] {
  const hidden = new Set<string>();
  for (const def of ALL_TOOL_DEFS) {
    if (def.availability && !def.availability(ctx)) {
      hidden.add(TOOL_PERMISSIONS[def.name].domain);
    }
  }
  return [...hidden];
}
