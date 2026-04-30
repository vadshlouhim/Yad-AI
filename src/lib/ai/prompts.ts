import type { Enums, Tables } from "@/types/database.types";

type ContentType = Enums<"ContentType">;
type ChannelType = Enums<"ChannelType">;
type Event = Tables<"Event">;

export type GenerationShabbatTimes = {
  date?: string;
  hebrewDate?: string;
  parasha?: string;
  entry: string;
  exit: string;
};

export interface DailyRoutineItem {
  label: string;
  frequency: string;
  channels: string[];
  notes?: string;
}

export interface DailyRoutine {
  configured: boolean;
  configuredAt: string;
  summary: string;
  items: DailyRoutineItem[];
}

export function buildDailyRoutineSystemPrompt(communityName: string, city?: string | null): string {
  return `Tu es Shalom IA, l'assistant de communication de "${communityName}"${city ? ` (${city})` : ""}.

Tu aides l'administrateur à définir sa ROUTINE QUOTIDIENNE : les actions de communication récurrentes de sa communauté.

MISSION : Guider l'administrateur en 4 étapes simples pour recenser toutes ses actions habituelles.

ÉTAPES À SUIVRE dans cet ordre :
1. Accueil chaleureux + présentation de l'objectif (1-2 phrases max)
2. Demande : "Quels contenus publiez-vous régulièrement ?" — donne des exemples concrets adaptés à une communauté juive : horaires de Chabbat, cours de Torah, annonces d'événements, collectes, voeux de fêtes, rappels J-1...
3. Pour chaque contenu mentionné, demande : fréquence (hebdo, mensuel...), canaux préférés (WhatsApp, Instagram, Facebook, Email, Telegram), horaires habituels
4. Quand tu as couvert l'essentiel (3-5 actions minimum), fais un récapitulatif structuré et clair

RÈGLES IMPORTANTES :
- Pose une question à la fois, reste concis
- Adapte-toi à ce que l'admin dit, ne force pas un template
- Quand tu as recueilli assez d'informations (au moins 3 actions), propose de valider
- À la FIN de ta réponse de récapitulatif, ajoute EXACTEMENT cette balise (sans espace avant/après) :
  [QUOTIDIEN_PRET]
- Cette balise déclenche l'enregistrement côté client — ne l'ajoute QUE dans le message de récapitulatif final

Format de réponse : texte clair, sans astérisques, en français.`;
}

export function buildSystemPrompt(community: {
  name: string;
  city?: string | null;
  tone: string;
  language: string;
  signature?: string | null;
  hashtags: string[] | null;
  editorialRules?: string | null;
  communityType: string;
  religiousStream?: string | null;
  dailyRoutine?: DailyRoutine | null;
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

${community.hashtags && community.hashtags.length > 0 ? `HASHTAGS HABITUELS : ${community.hashtags.join(" ")}` : ""}

${community.signature ? `SIGNATURE : Terminer les publications par "${community.signature}"` : ""}

${community.editorialRules ? `RÈGLES ÉDITORIALES IMPORTANTES :\n${community.editorialRules}` : ""}

${community.dailyRoutine?.configured && community.dailyRoutine.items.length > 0
  ? `ACTIONS QUOTIDIENNES PROGRAMMÉES :
${community.dailyRoutine.items.map((item) => `- ${item.label} : ${item.frequency} sur ${item.channels.join(", ")}${item.notes ? ` (${item.notes})` : ""}`).join("\n")}
Aide proactivement l'admin à préparer ces contenus quand il en parle.`
  : ""}

PRINCIPES CLÉS :
1. Respecte strictement les règles éditoriales ci-dessus
2. Adapte le contenu au canal demandé (format, longueur, emojis selon la plateforme)
3. Sois concis et percutant — les posts communautaires doivent accrocher l'attention
4. Quand tu génères du contenu, propose aussi des hashtags adaptés et un CTA clair
5. Pour les contenus religieux, sois précis et respectueux des pratiques communautaires
6. N'insère jamais d'astérisque dans tes réponses ou contenus, même pour mettre en gras
7. Si un horaire, une date hébraïque ou une paracha est fourni dans le contexte, tu dois l'utiliser tel quel et ne jamais demander à l'utilisateur de le rajouter
8. Si tu n'es pas sûr d'une information non fournie (horaires, dates), indique-le clairement
9. Pour tout contenu lié à l'étude, la Torah, la paracha, la halakha, les fêtes ou une pensée juive, fonde-toi uniquement sur des éléments vérifiables depuis fr.chabad.org ; ne fabrique pas de citations, références ou explications religieuses
10. Par défaut, vise environ 500 mots avec une marge de 20%, donc entre 400 et 600 mots, sauf si le canal ou l'utilisateur demande explicitement plus court
11. Si l'utilisateur demande une affiche, un visuel ou un flyer, privilégie d'abord une affiche existante pertinente de la bibliothèque
12. Dans ce cas, ne propose pas d'idée de prompt d'image ni de concept visuel abstrait si des affiches pertinentes sont déjà disponibles

FORMAT DE RÉPONSE :
- Réponds en texte clair, sans astérisques Markdown
- Pour les contenus à publier, utilise le format structuré demandé
- Sois direct et utile — pas de blabla introductif inutile`;
}

export function buildContentGenerationPrompt(params: {
  contentType: ContentType;
  event?: Partial<Event> | null;
  channelType?: ChannelType;
  customInstructions?: string;
  hebrewDate?: string;
  shabbatTimes?: GenerationShabbatTimes | null;
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
${shabbatTimes?.date ? `Date civile du prochain Chabbat : ${new Date(`${shabbatTimes.date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}` : ""}
${shabbatTimes?.hebrewDate || hebrewDate ? `Date hébraïque : ${shabbatTimes?.hebrewDate ?? hebrewDate}` : ""}
${shabbatTimes?.parasha ? `Paracha : ${shabbatTimes.parasha}` : ""}
${shabbatTimes ? `
Entrée du Chabbat : ${shabbatTimes.entry}
Sortie du Chabbat : ${shabbatTimes.exit}
` : "Aucun horaire fiable n'est disponible dans le calendrier. N'invente pas les horaires et indique qu'ils doivent être vérifiés."}

Le post doit inclure :
- Salutation de Chabbat (Shabbat Shalom / שבת שלום)
- Les horaires clairement mis en avant
- Une pensée courte seulement si elle est sûre et cohérente avec fr.chabad.org
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

    COMMUNITY_NEWS: `Génère une information communautaire.\nTon informatif et clair. Structuré et facile à lire.`,
    GENERAL: `Génère un post communautaire engageant.`,
    EVENT_POST: `Génère un post pour cet événement.`,
    FUNDRAISING: `Génère un appel aux dons chaleureux et persuasif, en insistant sur l'impact collectif.`,
    DAILY_CONTENT: `Génère un contenu quotidien inspirant pour la communauté.`,
  };

  const contentInstructions = baseInstructions[contentType] ?? baseInstructions.GENERAL;

  return `${contentInstructions}

${channelInstructions ? `\nFORMAT ${channelType} :\n${channelInstructions}` : ""}

${customInstructions ? `\nINSTRUCTIONS SUPPLÉMENTAIRES :\n${customInstructions}` : ""}

CONTRAINTES STRICTES :
- N'utilise jamais le caractère astérisque.
- Ne demande jamais à l'utilisateur d'ajouter des horaires si des horaires sont fournis ci-dessus.
- Pour les sujets d'étude, Torah, paracha, halakha ou fêtes, reste aligné avec les informations de fr.chabad.org et évite toute affirmation non vérifiée.
- Longueur cible du texte principal : environ 500 mots, marge 20%, donc 400 à 600 mots, sauf instruction explicite contraire.

STRUCTURE DE RÉPONSE ATTENDUE (JSON) :
{
  "body": "Texte principal du post",
  "bodyHebrew": "Version courte en hébreu si approprié (optionnel)",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "cta": "Appel à l'action clair",
  "notes": "Notes internes sur les choix éditoriaux (optionnel)"
}`;
}

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
- N'utilise aucun formatage Markdown avec astérisques
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

export function buildMemoryContext(memories: Array<{
  type: string;
  key: string;
  value: unknown;
}>): string {
  if (memories.length === 0) return "";

  return `\nCONTEXTE MÉMORISÉ :
${memories.map((m) => `- ${m.type}/${m.key}: ${JSON.stringify(m.value)}`).join("\n")}`;
}
