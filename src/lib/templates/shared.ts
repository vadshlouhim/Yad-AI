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
  editableZoneCount: number;
  reason: string;
}

export const CATEGORY_LABELS: Record<string, string> = {
  SHABBAT: "Chabbat",
  HOLIDAY: "Fêtes",
  EVENT: "Événements",
  COURSE: "Cours",
  ANNOUNCEMENT: "Annonces",
  RECAP: "Récap",
  GREETING: "Voeux",
  GENERAL: "Général",
};

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
    { id: "registration", label: "Inscription", placeholder: "Ex: Sur yad-ia.com ou 01 23 45 67 89" },
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
  "story",
  "instagram",
  "facebook",
  "social",
  "sociaux",
  "social media",
  "réseaux sociaux",
  "reseaux sociaux",
  "canva",
  "carousel",
  "réseau",
  "réseaux",
  "publication",
  "post",
];

const COMMUNICATION_INTENT_KEYWORDS = [
  "annonce",
  "annoncer",
  "invitation",
  "inviter",
  "programme",
  "programmer",
  "horaire",
  "horaires",
  "soirée",
  "soiree",
  "événement",
  "evenement",
  "cours",
  "chiour",
  "shiour",
  "fête",
  "fete",
  "collecte",
  "gala",
  "camp",
  "kidouch",
  "kiddouch",
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

  if (VISUAL_INTENT_KEYWORDS.some((keyword) => normalized.includes(normalizeText(keyword)))) {
    return true;
  }

  const hasCommunicationNeed = COMMUNICATION_INTENT_KEYWORDS.some((keyword) =>
    normalized.includes(normalizeText(keyword))
  );

  return hasCommunicationNeed && collectTopicMatches(text).length > 0;
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
  let score = Math.min(template.usageCount * 0.03, 2);
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
  score += Math.min(overlappingTokens.length * 1.1, 6);

  const exactTagMatches = tags.filter((tag) => {
    const normalizedTag = normalizeText(tag);
    return normalizedTag.length > 2 && normalized.includes(normalizedTag);
  });
  score += Math.min(exactTagMatches.length * 2, 6);

  const templateTopicMatches = collectTemplateTopicMatches(template);
  const sharedTopics = topicMatches.filter((topic) => templateTopicMatches.includes(topic));
  if (sharedTopics.length > 0) {
    score += 22;
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

  if (template.category === "GENERAL") {
    score -= 0.5;
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
      | "design"
      | "usageCount"
    >
  >,
  text: string,
  options?: {
    limit?: number;
    communityId?: string | null;
    forceAtLeastOne?: boolean;
  }
): TemplateSuggestion[] {
  const limit = options?.limit ?? 3;
  const requestedTopics = collectTopicMatches(text);
  const requestedHolidayTopics = requestedTopics.filter((topic) => topic !== "chabbat");
  const scoredTemplates = [...templates]
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
  const eligibleMatches = strictMatches.length > 0 ? strictMatches : fallbackMatches;
  const candidatePool = eligibleMatches
    .slice(0, Math.max(limit * 6, 12))
    .map((match) => ({
      ...match,
      rotationScore: match.score + Math.random() * 2.5,
    }))
    .sort((left, right) => {
      if (right.rotationScore !== left.rotationScore) {
        return right.rotationScore - left.rotationScore;
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
      editableZoneCount: Array.isArray(template.design) ? template.design.length : 0,
      reason: buildTemplateReason(template, text),
    }));
}
