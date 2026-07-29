import OpenAI from "openai";
import {
  recordToPosterTextBlocks,
  type PosterTextBlock,
  type PosterTextPriority,
} from "./composition";

function extractJson(raw: string) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Réponse IA invalide pour la modification de l'affiche.");
  return JSON.parse(match[0]) as {
    replacements?: Array<{ blockId?: unknown; text?: unknown }>;
    additions?: Array<{ text?: unknown; role?: unknown; priority?: unknown }>;
  };
}

export async function applyExactPosterEdits(params: {
  currentTexts: Record<string, string>;
  editPrompt: string;
  channel: "Facebook" | "Instagram";
}) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("Le service IA n'est pas configuré.");
  }
  const currentBlocks = recordToPosterTextBlocks(params.currentTexts);
  const openrouter = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  });
  const response = await openrouter.chat.completions.create({
    model: process.env.POSTER_VISION_MODEL ?? "google/gemini-2.5-flash",
    max_tokens: 1500,
    response_format: { type: "json_object" },
    messages: [{
      role: "user",
      content: `Tu identifies les modifications textuelles exactes demandées pour une affiche ${params.channel}.

Blocs actuels:
${JSON.stringify(currentBlocks)}

Demande utilisateur:
<user_text>${params.editPrompt}</user_text>

Règles:
- Toute nouvelle valeur doit être une sous-chaîne exacte de <user_text>.
- Ne corrige, ne reformule, ne traduis et ne complète jamais.
- replacements référence uniquement un blockId existant.
- additions sert uniquement aux nouveaux textes explicitement fournis.
- priority vaut main, important ou complementary.

Réponds uniquement:
{"replacements":[{"blockId":"id","text":"texte exact"}],"additions":[{"text":"texte exact","role":"rôle","priority":"important"}]}`,
    }],
  });
  const proposal = extractJson(response.choices[0]?.message?.content ?? "");
  const byId = new Map(currentBlocks.map((block) => [block.id, block]));
  let acceptedChanges = 0;

  for (const replacement of proposal.replacements ?? []) {
    if (
      typeof replacement.blockId === "string"
      && typeof replacement.text === "string"
      && replacement.text.length > 0
      && params.editPrompt.includes(replacement.text)
      && byId.has(replacement.blockId)
    ) {
      byId.set(replacement.blockId, { ...byId.get(replacement.blockId)!, text: replacement.text });
      acceptedChanges += 1;
    }
  }

  const priorities = new Set<PosterTextPriority>(["main", "important", "complementary"]);
  for (const [index, addition] of (proposal.additions ?? []).entries()) {
    if (
      typeof addition.text !== "string"
      || addition.text.length === 0
      || !params.editPrompt.includes(addition.text)
    ) {
      continue;
    }
    const priority = priorities.has(addition.priority as PosterTextPriority)
      ? addition.priority as PosterTextPriority
      : "complementary";
    const block: PosterTextBlock = {
      id: `addition_${index + 1}`,
      text: addition.text,
      role: typeof addition.role === "string" && addition.role.trim()
        ? addition.role.slice(0, 100)
        : "additional text",
      priority,
    };
    byId.set(block.id, block);
    acceptedChanges += 1;
  }

  if (acceptedChanges === 0) {
    throw new Error("Aucun nouveau texte exact n'a pu être identifié dans la demande.");
  }
  return [...byId.values()];
}
