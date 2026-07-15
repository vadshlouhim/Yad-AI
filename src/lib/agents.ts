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

export const AGENTS_GROUP_IMAGE =
  "https://xicipkwqvuoaavvdgnnb.supabase.co/storage/v1/object/public/Image%20du%20site/Tous%20les%20agnets.webp";

export const EASYCOM_AGENTS: readonly EasyComAgent[] = [
  {
    slug: "shlomi",
    name: "Shlomi",
    role: "Orchestrateur IA",
    marketingTitle: "Tout avance ensemble.",
    shortDescription: "Il coordonne les agents et vous aide à piloter toute votre communication depuis un seul espace.",
    description: "Shlomi est votre point d'entrée. Il comprend votre besoin, mobilise le bon agent et vous aide à suivre ce qui avance.",
    details: "Demandez-lui simplement ce que vous voulez accomplir : il vous oriente, prépare un plan d'action et relie les activités entre elles pour que votre communication reste cohérente.",
    image: "https://xicipkwqvuoaavvdgnnb.supabase.co/storage/v1/object/public/Image%20du%20site/Shlomi%20agent-orcetra-Itshak.webp",
    tone: "from-blue-600 to-cyan-500",
    capabilities: ["Oriente vers le bon agent", "Centralise les actions à mener", "Garde une vue d'ensemble de votre communication"],
  },
  {
    slug: "david",
    name: "David",
    role: "Automatisations",
    marketingTitle: "Votre routine. Automatique.",
    shortDescription: "Il met en place vos routines : rappels, publications et actions récurrentes, au bon moment.",
    description: "David transforme vos habitudes de communication en automatisations simples et fiables.",
    details: "Il vous aide à programmer les rappels d'événements, les publications régulières et les séquences utiles, afin que les actions importantes ne reposent plus sur votre mémoire.",
    image: "https://xicipkwqvuoaavvdgnnb.supabase.co/storage/v1/object/public/Image%20du%20site/David%20responsable%20automatisations.webp",
    tone: "from-violet-600 to-blue-500",
    capabilities: ["Crée des routines récurrentes", "Programme rappels et publications", "Vous laisse choisir le niveau de validation"],
  },
  {
    slug: "dov",
    name: "Dov",
    role: "Instagram",
    marketingTitle: "Instagram, sans effort.",
    shortDescription: "Il prépare vos contenus Instagram pour vous aider à rester visible avec des publications cohérentes.",
    description: "Dov vous accompagne pour transformer une idée, un événement ou une actualité en contenu Instagram prêt à publier.",
    details: "Il vous propose des textes, des angles et des publications adaptées à votre univers afin de vous aider à communiquer régulièrement, sans recommencer à zéro à chaque fois.",
    image: "https://xicipkwqvuoaavvdgnnb.supabase.co/storage/v1/object/public/Image%20du%20site/Dov%20ber%20insta.webp",
    tone: "from-pink-600 to-orange-400",
    capabilities: ["Prépare des publications et légendes", "Adapte le ton à votre structure", "Aide à maintenir une présence régulière"],
  },
  {
    slug: "mendy",
    name: "Mendy",
    role: "Facebook",
    marketingTitle: "Facebook, toujours vivant.",
    shortDescription: "Il vous accompagne pour créer et publier des contenus adaptés à votre page Facebook.",
    description: "Mendy vous aide à communiquer clairement avec votre communauté sur Facebook.",
    details: "À partir d'une information simple, il prépare un message structuré, facile à relire et prêt à publier. Vous conservez toujours le dernier mot avant la diffusion.",
    image: "https://xicipkwqvuoaavvdgnnb.supabase.co/storage/v1/object/public/Image%20du%20site/MENDY%20FAC.webp",
    tone: "from-blue-700 to-indigo-500",
    capabilities: ["Rédige des posts adaptés à Facebook", "Met en valeur vos actualités", "Prépare la publication en quelques étapes"],
  },
  {
    slug: "israel",
    name: "Israël",
    role: "WhatsApp",
    marketingTitle: "Le bon message. Au bon moment.",
    shortDescription: "Il prépare vos messages, vos relances et vos envois WhatsApp pour garder le lien simplement.",
    description: "Israël vous aide à garder une communication de proximité sur WhatsApp, sans perdre de temps sur la rédaction.",
    details: "Il prépare des messages courts et adaptés à chaque situation : une information importante, un rappel, une invitation ou une relance. Vous pouvez les personnaliser avant l'envoi.",
    image: "https://xicipkwqvuoaavvdgnnb.supabase.co/storage/v1/object/public/Image%20du%20site/Israel%20Whatssap.webp",
    tone: "from-emerald-600 to-teal-400",
    capabilities: ["Prépare vos messages WhatsApp", "Aide à relancer au bon moment", "Simplifie les envois récurrents"],
  },
  {
    slug: "levik",
    name: "Levik",
    role: "Emails",
    marketingTitle: "Votre boîte mail, maîtrisée.",
    shortDescription: "Il vous aide à trier, rédiger et envoyer vos emails sans perdre le ton de votre structure.",
    description: "Levik remet de l'ordre dans votre communication email et vous aide à répondre plus vite.",
    details: "Il facilite la préparation des réponses, la rédaction des communications importantes et le suivi des messages qui méritent votre attention.",
    image: "https://xicipkwqvuoaavvdgnnb.supabase.co/storage/v1/object/public/Image%20du%20site/Levik%20Email.webp",
    tone: "from-rose-600 to-red-400",
    capabilities: ["Aide à trier les emails", "Prépare des réponses personnalisables", "Rédige vos communications importantes"],
  },
  {
    slug: "barouh",
    name: "Barouh",
    role: "Avis Google",
    marketingTitle: "Chaque avis compte.",
    shortDescription: "Il surveille vos avis, prépare des réponses pertinentes et vous aide à soigner votre réputation.",
    description: "Barouh vous aide à suivre votre réputation locale et à ne laisser aucun avis important sans réponse.",
    details: "Il repère les nouveaux avis, propose des réponses adaptées à votre ton et vous permet de garder une relation attentive avec les personnes qui vous découvrent sur Google.",
    image: "https://xicipkwqvuoaavvdgnnb.supabase.co/storage/v1/object/public/Image%20du%20site/Barouh%20Avis%20Google.webp",
    tone: "from-amber-500 to-orange-400",
    capabilities: ["Centralise vos avis Google", "Propose des réponses pertinentes", "Aide à protéger votre réputation"],
  },
  {
    slug: "shmouel",
    name: "Shmouel",
    role: "Cours de Torah",
    marketingTitle: "Vos enseignements, amplifiés.",
    shortDescription: "Il transforme vos idées et vos enseignements en contenus prêts à partager avec votre communauté.",
    description: "Shmouel met vos cours et enseignements en forme pour qu'ils puissent vivre au-delà du moment où ils sont prononcés.",
    details: "Il vous aide à créer des résumés, annonces et contenus inspirants à partir de vos idées, afin de les partager plus facilement avec votre communauté.",
    image: "https://xicipkwqvuoaavvdgnnb.supabase.co/storage/v1/object/public/Image%20du%20site/Shmouel%20Torah.webp",
    tone: "from-sky-700 to-blue-400",
    capabilities: ["Transforme une idée en contenu", "Prépare des résumés faciles à partager", "Soutient votre communication autour des cours"],
  },
];

export const HOME_EASYCOM_AGENTS: readonly EasyComAgent[] = [
  ...EASYCOM_AGENTS.filter((agent) => agent.slug !== "shlomi"),
  {
    slug: "avi",
    name: "Avi",
    role: "Campagnes de dons",
    marketingTitle: "Une campagne claire, a chaque etape.",
    shortDescription: "Il vous aide a preparer, organiser et diffuser votre campagne de dons avec des contenus prets a valider.",
    description: "Avi structure votre campagne afin que chaque etape, visuel et message reste simple a suivre.",
    details: "Il vous accompagne pour planifier les dates, preparer les visuels et coordonner la diffusion de votre campagne, tout en vous laissant la validation finale.",
    image: "/agents/avi-donation-transparent.png",
    tone: "from-rose-600 to-red-400",
    capabilities: ["Organise les etapes de campagne", "Prepare les contenus a diffuser", "Garde un suivi clair des actions"],
  },
  {
    slug: "tsemah",
    name: "Tsemah",
    role: "Newsletter IA",
    marketingTitle: "Vos nouvelles, bien envoyees.",
    shortDescription: "Il transforme vos evenements et vos photos en newsletters pretes a programmer.",
    description: "Tsemah rassemble les informations utiles de votre communaute pour creer des newsletters simples et soignees.",
    details: "Il prepare le contenu, vous permet de verifier l'email avant l'envoi et vous aide a choisir le bon moment pour le programmer.",
    image: "/agents/tsemah-newsletter-transparent.png",
    tone: "from-fuchsia-600 to-pink-400",
    capabilities: ["Compose vos newsletters", "Prepare une validation avant l'envoi", "Aide a planifier la diffusion"],
  },
  {
    slug: "zalman",
    name: "Zalman",
    role: "Affiches & visuels",
    marketingTitle: "Vos visuels, a votre image.",
    shortDescription: "Il vous accompagne pour personnaliser et creer des affiches coherentes avec vos evenements.",
    description: "Zalman vous aide a choisir, personnaliser et preparer les bons visuels pour chaque moment important.",
    details: "A partir de la banque d'affiches ou de vos idees, il vous guide pour creer un visuel clair, elegant et pret a partager.",
    image: "/agents/zalman-visuals-transparent.png",
    tone: "from-red-600 to-orange-400",
    capabilities: ["Personnalise vos affiches", "Aide a creer de nouveaux visuels", "Prepare les creations a partager"],
  },
];

export function getEasyComAgent(slug: string) {
  return EASYCOM_AGENTS.find((agent) => agent.slug === slug);
}
