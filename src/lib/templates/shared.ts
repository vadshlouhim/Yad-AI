import type { Tables } from "@/types/database.types";

type TemplateRow = Tables<"Template">;

export interface TemplateQuestion {
  id: string;
  label: string;
  placeholder: string;
}

export interface TemplateSuggestion {
  id: string;
  name: string;
  description: string | null;
  category: string;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  tags: string[];
  isPremium: boolean;
  usageCount: number;
  reason: string;
}

export const CATEGORY_LABELS: Record<string, string> = {
  SHABBAT: "Chabbat",
  HOLIDAY: "Fêtes",
  EVENT: "Événements",
  COURSE: "Cours",
  ANNOUNCEMENT: "Annonces",
  RECAP: "Récap",
  GREETING: "Vœux",
  GENERAL: "Général",
};

// Mots-clés déclenchant chaque catégorie de façon stricte.
// Quand l'un de ces mots est détecté, seule la catégorie correspondante est proposée.
const STRICT_CATEGORY_MAP: Array<{ category: string; keywords: string[] }> = [
  {
    category: "SHABBAT",
    keywords: [
      "chabbat", "shabbat", "bougies", "havdala", "paracha", "parasha",
      "kiddouch", "kidouch", "horaires de chabbat", "horaires chabbat",
      "minha", "arvit", "chaharit", "segouda", "mussaf",
    ],
  },
  {
    category: "HOLIDAY",
    keywords: [
      "hanouka", "hanoucca", "hanuka", "pessah", "pesah", "passover",
      "pourim", "meguila", "souccot", "soucot", "sukkot", "roch hachana",
      "rosh hashana", "yom kippour", "yom kippur", "lag baomer", "lag ba omer",
      "chavouot", "shavouot", "matan torah", "tou bichvat",
      "yom haatsmaut", "yom hazikaron", "yom yerushalaim",
    ],
  },
  {
    category: "COURSE",
    keywords: [
      "cours", "chiour", "shiour", "etude", "étude", "talmud", "gemara",
      "halakha", "halacha", "daf yomi", "mishna", "responsa",
    ],
  },
  {
    category: "EVENT",
    keywords: [
      "soirée", "soiree", "gala", "diner", "dîner", "repas", "buffet",
      "concert", "spectacle", "bar mitsva", "bat mitsva", "brit mila",
      "mariage", "houppa", "conférence", "conference", "seminaire", "séminaire",
    ],
  },
  {
    category: "ANNOUNCEMENT",
    keywords: [
      "annonce", "information", "communiqué", "communique", "avis", "fermeture",
      "ouverture", "ferme", "fermé", "ouvert", "horaires", "planning",
    ],
  },
  {
    category: "RECAP",
    keywords: [
      "récap", "recap", "bilan", "retour sur", "compte-rendu",
    ],
  },
  {
    category: "GREETING",
    keywords: [
      "voeux", "vœux", "hag sameah", "chag sameah", "mazal tov", "felicitations",
      "félicitations", "bienvenue", "bon an", "bonne annee",
    ],
  },
];

// Mots qui rendent la requête VAGUE dans une catégorie — nécessite une clarification.
const VAGUE_WITHIN_CATEGORY_KEYWORDS: Record<string, string[]> = {
  SHABBAT: ["chabbat", "shabbat"],
  HOLIDAY: ["fête", "fetes", "holiday"],
  COURSE: ["cours"],
  EVENT: ["événement", "evenement", "event", "soirée", "soiree"],
};

// Questions de clarification pour chaque catégorie ambiguë.
const CATEGORY_CLARIFICATION_QUESTIONS: Record<string, string> = {
  SHABBAT: "Quel type d'affiche Chabbat souhaitez-vous ?\n- Horaires de Chabbat (entrée/sortie)\n- Programme détaillé (offices, cours, Kiddouch...)\n- Invitation repas de Chabbat\n- Cours ou Chiour du Chabbat",
  HOLIDAY: "De quelle fête s'agit-il ? (Hanouka, Pessah, Pourim, Souccot, Roch Hachana, Yom Kippour...)",
  COURSE: "Quel type d'affiche de cours souhaitez-vous ?\n- Cours hebdomadaire\n- Daf Yomi\n- Chiour spécial\n- Cycle d'études",
  EVENT: "Quel type d'événement souhaitez-vous annoncer ?\n- Soirée communautaire / Gala\n- Bar Mitsva / Bat Mitsva\n- Mariage / Brit Mila\n- Conférence / Séminaire",
};

/**
 * Détecte la catégorie stricte demandée dans le texte utilisateur.
 * Retourne la catégorie (enum DB) ou null si la demande est générique.
 */
export function detectStrictCategory(text: string): string | null {
  const normalized = normalizeText(text);
  for (const { category, keywords } of STRICT_CATEGORY_MAP) {
    if (keywords.some((keyword) => normalized.includes(normalizeText(keyword)))) {
      return category;
    }
  }
  return null;
}

/**
 * Retourne true si la demande est vague dans sa catégorie (ex : "affiche Chabbat" sans précision).
 * Dans ce cas, l'IA doit poser une question de clarification avant de proposer des affiches.
 */
export function isVagueCategoryRequest(text: string, detectedCategory: string | null): boolean {
  if (!detectedCategory) return false;
  const normalized = normalizeText(text);
  const vagueWords = VAGUE_WITHIN_CATEGORY_KEYWORDS[detectedCategory] ?? [];
  const specificWords = STRICT_CATEGORY_MAP
    .find((entry) => entry.category === detectedCategory)
    ?.keywords.filter((keyword) => !vagueWords.includes(keyword)) ?? [];
  const hasVagueWord = vagueWords.some((keyword) => normalized.includes(normalizeText(keyword)));
  const hasSpecificWord = specificWords.some((keyword) => normalized.includes(normalizeText(keyword)));
  return hasVagueWord && !hasSpecificWord;
}

/**
 * Retourne la question de clarification à poser pour une catégorie ambiguë.
 */
export function getCategoryAmbiguityQuestion(category: string): string {
  return CATEGORY_CLARIFICATION_QUESTIONS[category] ?? "Pouvez-vous préciser le type d'affiche souhaité ?";
}

export const CATEGORY_EMOJI: Record<string, string> = {
  SHABBAT: "🕯️",
  HOLIDAY: "🕎",
  EVENT: "🎉",
  COURSE: "📖",
  ANNOUNCEMENT: "📣",
  RECAP: "📝",
  GREETING: "✨",
  GENERAL: "📋",
};

export const CATEGORY_QUESTIONS: Record<string, TemplateQuestion[]> = {
  SHABBAT: [
    { id: "parasha", label: "Paracha de la semaine", placeholder: "Ex: Bereshit" },
    { id: "date", label: "Date du Chabbat", placeholder: "Ex: Vendredi 20 Avril 2026" },
    { id: "candle_lighting", label: "Allumage des bougies", placeholder: "Ex: 19h45" },
    { id: "havdala", label: "Havdala", placeholder: "Ex: 20h55" },
    { id: "special_event", label: "Événement spécial (optionnel)", placeholder: "Ex: Kiddouch communautaire" },
  ],
  HOLIDAY: [
    { id: "holiday_name", label: "Nom de la fête", placeholder: "Ex: Pessah, Pourim, Hanouka..." },
    { id: "date", label: "Date", placeholder: "Ex: Du 12 au 20 Avril 2026" },
    { id: "program", label: "Programme / activités", placeholder: "Ex: Lecture de la Meguila, repas..." },
    { id: "special_info", label: "Informations complémentaires", placeholder: "Ex: Inscription obligatoire" },
  ],
  EVENT: [
    { id: "event_name", label: "Nom de l'événement", placeholder: "Ex: Gala annuel du Beth Habad" },
    { id: "date", label: "Date et heure", placeholder: "Ex: Dimanche 25 Avril 2026 à 19h30" },
    { id: "location", label: "Lieu", placeholder: "Ex: Salle des fêtes, 12 rue..." },
    { id: "description", label: "Description courte", placeholder: "Ex: Soirée exceptionnelle avec..." },
    { id: "price", label: "Tarif (optionnel)", placeholder: "Ex: 36€ par personne" },
    { id: "registration", label: "Inscription", placeholder: "Ex: Sur easycom-ai.com ou 01 23 45 67 89" },
  ],
  COURSE: [
    { id: "course_name", label: "Nom du cours", placeholder: "Ex: Talmud Baba Metzia" },
    { id: "teacher", label: "Enseignant", placeholder: "Ex: Rav Lévi Cohen" },
    { id: "schedule", label: "Horaire", placeholder: "Ex: Tous les mardis à 20h" },
    { id: "level", label: "Niveau", placeholder: "Ex: Tout niveau" },
    { id: "topic", label: "Sujet cette semaine (optionnel)", placeholder: "Ex: Les lois du Chabbat" },
  ],
  ANNOUNCEMENT: [
    { id: "title", label: "Titre de l'annonce", placeholder: "Ex: Grande soirée communautaire" },
    { id: "date", label: "Date / période", placeholder: "Ex: Jeudi 4 mai à 20h" },
    { id: "location", label: "Lieu", placeholder: "Ex: Beth Habad de Neuilly" },
    { id: "cta", label: "Action attendue", placeholder: "Ex: Réservez au 06..." },
  ],
  RECAP: [
    { id: "title", label: "Titre du récapitulatif", placeholder: "Ex: Retour sur notre soirée de Pourim" },
    { id: "highlights", label: "Temps forts", placeholder: "Ex: Lecture, concert, buffet..." },
    { id: "thanks", label: "Remerciements", placeholder: "Ex: Merci aux bénévoles et familles" },
  ],
  GREETING: [
    { id: "occasion", label: "Occasion", placeholder: "Ex: Hanouka, Chavouot..." },
    { id: "date", label: "Date", placeholder: "Ex: Ce dimanche soir" },
    { id: "wish", label: "Message principal", placeholder: "Ex: Hag Sameah à toutes les familles" },
  ],
  DEFAULT: [
    { id: "title", label: "Titre de l'affiche", placeholder: "Ex: Annonce importante" },
    { id: "date", label: "Date", placeholder: "Ex: Dimanche 25 Avril 2026" },
    { id: "description", label: "Description", placeholder: "Décrivez le contenu de l'affiche..." },
    { id: "contact", label: "Contact (optionnel)", placeholder: "Ex: 01 23 45 67 89" },
  ],
};

const VISUAL_INTENT_KEYWORDS = [
  "affiche",
  "affiches",
  "template",
  "templates",
  "visuel",
  "visuels",
  "flyer",
  "poster",
  "image",
  "images",
  "photo",
  "photos",
  "illustration",
  "illustrations",
  "graphisme",
  "graphique",
  "design",
  "canva",
  "créa",
  "crea",
  "création visuelle",
  "creation visuelle",
];

const PASSIVE_CHANNEL_WORDS = [
  "story",
  "instagram",
  "facebook",
  "social",
  "sociaux",
  "social media",
  "réseaux sociaux",
  "reseaux sociaux",
  "carousel",
  "réseau",
  "réseaux",
  "publication",
  "post",
];

const CATEGORY_HINTS: Record<string, string[]> = {
  SHABBAT: ["chabbat", "shabbat", "bougies", "havdala", "paracha"],
  HOLIDAY: ["fête", "hanouka", "pessah", "pourim", "roch", "yom kippour"],
  EVENT: ["soirée", "événement", "gala", "conference", "conférence", "rencontre"],
  COURSE: ["cours", "torah", "chiour", "shiour", "etude", "étude"],
  ANNOUNCEMENT: ["annonce", "information", "communiqué", "communique"],
  RECAP: ["récap", "recap", "retour", "bilan", "merci"],
  GREETING: ["voeux", "vœux", "hag sameah", "mazal tov", "bienvenue"],
};

const TOPIC_ALIASES: Record<string, string[]> = {
  chabbat: ["chabbat", "shabbat", "paracha", "havdala", "bougies", "kidouch", "kiddouch"],
  pessah: ["pessah", "pesah", "passover"],
  chavouot: ["chavouot", "chavuot", "shavouot", "shavuot", "shavuos", "matan torah", "matan tora", "tikoun leil", "tikkun leil"],
  souccot: ["souccot", "soucot", "sukkot", "soukot"],
  roch_hachana: ["roch hachana", "rosh hashana", "rosh hashanah"],
  yom_kippour: ["yom kippour", "yom kippur"],
  pourim: ["pourim", "meguila", "megillah"],
  hanouka: ["hanouka", "hanoucca", "hanukkah", "chanouka"],
  lag_baomer: ["lag baomer", "lag ba omer"],
  tou_bichvat: ["tou bichvat", "tou bichvat", "tu bishvat", "tou bechvat"],
  tichri: ["tichri", "tishri"],
  elloul: ["elloul", "eloul", "elul"],
  kislev: ["kislev", "19 kislev", "youd teth kislev"],
  tamouz: ["tamouz", "tamuz", "3 tamouz", "3 tamuz", "guimel tamouz"],
  chevat: ["chevat", "shevat", "10 chevat", "11 nissan", "nissan"],
  torah: ["torah", "cours de torah", "chiour", "shiour", "etude", "étude"],
  jeunesse: ["jeunesse", "cteen", "gan israel", "camp"],
  bar_mitsva: ["bar mitsva", "bar mitzva", "bar mitzvah", "tefilines", "tefillin"],
  brit_mila: ["brit mila", "brit milah", "circoncision"],
  mariage: ["mariage", "houppa", "houppah"],
};

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
  "vos",
  "leur",
  "leurs",
  "qui",
  "que",
  "quoi",
  "est",
  "sont",
  "aux",
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

function collectTopicMatches(text: string): string[] {
  const normalized = normalizeText(text);

  return Object.entries(TOPIC_ALIASES)
    .filter(([, aliases]) =>
      aliases.some((alias) => {
        const normalizedAlias = normalizeText(alias);
        return normalizedAlias.length > 0 && normalized.includes(normalizedAlias);
      })
    )
    .map(([topic]) => topic);
}

function collectTemplateTopicMatches(
  template: Pick<TemplateRow, "tags" | "name" | "description" | "subCategory">
): string[] {
  return collectTopicMatches(
    [template.name, template.description, template.subCategory, ...(template.tags ?? [])].join(" ")
  );
}

function getSharedTopics(
  template: Pick<TemplateRow, "tags" | "name" | "description" | "subCategory">,
  text: string
): string[] {
  const requestTopics = collectTopicMatches(text);
  const templateTopics = collectTemplateTopicMatches(template);
  return requestTopics.filter((topic) => templateTopics.includes(topic));
}

function hasHolidayTopic(text: string): boolean {
  return collectTopicMatches(text).some((topic) => topic !== "chabbat");
}

export function resolveTemplateAssetUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (isAbsoluteUrl(value)) return value;

  const normalizedPath = value.replace(/^\/+/, "");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return value;

  return `${supabaseUrl}/storage/v1/object/public/templates/${normalizedPath}`;
}

export function looksLikeTemplateIntent(text: string): boolean {
  const normalized = normalizeText(text);

  const hasExplicitVisualWord = VISUAL_INTENT_KEYWORDS.some((keyword) => normalized.includes(normalizeText(keyword)));
  if (hasExplicitVisualWord) {
    return true;
  }

  // Canal/post seul ne veut pas dire affiche. On ne propose une affiche que si
  // l'utilisateur demande explicitement un support visuel.
  const hasOnlyPassiveChannelIntent = PASSIVE_CHANNEL_WORDS.some((keyword) => normalized.includes(normalizeText(keyword)));
  if (hasOnlyPassiveChannelIntent) {
    return false;
  }

  return false;
}

export function getTemplateQuestions(category: string): TemplateQuestion[] {
  return CATEGORY_QUESTIONS[category] ?? CATEGORY_QUESTIONS.DEFAULT;
}

export function buildTemplateSelectionPrompt(template: { name: string; category: string }): string {
  const questions = getTemplateQuestions(template.category);
  const bullets = questions.map((question) => `- ${question.label}`).join("\n");

  return `Parfait. On part sur l'affiche ${template.name}.\n\nPour préparer l'affiche, confirme-moi maintenant les éléments textuels à remplacer :\n${bullets}\n\nTu peux me répondre en une seule fois, même sous forme de liste courte. Quand tu es prêt, je te prépare un récapitulatif à valider avant génération.`;
}

export function buildTemplateSelectionPromptFromAnalysis(params: {
  templateName: string;
  summary: string;
  elements: Array<{
    label: string;
    kind: "text" | "visual";
    question: string;
    currentValueHint?: string | null;
  }>;
}): string {
  const { templateName, summary, elements } = params;

  const suggestions = elements
    .map((element) => {
      const suffix = element.currentValueHint ? ` (${element.currentValueHint})` : "";
      return `- ${element.label}${suffix}`;
    })
    .join("\n");

  const questions = elements
    .map((element) => `- ${element.question}`)
    .join("\n");

  return `Parfait. On part sur l'affiche ${templateName}.\n\n${summary}\n\nVoici les éléments que je te suggère de personnaliser sur cette affiche :\n${suggestions}\n\nRéponds-moi maintenant à ces points :\n${questions}\n\nTu peux aussi me préciser si certains éléments visuels doivent être conservés tels quels. Quand tu es prêt, je te prépare le récapitulatif à valider avant génération.`;
}

function collectTemplateSearchTokens(
  template: Pick<TemplateRow, "tags" | "name" | "description" | "subCategory">
): string[] {
  return unique([
    ...tokenize(template.name),
    ...tokenize(template.description),
    ...tokenize(template.subCategory),
    ...(template.tags ?? []).flatMap((tag) => tokenize(tag)),
  ]);
}

function inferCategoryScore(
  template: Pick<
    TemplateRow,
    "category" | "channelType" | "tags" | "name" | "description" | "usageCount" | "subCategory"
  >,
  text: string
): number {
  const normalized = normalizeText(text);
  const requestTokens = unique(tokenize(text));
  const templateTokens = collectTemplateSearchTokens(template);
  const topicMatches = collectTopicMatches(text);
  let score = Math.min(template.usageCount * 0.01, 0.75);
  const tags = template.tags ?? [];

  const hints = CATEGORY_HINTS[template.category] ?? [];
  if (hints.some((hint) => normalized.includes(normalizeText(hint)))) {
    score += 4;
  }

  if (template.channelType) {
    const channel = normalizeText(template.channelType);
    if (normalized.includes(channel)) {
      score += 2;
    }
  }

  const subCategory = normalizeText(template.subCategory);
  if (subCategory && normalized.includes(subCategory)) {
    score += 8;
  }

  const overlappingTokens = requestTokens.filter((token) => templateTokens.includes(token));
  score += Math.min(overlappingTokens.length * 1.8, 10);

  const exactTagMatches = tags.filter((tag) => {
    const normalizedTag = normalizeText(tag);
    return normalizedTag.length > 2 && normalized.includes(normalizedTag);
  });
  score += Math.min(exactTagMatches.length * 4, 12);

  const templateTopicMatches = collectTemplateTopicMatches(template);
  const sharedTopics = topicMatches.filter((topic) => templateTopicMatches.includes(topic));
  if (sharedTopics.length > 0) {
    score += 30;
  } else if (topicMatches.length > 0) {
    score -= 8;
  }

  const requestHasHolidayTopic = hasHolidayTopic(text);
  const templateHasConflictingHolidayTopic = templateTopicMatches.some(
    (topic) => topic !== "chabbat" && !topicMatches.includes(topic)
  );

  if (requestHasHolidayTopic && template.category === "HOLIDAY") {
    score += 4;
  }

  if (requestHasHolidayTopic && templateHasConflictingHolidayTopic) {
    score -= 12;
  }

  if (requestHasHolidayTopic && template.category !== "HOLIDAY" && template.category !== "GREETING") {
    score -= 3;
  }

  if (normalized.includes(normalizeText(template.name))) {
    score += 3;
  }

  if (template.category === "GENERAL" && topicMatches.length > 0) {
    score -= 4;
  }

  return score;
}

function buildTemplateReason(
  template: Pick<TemplateRow, "category" | "channelType" | "tags" | "name" | "description" | "subCategory">,
  text: string
): string {
  const categoryLabel = CATEGORY_LABELS[template.category] ?? template.category;
  const topicMatches = getSharedTopics(template, text);
  const tags = template.tags ?? [];

  if (topicMatches.length > 0) {
    return `Correspond bien au sujet ${topicMatches[0].replaceAll("_", " ")} et à la catégorie ${categoryLabel.toLowerCase()}.`;
  }

  const requestTokens = tokenize(text);
  const matchingTags = tags.filter((tag) =>
    requestTokens.some((token) => normalizeText(tag).includes(token))
  );

  if (matchingTags.length > 0) {
    return `Correspond au sujet grâce aux thèmes : ${matchingTags.slice(0, 3).join(", ")}.`;
  }

  if (template.channelType) {
    return `Adapté aux visuels ${template.channelType.toLowerCase()} et à la catégorie ${categoryLabel.toLowerCase()}.`;
  }

  if (tags.length > 0) {
    return `Pertinent pour ${categoryLabel.toLowerCase()} avec les tags : ${tags.slice(0, 3).join(", ")}.`;
  }

  return `Pertinent pour la catégorie ${categoryLabel.toLowerCase()}.`;
}

export function buildTemplateSuggestions(
  templates: Array<
    Pick<
      TemplateRow,
      | "id"
      | "communityId"
      | "name"
      | "description"
      | "category"
      | "channelType"
      | "thumbnailUrl"
      | "previewUrl"
      | "tags"
      | "subCategory"
      | "isPremium"
      | "usageCount"
    >
  >,
  text: string,
  options?: {
    limit?: number;
    communityId?: string | null;
    forceAtLeastOne?: boolean;
    // Quand fourni, seuls les templates de cette catégorie sont proposés (règle stricte).
    strictCategory?: string | null;
  }
): TemplateSuggestion[] {
  const limit = options?.limit ?? 5;

  // Filtre strict par catégorie : si une catégorie est détectée dans la demande,
  // on n'affiche QUE les affiches de cette catégorie. Jamais d'autre catégorie.
  const filteredTemplates = options?.strictCategory
    ? templates.filter((t) => t.category === options.strictCategory)
    : templates;

  const requestedTopics = collectTopicMatches(text);
  const requestedHolidayTopics = requestedTopics.filter((topic) => topic !== "chabbat");
  const scoredTemplates = [...filteredTemplates]
    .map((template) => {
      const sharedTopics = getSharedTopics(template, text);
      return {
        template,
        sharedTopics,
        score:
          inferCategoryScore(template, text) +
          (options?.communityId && template.communityId === options.communityId ? 4 : 0),
        isOwned: Boolean(options?.communityId && template.communityId === options.communityId),
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (left.isOwned !== right.isOwned) {
        return left.isOwned ? -1 : 1;
      }

      return (right.template.usageCount ?? 0) - (left.template.usageCount ?? 0);
    });

  // En mode catégorie stricte : tous les templates de la catégorie sont candidats,
  // triés par pertinence. Pas de seuil de score — on veut TOUJOURS proposer des affiches
  // de la bonne catégorie, même si le score individuel est faible.
  if (options?.strictCategory) {
    const candidatePool = scoredTemplates
      .slice(0, Math.max(limit * 6, 20))
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        if (left.isOwned !== right.isOwned) return left.isOwned ? -1 : 1;
        return (right.template.usageCount ?? 0) - (left.template.usageCount ?? 0);
      });

    const selectedTemplates = [];
    const selectedNames = new Set<string>();
    for (const match of candidatePool) {
      const nameKey = normalizeText(match.template.name);
      if (!selectedNames.has(nameKey)) {
        selectedTemplates.push(match);
        selectedNames.add(nameKey);
      }
      if (selectedTemplates.length >= limit) break;
    }
    return selectedTemplates.map(({ template }) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      thumbnailUrl: resolveTemplateAssetUrl(template.thumbnailUrl),
      previewUrl: resolveTemplateAssetUrl(template.previewUrl),
      tags: template.tags ?? [],
      isPremium: template.isPremium,
      usageCount: template.usageCount,
      reason: buildTemplateReason(template, text),
    }));
  }

  const exactTopicMatches =
    requestedHolidayTopics.length > 0
      ? scoredTemplates.filter(({ sharedTopics }) =>
          requestedHolidayTopics.some((topic) => sharedTopics.includes(topic))
        )
      : [];
  const candidateTemplates = exactTopicMatches.length > 0 ? exactTopicMatches : scoredTemplates;
  const strictThreshold = exactTopicMatches.length > 0 ? 1 : 5;
  const strictMatches = candidateTemplates.filter(({ score }) => score >= strictThreshold);
  const fallbackMatches = options?.forceAtLeastOne
    ? candidateTemplates.filter(({ score }) => score >= 1.5)
    : [];
  const eligibleMatches =
    strictMatches.length > 0
      ? strictMatches
      : fallbackMatches.length > 0
        ? fallbackMatches
        : options?.forceAtLeastOne
          ? candidateTemplates
          : [];
  const candidatePool = eligibleMatches
    .slice(0, Math.max(limit * 6, 20))
    .sort((left, right) => {
      const leftShared = left.sharedTopics.length;
      const rightShared = right.sharedTopics.length;
      if (rightShared !== leftShared) {
        return rightShared - leftShared;
      }

      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (left.isOwned !== right.isOwned) {
        return left.isOwned ? -1 : 1;
      }

      return (right.template.usageCount ?? 0) - (left.template.usageCount ?? 0);
    });

  const selectedTemplates = [];
  const selectedNames = new Set<string>();

  for (const match of candidatePool) {
    const nameKey = normalizeText(match.template.name);
    if (selectedNames.has(nameKey)) {
      continue;
    }

    selectedTemplates.push(match);
    selectedNames.add(nameKey);

    if (selectedTemplates.length >= limit) {
      break;
    }
  }

  for (const match of candidatePool) {
    if (selectedTemplates.length >= limit) {
      break;
    }

    if (!selectedTemplates.some((selected) => selected.template.id === match.template.id)) {
      selectedTemplates.push(match);
    }
  }

  return selectedTemplates
    .map(({ template }) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      thumbnailUrl: resolveTemplateAssetUrl(template.thumbnailUrl),
      previewUrl: resolveTemplateAssetUrl(template.previewUrl),
      tags: template.tags ?? [],
      isPremium: template.isPremium,
      usageCount: template.usageCount,
      reason: buildTemplateReason(template, text),
    }));
}
