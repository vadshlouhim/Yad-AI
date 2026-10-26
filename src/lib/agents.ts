export type EasyComAgent = {
  slug: string;
  name: string;
  role: string;
  marketingTitle: string;
  shortDescription: string;
  description: string;
  details: string;
  image: string;
  tone: string;
  capabilities: readonly string[];
};

/** David, l'Assistant EasyCom, is the only agent: one assistant with access to every tool. */
// 427×640 WebP (24 KB) made from david-transparent.png (929 KB): it is shown in raw <img> tags too.
export const ASSISTANT_IMAGE = "/agents/david.webp";

export const ASSISTANT_AGENT: EasyComAgent = {
  slug: "david",
  name: "David",
  role: "Assistant EasyCom",
  marketingTitle: "Un seul assistant. Toute votre communication.",
  shortDescription: "Il prépare vos affiches, publications, newsletters, e-mails et automatisations, depuis une seule conversation.",
  description: "David est votre Assistant EasyCom : un seul interlocuteur qui a accès à tous les outils de la plateforme.",
  details: "Dites-lui simplement ce dont vous avez besoin : une affiche pour Chabbat, une publication, la newsletter, une réponse à un avis, un rappel d'événement ou un cours de Torah. Il prépare, vous validez.",
  image: ASSISTANT_IMAGE,
  tone: "from-violet-600 to-blue-500",
  capabilities: ["Affiches, publications et newsletter", "E-mails, avis Google et WhatsApp", "Automatisations, rappels et cours de Torah"],
};

export const EASYCOM_AGENTS: readonly EasyComAgent[] = [ASSISTANT_AGENT];

/** Former agents whose public pages now point to David. */
export const RETIRED_AGENT_SLUGS = ["shlomi", "dov", "mendy", "israel", "levik", "barouh", "shmouel", "avi", "tsemah", "zalman"] as const;

export function getEasyComAgent(slug: string) {
  return EASYCOM_AGENTS.find((agent) => agent.slug === slug);
}

const HE_AGENT_COPY: Record<string, Pick<EasyComAgent, "role" | "marketingTitle" | "shortDescription" | "description" | "details" | "capabilities">> = {
  david: {
    role: "העוזר של EasyCom",
    marketingTitle: "עוזר אחד. כל התקשורת שלכם.",
    shortDescription: "הוא מכין מודעות, פרסומים, עלונים, אימיילים ואוטומציות – הכל משיחה אחת.",
    description: "David הוא העוזר של EasyCom: איש קשר אחד עם גישה לכל הכלים של הפלטפורמה.",
    details: "פשוט אמרו לו מה אתם צריכים: מודעה לשבת, פרסום, עלון, תשובה לביקורת, תזכורת לאירוע או שיעור תורה. הוא מכין, אתם מאשרים.",
    capabilities: ["מודעות, פרסומים ועלון", "אימיילים, ביקורות Google ו-WhatsApp", "אוטומציות, תזכורות ושיעורי תורה"],
  },
};

export function getLocalizedEasyComAgent(slug: string, locale: string) {
  const agent = getEasyComAgent(slug);
  if (!agent || locale !== "he") return agent;
  return { ...agent, ...HE_AGENT_COPY[slug] };
}
