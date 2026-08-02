import OpenAI from "openai";
import { z } from "zod";
import {
  validateTextBlocks,
  type PosterTextBlock,
  type PosterTextPriority,
} from "./composition";

const MAX_CURATED_BLOCKS = 5;
const MAX_CURATED_CHARACTERS = 300;
const MAX_BLOCK_CHARACTERS = 100;

const curatedCandidateSchema = z.object({
  sourceId: z.string().min(1).max(100),
  text: z.string().min(1).max(MAX_BLOCK_CHARACTERS),
  role: z.enum(["title", "date", "time", "location", "address", "speaker", "action", "detail"]),
}).strict();

const curationResponseSchema = z.object({
  blocks: z.array(curatedCandidateSchema).min(1).max(MAX_CURATED_BLOCKS),
}).strict();

type CuratedCandidate = z.infer<typeof curatedCandidateSchema>;

function normalizeExcerpt(value: string) {
  return value.normalize("NFC").replace(/\s+/gu, " ").trim();
}

function priorityForRole(role: CuratedCandidate["role"]): PosterTextPriority {
  if (role === "title") return "main";
  if (["date", "time", "location", "speaker"].includes(role)) return "important";
  return "complementary";
}

function roleForText(text: string, fallbackRole: string): CuratedCandidate["role"] {
  const value = `${fallbackRole} ${text}`.toLocaleLowerCase("fr");
  if (/titre|title|nom de l['’ ]?événement|paracha|parasha|soirée|conférence|cours|allumage|chabbat|concert|atelier/.test(value)) return "title";
  if (/date|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|\b\d{1,2}[/.]\d{1,2}/.test(value)) return "date";
  if (/heure|horaire|\b\d{1,2}\s*(?:h|:)/.test(value)) return "time";
  if (/adresse|\b\d+\s+(?:rue|avenue|boulevard|allée|place|chemin)\b/.test(value)) return "address";
  if (/lieu|salle|synagogue|centre|beth|beit/.test(value)) return "location";
  if (/intervenant|conférencier|rabbin|rav|speaker/.test(value)) return "speaker";
  if (/inscription|réserv|contact|entrée|participation|appel/.test(value)) return "action";
  return "detail";
}

function exactExcerpt(value: string, maximum = MAX_BLOCK_CHARACTERS) {
  const trimmed = value.trim();
  if (trimmed.length <= maximum) return trimmed;
  const candidate = trimmed.slice(0, maximum + 1);
  const boundary = Math.max(candidate.lastIndexOf(" "), candidate.lastIndexOf(","));
  return trimmed.slice(0, boundary >= 40 ? boundary : maximum).trim();
}

function sourceSegments(block: PosterTextBlock) {
  const segments = block.text
    .split(/\r?\n+|[•●▪]+|(?<=[.!?;])\s+|\s+[–—|]\s+/u)
    .map((part) => exactExcerpt(part))
    .filter(Boolean);
  return segments.length > 0 ? segments : [exactExcerpt(block.text)];
}

function isLowValueSegment(text: string) {
  return /^(?:bonjour|bonsoir|shalom|chers? amis?|merci)(?:\s|[,.!])/i.test(text)
    || /nous sommes (?:très )?(?:heureux|ravis)|merveilleux moment|avec toute la communauté/i.test(text);
}

export function buildFallbackCuratedPosterTextBlocks(input: PosterTextBlock[]): PosterTextBlock[] {
  const blocks = validateTextBlocks(input);
  const candidates = blocks.flatMap((block, sourceIndex) => sourceSegments(block)
    .filter((text) => !isLowValueSegment(text))
    .map((text, segmentIndex) => {
    const role = roleForText(text, block.role);
    const priority = priorityForRole(role);
    const semanticRank = role === "title" ? 0
      : ["date", "time", "location", "address"].includes(role) ? 1
        : role === "action" || role === "speaker" ? 2 : 3;
    const sourcePriority = block.priority === "main" ? 0 : block.priority === "important" ? 1 : 2;
    return { text, role, priority, semanticRank, sourcePriority, sourceIndex, segmentIndex };
    }));

  candidates.sort((left, right) => left.semanticRank - right.semanticRank
    || left.sourcePriority - right.sourcePriority
    || left.sourceIndex - right.sourceIndex
    || left.segmentIndex - right.segmentIndex);

  const selected: PosterTextBlock[] = [];
  const seen = new Set<string>();
  let characters = 0;
  for (const candidate of candidates) {
    const normalized = normalizeExcerpt(candidate.text);
    if (!normalized || seen.has(normalized)) continue;
    if (selected.length >= MAX_CURATED_BLOCKS) break;
    if (characters + candidate.text.length > MAX_CURATED_CHARACTERS && selected.length > 0) continue;
    seen.add(normalized);
    characters += candidate.text.length;
    selected.push({
      id: `curated_${selected.length + 1}`,
      text: candidate.text,
      role: candidate.role,
      priority: candidate.priority,
    });
  }

  return selected.length > 0 ? selected : [{
    id: "curated_1",
    text: exactExcerpt(blocks[0].text),
    role: "title",
    priority: "main",
  }];
}

export function validateCuratedPosterTextBlocks(
  input: unknown,
  sources: PosterTextBlock[],
): PosterTextBlock[] | null {
  const parsed = curationResponseSchema.safeParse(input);
  if (!parsed.success) return null;
  const sourceById = new Map(sources.map((source) => [source.id, normalizeExcerpt(source.text)]));
  const seen = new Set<string>();
  let characters = 0;
  const result: PosterTextBlock[] = [];

  for (const candidate of parsed.data.blocks) {
    const text = candidate.text.trim();
    const normalized = normalizeExcerpt(text);
    const source = sourceById.get(candidate.sourceId);
    if (!source || !normalized || !source.includes(normalized) || seen.has(normalized)) return null;
    characters += text.length;
    if (characters > MAX_CURATED_CHARACTERS) return null;
    seen.add(normalized);
    result.push({
      id: `curated_${result.length + 1}`,
      text,
      role: candidate.role,
      priority: priorityForRole(candidate.role),
    });
  }

  return result;
}

function joinBlocks(blocks: PosterTextBlock[], id: string, role: string): PosterTextBlock | null {
  if (blocks.length === 0) return null;
  return {
    id,
    text: blocks.map((block) => block.text.trim()).filter(Boolean).join("\n"),
    role,
    priority: "important",
  };
}

function shortenExactText(text: string, maximum: number) {
  if (text.length <= maximum) return text;
  const excerpt = text.slice(0, maximum + 1);
  const boundary = excerpt.lastIndexOf(" ");
  return text.slice(0, boundary >= Math.round(maximum * 0.55) ? boundary : maximum).trim();
}

/**
 * Construit des niveaux de contenu de plus en plus compacts. La composition
 * essaie le niveau essentiel, puis le niveau minimal si le template est chargé.
 */
export function buildAdaptivePosterTextVariants(input: PosterTextBlock[]): PosterTextBlock[][] {
  const blocks = validateTextBlocks(input);
  const titleSource = blocks.find((block) => block.priority === "main") ?? blocks[0];
  const title: PosterTextBlock = {
    ...titleSource,
    id: "adaptive_title",
    text: shortenExactText(titleSource.text.trim(), 78),
    role: "title",
    priority: "main",
  };
  const withoutTitle = blocks.filter((block) => block !== titleSource);
  const scheduleSources = withoutTitle.filter((block) => /date|time|heure|horaire/i.test(block.role));
  const venueSources = withoutTitle.filter((block) => /location|lieu|address|adresse/i.test(block.role));
  const schedule = joinBlocks(scheduleSources, "adaptive_schedule", "date_time");
  const venue = joinBlocks(venueSources, "adaptive_venue", "location");
  const otherImportant = withoutTitle.find((block) => block.priority === "important"
    && !scheduleSources.includes(block)
    && !venueSources.includes(block));

  const essential = [title, schedule, venue, otherImportant ? {
    ...otherImportant,
    id: "adaptive_information",
    text: shortenExactText(otherImportant.text.trim(), 72),
  } : null].filter((block): block is PosterTextBlock => Boolean(block)).slice(0, 4);

  const practicalSources = [...scheduleSources, ...venueSources];
  const practical = joinBlocks(practicalSources, "adaptive_practical", "practical_information");
  const minimal = [title, practical].filter((block): block is PosterTextBlock => Boolean(block));

  const variants = [essential, minimal];
  const seen = new Set<string>();
  return variants.filter((variant) => {
    const signature = JSON.stringify(variant.map(({ text, role, priority }) => ({ text, role, priority })));
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

function buildCurationPrompt(blocks: PosterTextBlock[]) {
  return `Tu prépares le texte d'une affiche à partir des informations brutes de l'utilisateur.

Informations sources:
${JSON.stringify(blocks)}

Objectif:
- Garde uniquement les informations utiles à comprendre l'affiche en quelques secondes.
- Priorité: titre, date, heure, lieu/adresse, intervenant utile, puis appel à l'action.
- Supprime salutations, explications longues, répétitions, formules promotionnelles secondaires et détails non indispensables.
- Retourne au maximum ${MAX_CURATED_BLOCKS} éléments et ${MAX_CURATED_CHARACTERS} caractères au total.
- Chaque élément doit faire au maximum ${MAX_BLOCK_CHARACTERS} caractères.

Sécurité factuelle absolue:
- text doit être une sous-chaîne exacte et continue du texte du sourceId correspondant.
- Ne reformule, ne corrige, ne traduit et n'invente aucun mot, nom, chiffre, date, heure ou lieu.
- Tu peux extraire plusieurs passages distincts d'une même source avec le même sourceId.

Réponds uniquement avec ce JSON:
{"blocks":[{"sourceId":"id_source","text":"extrait exact","role":"title|date|time|location|address|speaker|action|detail"}]}`;
}

export async function curatePosterTextBlocks(input: PosterTextBlock[]): Promise<PosterTextBlock[]> {
  const sources = validateTextBlocks(input);
  if (!process.env.OPENROUTER_API_KEY) return buildFallbackCuratedPosterTextBlocks(sources);

  try {
    const openrouter = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
    });
    const response = await openrouter.chat.completions.create({
      model: process.env.POSTER_TEXT_MODEL ?? process.env.POSTER_VISION_MODEL ?? "google/gemini-2.5-flash",
      max_tokens: 1200,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: buildCurationPrompt(sources) }],
    });
    const raw = response.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? raw) as unknown;
    return validateCuratedPosterTextBlocks(parsed, sources)
      ?? buildFallbackCuratedPosterTextBlocks(sources);
  } catch (error) {
    console.warn("[Poster Curation] AI curation unavailable, deterministic fallback used", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return buildFallbackCuratedPosterTextBlocks(sources);
  }
}
