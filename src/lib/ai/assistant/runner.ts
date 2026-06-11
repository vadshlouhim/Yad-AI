import type OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { createAdminClient } from "@/lib/supabase/admin";
import { buildTools } from "./tools";
import { executeAction, summarizeAction, isMutatingAction, actionLabelFor } from "./actions";
import { createPendingAction } from "./pending";
import { rememberFact } from "./memory";

type Admin = ReturnType<typeof createAdminClient>;

export interface AssistantActionCard {
  id: string;
  type: "automation" | "setting" | "navigation" | "creation" | "email";
  title: string;
  description: string;
  status?: string;
  action: {
    kind: "confirm_pending" | "done";
    pendingActionId?: string;
    actionKind?: string;
    payload?: Record<string, unknown>;
  };
}

export interface AssistantEmit {
  delta: (text: string) => void;
  event: (obj: unknown) => void;
}

export interface RunAssistantParams {
  openrouter: OpenAI;
  model: string;
  systemPrompt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  admin: Admin;
  communityId: string;
  userId: string | null;
  actionMode: "AUTO" | "CONFIRM";
  gmailConnected: boolean;
  emit: AssistantEmit;
}

const READ_ONLY_TOOLS = new Set(["list_automations", "check_channels"]);

function cardTypeFor(kind: string): AssistantActionCard["type"] {
  if (kind.includes("automation")) return "automation";
  if (kind === "send_email") return "email";
  if (kind === "update_community_settings") return "setting";
  return "creation";
}

// Exécute l'agent : boucle d'outils, puis stream de la réponse finale.
// Retourne le texte final complet (pour persistance).
export async function runAssistant(params: RunAssistantParams): Promise<string> {
  const { openrouter, model, systemPrompt, messages, admin, communityId, userId, actionMode, gmailConnected, emit } = params;

  const tools = buildTools({ gmailConnected });
  const currentMessages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...messages.slice(-20),
  ];

  const cards: AssistantActionCard[] = [];
  let maxLoops = 4;

  while (maxLoops > 0) {
    maxLoops--;
    const response = await openrouter.chat.completions.create({
      model,
      max_tokens: 2048,
      stream: false,
      messages: currentMessages,
      tools,
    });

    const msg = response.choices[0]?.message;
    if (!msg) break;

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      // Réponse finale.
      const finalText = (msg.content ?? "").trim();
      if (cards.length > 0) emit.event({ type: "assistant_actions", actions: cards });
      const text = finalText || fallbackText(cards, actionMode);
      streamChunks(text, emit);
      return text;
    }

    // Le modèle veut utiliser des outils.
    currentMessages.push(msg);

    for (const toolCall of msg.tool_calls) {
      if (toolCall.type !== "function") continue;
      const name = toolCall.function.name;
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(toolCall.function.arguments || "{}");
      } catch {
        args = {};
      }

      const toolResult = await handleToolCall({
        admin,
        communityId,
        userId,
        actionMode,
        name,
        args,
        cards,
        emit,
      });

      currentMessages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: toolResult,
      });
    }
  }

  // Sécurité : boucle épuisée sans réponse finale.
  if (cards.length > 0) emit.event({ type: "assistant_actions", actions: cards });
  const text = fallbackText(cards, actionMode);
  streamChunks(text, emit);
  return text;
}

interface ToolCtx {
  admin: Admin;
  communityId: string;
  userId: string | null;
  actionMode: "AUTO" | "CONFIRM";
  name: string;
  args: Record<string, unknown>;
  cards: AssistantActionCard[];
  emit: AssistantEmit;
}

// Traite un appel d'outil et retourne le contenu du message "tool" pour le modèle.
async function handleToolCall(ctx: ToolCtx): Promise<string> {
  const { admin, communityId, userId, actionMode, name, args, cards, emit } = ctx;

  // ── Outils lecture seule ──
  if (READ_ONLY_TOOLS.has(name)) {
    if (name === "list_automations") {
      const { data } = await admin
        .from("Automation")
        .select("id, name, trigger, isActive, status")
        .eq("communityId", communityId)
        .order("createdAt", { ascending: false })
        .limit(20);
      return JSON.stringify({ automations: data ?? [] });
    }
    if (name === "check_channels") {
      const { data } = await admin
        .from("Channel")
        .select("type, isConnected, isActive, handle")
        .eq("communityId", communityId);
      return JSON.stringify({ channels: data ?? [] });
    }
  }

  // ── Mémoire ──
  if (name === "remember") {
    const res = await rememberFact(admin, communityId, {
      type: String(args.type ?? "USER_FEEDBACK"),
      key: String(args.key ?? ""),
      value: args.value,
    });
    return res.message;
  }

  // ── Actions soumises au mode AUTO/CONFIRM ──
  if (isMutatingAction(name)) {
    if (actionMode === "CONFIRM") {
      const summary = summarizeAction(name, args);
      // Persistance (notifications + lien profond). Peut échouer si la table n'existe
      // pas encore : la carte reste affichée et fonctionnelle grâce au payload embarqué.
      const pending = await createPendingAction(admin, {
        communityId,
        userId,
        kind: name,
        payload: args,
        source: "chat",
        summary,
      });
      cards.push({
        id: pending ? `pending-${pending.id}` : `pending-${crypto.randomUUID()}`,
        type: cardTypeFor(name),
        title: actionLabelFor(name),
        description: summary,
        status: "À valider",
        action: { kind: "confirm_pending", pendingActionId: pending?.id, actionKind: name, payload: args },
      });
      return "Action préparée et EN ATTENTE de validation. Ne dis pas qu'elle est faite : indique en une phrase qu'elle attend sa confirmation via le bouton affiché juste en dessous.";
    }

    // Mode AUTO → exécution immédiate.
    const result = await executeAction({ admin, communityId, userId }, name, args);
    emit.event({ type: "system_updated", action: name });
    cards.push({
      id: `done-${crypto.randomUUID()}`,
      type: cardTypeFor(name),
      title: actionLabelFor(name),
      description: result.message,
      status: result.success ? "Fait" : "Échec",
      action: { kind: "done", actionKind: name },
    });
    return result.success ? `OK — ${result.message}` : `Échec — ${result.message}`;
  }

  // ── generate_content (toujours exécuté, non soumis à confirmation) ──
  if (name === "generate_content") {
    const result = await executeAction({ admin, communityId, userId }, name, args);
    emit.event({ type: "system_updated", action: name });
    return result.success
      ? `Contenu généré : ${JSON.stringify(result.data ?? {})}`
      : `Échec génération : ${result.message}`;
  }

  return `Outil inconnu : ${name}.`;
}

function fallbackText(cards: AssistantActionCard[], actionMode: "AUTO" | "CONFIRM"): string {
  if (cards.length === 0) return "C'est noté.";
  if (actionMode === "CONFIRM") {
    return "J'ai préparé l'action ci-dessous. Validez-la avec le bouton pour que je l'exécute.";
  }
  return "C'est fait. Voici le récapitulatif ci-dessous.";
}

// Émet le texte final en petits morceaux pour un effet de streaming fluide côté client.
function streamChunks(text: string, emit: AssistantEmit): void {
  if (!text) return;
  const words = text.split(/(\s+)/);
  let buffer = "";
  for (const word of words) {
    buffer += word;
    if (buffer.length >= 24) {
      emit.delta(buffer);
      buffer = "";
    }
  }
  if (buffer) emit.delta(buffer);
}
