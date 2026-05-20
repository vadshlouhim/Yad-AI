import type { Tables } from "@/types/database.types";

type ArticleRow = Tables<"Article">;

export interface ArticleSuggestion {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  tags: string[];
  reason: string;
  confidence: number;
}

const ARTICLE_INTENT_KEYWORDS = [
  "acheter",
  "achat",
  "commander",
  "commande",
  "boutique",
  "shop",
  "produit",
  "produits",
  "article",
  "articles",
  "cadeau",
  "cadeaux",
  "offrir",
  "offre",
  "vente",
  "vendre",
  "prix",
  "payer",
  "paiement",
  "livre",
  "mezouza",
  "mezuza",
  "tefilin",
  "tefillin",
  "talit",
  "kippa",
  "kipa",
];

const STOPWORDS = new Set([
  "de",
  "des",
  "du",
  "la",
  "le",
  "les",
  "un",
  "une",
  "pour",
  "avec",
  "sans",
  "sur",
  "dans",
  "mon",
  "ma",
  "mes",
  "ton",
  "ta",
  "tes",
  "notre",
  "nos",
  "vos",
  "leur",
  "leurs",
  "the",
  "and",
]);

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string | null | undefined): string[] {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function collectArticleTokens(article: Pick<ArticleRow, "name" | "description" | "tags">): string[] {
  return unique([
    ...tokenize(article.name),
    ...tokenize(article.description),
    ...(article.tags ?? []).flatMap((tag) => tokenize(tag)),
  ]);
}

function buildArticleReason(article: Pick<ArticleRow, "tags" | "name">, text: string): string {
  const requestTokens = tokenize(text);
  const matchingTags = (article.tags ?? []).filter((tag) =>
    requestTokens.some((token) => normalizeText(tag).includes(token))
  );

  if (matchingTags.length > 0) {
    return `Pertinent grâce aux thèmes : ${matchingTags.slice(0, 3).join(", ")}.`;
  }

  return `Peut correspondre à la demande autour de ${article.name.toLowerCase()}.`;
}

function scoreArticle(
  article: Pick<ArticleRow, "name" | "description" | "tags">,
  text: string
): number {
  const normalized = normalizeText(text);
  const requestTokens = unique(tokenize(text));
  const articleTokens = collectArticleTokens(article);
  let score = 0;

  const keywordMatches = ARTICLE_INTENT_KEYWORDS.filter((keyword) =>
    normalized.includes(normalizeText(keyword))
  );
  score += Math.min(keywordMatches.length * 1.2, 4);

  const overlap = requestTokens.filter((token) => articleTokens.includes(token));
  score += Math.min(overlap.length * 2.2, 10);

  if (normalized.includes(normalizeText(article.name))) {
    score += 4;
  }

  const exactTagMatches = (article.tags ?? []).filter((tag) =>
    normalized.includes(normalizeText(tag))
  );
  score += Math.min(exactTagMatches.length * 2.5, 7);

  return score;
}

export function resolveArticleAssetUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (isAbsoluteUrl(value)) return value;

  const normalizedPath = value.replace(/^\/+/, "");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return value;

  return `${supabaseUrl}/storage/v1/object/public/articles/${normalizedPath}`;
}

export function looksLikeArticleIntent(text: string): boolean {
  const normalized = normalizeText(text);
  return ARTICLE_INTENT_KEYWORDS.some((keyword) => normalized.includes(normalizeText(keyword)));
}

export function formatArticlePrice(priceCents: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency || "EUR",
  }).format(priceCents / 100);
}

export function buildArticleSuggestions(
  articles: Array<
    Pick<
      ArticleRow,
      | "id"
      | "communityId"
      | "slug"
      | "name"
      | "description"
      | "priceCents"
      | "currency"
      | "imageUrl"
      | "tags"
    >
  >,
  text: string,
  options?: {
    limit?: number;
    communityId?: string | null;
    forceAtLeastOne?: boolean;
  }
): ArticleSuggestion[] {
  const limit = options?.limit ?? 3;

  const scored = [...articles]
    .map((article) => ({
      article,
      score: scoreArticle(article, text) + (options?.communityId && article.communityId === options.communityId ? 2.5 : 0),
      isOwned: Boolean(options?.communityId && article.communityId === options.communityId),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (left.isOwned !== right.isOwned) {
        return left.isOwned ? -1 : 1;
      }

      return left.article.name.localeCompare(right.article.name, "fr", { sensitivity: "base" });
    });

  const strict = scored.filter(({ score }) => score >= 5);
  const fallback = options?.forceAtLeastOne ? scored.filter(({ score }) => score >= 2.5) : [];
  const selected = (strict.length > 0 ? strict : fallback).slice(0, limit);

  return selected.map(({ article, score }) => ({
    id: article.id,
    slug: article.slug,
    name: article.name,
    description: article.description,
    priceCents: article.priceCents,
    currency: article.currency,
    imageUrl: resolveArticleAssetUrl(article.imageUrl),
    tags: article.tags ?? [],
    reason: buildArticleReason(article, text),
    confidence: score,
  }));
}
