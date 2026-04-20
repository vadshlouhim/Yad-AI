// ============================================================
// Yad.ia — Architecture de prompts IA
// Modulaire, contextuelle, maintenable
// ============================================================

import type { Community, Event, ContentType, ChannelType } from "@prisma/client";

// ============================================================
// PROMPT SYSTÈME DE BASE
// ============================================================

export function buildSystemPrompt(community: {
  name: string;
  city?: string | null;
  tone: string;
  language: string;
  signature?: string | null;
  hashtags: string[];
  editorialRules?: string | null;
  communityType: string;
  religiousStream?: string | null;
}): string {
  const toneDesc = {
    MODERN: "moderne, dynamique et engageant",
    TRADITIONAL: "traditionnel, respectueux et sobre",
    FRIENDLY: "chaleureux, convivial et bienveillant",
    FORMAL: "formel, professionnel et institutionnel",
    RELIGIOUS: "religieux, spirituel et inspirant",
  }[community.tone] ?? "professionnel et engageant";

  const communityTypeDesc = {
    SYNAGOGUE: "synagogue",
    ASSOCIATION: "association communautaire",
    SCHOOL: "école ou yeshiva",
    CENTER: "centre communautaire",
    OTHER: "structure communautaire",
  }[community.communityType] ?? "communauté";

  return `Tu es Yad.ia, l'assistant IA de communication de "${community.name}", une ${communityTypeDesc}${community.city ? ` basée à ${community.city}` : ""}${community.religiousStream ? `, de tradition ${community.religiousStream}` : ""}.

TON ET STYLE :
- Ton : ${toneDesc}
- Langue principale : ${community.language === "fr" ? "français" : community.language}
- Tu peux inclure des phrases courtes en hébreu si approprié (fêtes, salutations religieuses)

${community.hashtags.length > 0 ? `HASHTAGS HABITUELS : ${community.hashtags.join(" ")}` : ""}

${community.signature ? `SIGNATURE : Terminer les publications par "${community.signature}"` : ""}

${community.editorialRules ? `RÈGLES ÉDITORIALES IMPORTANTES :\n${community.editorialRules}` : ""}

PRINCIPES CLÉS :
1. Respecte strictement les règles éditoriales ci-dessus
2. Adapte le contenu au canal demandé (format, longueur, emojis selon la plateforme)
3. Sois concis et percutant — les posts communautaires doivent accrocher l'attention
4. Quand tu génères du contenu, propose aussi des hashtags adaptés et un CTA clair
5. Pour les contenus religieux, sois précis et respectueux des pratiques communautaires
6. Si tu n'es pas sûr d'une information (horaires, dates), indique-le clairement

FORMAT DE RÉPONSE :
- Réponds en markdown pour le chat
- Pour les contenus à publier, utilise le format structuré demandé
- Sois direct et utile — pas de blabla introductif inutile`;
}

// ============================================================
// PROMPTS PAR TYPE DE CONTENU
// ============================================================

export function buildContentGenerationPrompt(params: {
  contentType: ContentType;
  event?: Partial<Event> | null;
  channelType?: ChannelType;
  customInstructions?: string;
  hebrewDate?: string;
  shabbatTimes?: { entry: string; exit: string } | null;
  holidayName?: string;
}): string {
  const { contentType, event, channelType, customInstructions, hebrewDate, shabbatTimes, holidayName } = params;

  const channelInstructions = channelType ? CHANNEL_FORMAT_INSTRUCTIONS[channelType] : "";

  const baseInstructions: Record<string, string> = {
    EVENT_ANNOUNCEMENT: `
Génère une annonce pour l'événement suivant.
${event ? `
Événement : ${event.title}
Date : ${event.startDate ? new Date(event.startDate).toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "À définir"}
Lieu : ${event.location ?? "Non précisé"}
Description : ${event.description ?? "Non précisée"}
Public : ${event.audience ?? "Toute la communauté"}
` : ""}
Le contenu doit être enthousiaste, informatif et inciter à participer.
    `,

    EVENT_REMINDER: `
Génère un rappel pour l'événement suivant qui se déroule bientôt.
${event ? `
Événement : ${event.title}
Date : ${event.startDate ? new Date(event.startDate).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : "À définir"}
Lieu : ${event.location ?? "Non précisé"}
` : ""}
Rappel urgent et clair. Mentionne qu'il reste peu de temps.
    `,

    EVENT_DAY: `
C'est le jour de l'événement ! Génère un post de jour J.
${event ? `
Événement : ${event.title}
Lieu : ${event.location ?? "Non précisé"}
Heure : ${event.startDate ? new Date(event.startDate).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "À définir"}
` : ""}
Ton excité et bienveillant. Rappel de l'heure et du lieu. Invite à partager.
    `,

    EVENT_RECAP: `
Génère un post récapitulatif après l'événement.
${event ? `
Événement : ${event.title}
` : ""}
Ton chaleureaux, remerciant les participants et les organisateurs.
Résume l'ambiance et les temps forts. Teaser du prochain événement si possible.
    `,

    SHABBAT_TIMES: `
Génère un post d'horaires de Chabbat.
${hebrewDate ? `Date hébraïque : ${hebrewDate}` : ""}
${shabbatTimes ? `
Entrée du Chabbat : ${shabbatTimes.entry}
Sortie du Chabbat : ${shabbatTimes.exit}
` : "Inclure les placeholders [HEURE_ENTREE] et [HEURE_SORTIE] pour les horaires."}

Le post doit inclure :
- Salutation de Chabbat (Shabbat Shalom / שבת שלום)
- Les horaires clairement mis en avant
- Un verset ou une pensée courte si approprié
- Un souhait de bon Chabbat à la fin
    `,

    HOLIDAY_GREETING: `
Génère des voeux pour la fête ${holidayName ?? "juive"}.
Contenu festif, chaleureux, avec les voeux traditionnels en hébreu et en français.
Include le symbole/emoji approprié à la fête.
    `,

    COURSE_ANNOUNCEMENT: `
Génère une annonce pour un cours.
${event ? `
Cours : ${event.title}
Date : ${event.startDate ? new Date(event.startDate).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : "À définir"}
Lieu : ${event.location ?? "Non précisé"}
Description : ${event.description ?? ""}
` : ""}
Ton éducatif et invitant. Mentionne les bénéfices d'assister.
    `,

    COMMUNITY_NEWS: `
Génère une information communautaire.
Ton informatif et clair. Structuré et facile à lire.
    `,

    GENERAL: `Génère un post communautaire engageant.`,
    EVENT_POST: `Génère un post pour cet événement.`,
    FUNDRAISING: `Génère un appel aux dons chaleureux et persuasif, en insistant sur l'impact collectif.`,
    DAILY_CONTENT: `Génère un contenu quotidien inspirant pour la communauté.`,
  };

  const contentInstructions = baseInstructions[contentType] ?? baseInstructions.GENERAL;

  return `${contentInstructions}

${channelInstructions ? `\nFORMAT ${channelType} :\n${channelInstructions}` : ""}

${customInstructions ? `\nINSTRUCTIONS SUPPLÉMENTAIRES :\n${customInstructions}` : ""}

STRUCTURE DE RÉPONSE ATTENDUE (JSON) :
{
  "body": "Texte principal du post",
  "bodyHebrew": "Version courte en hébreu si approprié (optionnel)",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "cta": "Appel à l'action clair",
  "notes": "Notes internes sur les choix éditoriaux (optionnel)"
}`;
}

// ============================================================
// INSTRUCTIONS FORMAT PAR CANAL
// ============================================================

export const CHANNEL_FORMAT_INSTRUCTIONS: Record<ChannelType, string> = {
  INSTAGRAM: `
- Longueur idéale : 150-300 mots
- Commence par une phrase d'accroche forte (sans cliché)
- 5-10 hashtags pertinents (mélange populaires et niches)
- Emojis utilisés avec modération mais présents
- CTA clair (lien en bio, commentez, etc.)
- Format : un seul bloc de texte fluide
  `,
  FACEBOOK: `
- Longueur idéale : 100-200 mots
- Paragraphes courts et aérés
- 3-5 hashtags maximum
- Emojis pour structurer, pas pour décorer
- CTA direct (bouton, lien direct)
- Peut inclure une question pour générer de l'engagement
  `,
  WHATSAPP: `
- Longueur idéale : 80-150 mots
- Texte court, clair, lisible sur mobile
- Pas de hashtags
- Emojis courants et expressifs (🙏 ✡️ 📅)
- Message chaleureux et direct
- Format : messages courts et percutants
  `,
  TELEGRAM: `
- Longueur idéale : 100-200 mots
- Peut utiliser le formatage Markdown de Telegram (*gras*, _italique_)
- Pas de hashtags (ou très peu)
- Ton direct et informatif
- Liens cliquables si pertinents
  `,
  EMAIL: `
- Objet percutant (50 caractères max)
- Introduction en 1-2 phrases
- Contenu structuré avec sections claires
- Bouton CTA principal et secondaire
- Signature complète
- Longueur totale : 200-400 mots
  `,
  WEB: `
- Contenu adapté au site web de la communauté
- Bon pour le référencement
- Structuré avec titres et paragraphes
  `,
};

// ============================================================
// PROMPT ADAPTATION PAR CANAL
// ============================================================

export function buildAdaptationPrompt(
  originalContent: string,
  targetChannel: ChannelType,
  communityContext: string
): string {
  return `Adapte le contenu suivant pour le canal ${targetChannel}.

CONTENU ORIGINAL :
${originalContent}

CONTEXTE COMMUNAUTÉ :
${communityContext}

${CHANNEL_FORMAT_INSTRUCTIONS[targetChannel]}

Génère le contenu adapté en JSON :
{
  "body": "Contenu adapté pour ${targetChannel}",
  "hashtags": ["#hashtag"],
  "cta": "Appel à l'action adapté au canal"
}`;
}

// ============================================================
// PROMPT MÉMOIRE / CONTEXTE HISTORIQUE
// ============================================================

export function buildMemoryContext(memories: Array<{
  type: string;
  key: string;
  value: unknown;
}>): string {
  if (memories.length === 0) return "";

  return `\nCONTEXTE MÉMORISÉ :
${memories.map((m) => `- ${m.type}/${m.key}: ${JSON.stringify(m.value)}`).join("\n")}`;
}
