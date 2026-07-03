export type BlogArticleStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface BlogArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  coverImageUrl: string | null;
  coverImageAlt: string;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string | null;
  authorName: string;
  readingMinutes: number;
  status: BlogArticleStatus;
  isFeatured: boolean;
  isIndexable: boolean;
  publishedAt: string | null;
  updatedAt: string;
}

export const BLOG_CATEGORIES = [
  "Communication IA",
  "Réseaux sociaux",
  "WhatsApp",
  "Email",
  "Automatisation",
  "Référencement",
  "Associations",
  "Communautés",
];

export function slugifySeo(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

export function estimateReadingMinutes(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

export function normalizeBlogArticle(row: Partial<BlogArticle> & { title: string; slug: string }): BlogArticle {
  const now = new Date().toISOString();
  const content = row.content ?? "";
  return {
    id: row.id ?? `blog_${row.slug}`,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? row.metaDescription ?? "",
    content,
    category: row.category ?? "Communication IA",
    tags: Array.isArray(row.tags) ? row.tags : [],
    coverImageUrl: row.coverImageUrl ?? null,
    coverImageAlt: row.coverImageAlt ?? row.title,
    metaTitle: row.metaTitle ?? `${row.title} - EasyCom IA`,
    metaDescription: row.metaDescription ?? row.excerpt ?? "",
    canonicalUrl: row.canonicalUrl ?? null,
    authorName: row.authorName ?? "Équipe EasyCom IA",
    readingMinutes: row.readingMinutes ?? estimateReadingMinutes(content),
    status: row.status ?? "PUBLISHED",
    isFeatured: Boolean(row.isFeatured),
    isIndexable: row.isIndexable ?? true,
    publishedAt: row.publishedAt ?? now,
    updatedAt: row.updatedAt ?? now,
  };
}

export const FALLBACK_BLOG_ARTICLES: BlogArticle[] = [
  normalizeBlogArticle({
    id: "blog_communication-ia-communautes",
    slug: "communication-ia-communautes",
    title: "Comment l'IA transforme la communication des communautés",
    excerpt: "Une méthode concrète pour centraliser messages, réseaux sociaux, emails et rappels sans perdre l'identité humaine de votre structure.",
    category: "Communication IA",
    tags: ["communication IA", "communauté", "productivité", "EasyCom IA"],
    isFeatured: true,
    metaDescription: "Découvrez comment l'IA aide les communautés, associations et synagogues à mieux organiser leur communication quotidienne.",
    coverImageAlt: "Tableau de bord IA pour communication communautaire",
    content: `L'intelligence artificielle devient utile quand elle simplifie les gestes répétitifs sans remplacer le discernement humain. Pour une communauté, cela signifie préparer les annonces, relances, réponses et publications dans un espace unique.

Avec EasyCom IA, l'objectif n'est pas de publier davantage pour publier davantage. L'objectif est de publier mieux, au bon moment, avec un ton cohérent. Les messages WhatsApp, emails, publications Instagram, Facebook et rappels d'événements peuvent être préparés depuis une même logique éditoriale.

Un bon système commence par trois fondations : un agenda clair, des canaux connectés et une mémoire éditoriale. L'agenda évite les oublis. Les canaux connectés évitent la duplication. La mémoire éditoriale permet à l'IA de respecter le vocabulaire, le ton et les usages de la structure.

Pour approfondir, consultez aussi notre page méthode interne sur /method et les bonnes pratiques publiques de Google Search Central sur https://developers.google.com/search/docs.`,
  }),
  normalizeBlogArticle({
    id: "blog-planification-instagram-facebook-whatsapp",
    slug: "planification-instagram-facebook-whatsapp",
    title: "Planifier Instagram, Facebook et WhatsApp sans multiplier les outils",
    excerpt: "Pourquoi une stratégie multicanale simple aide à rester visible sans transformer la communication en charge mentale.",
    category: "Réseaux sociaux",
    tags: ["Instagram", "Facebook", "WhatsApp", "planification"],
    isFeatured: true,
    metaDescription: "Apprenez à organiser Instagram, Facebook et WhatsApp dans un seul calendrier éditorial simple et efficace.",
    coverImageAlt: "Calendrier éditorial pour réseaux sociaux",
    content: `La difficulté d'une communication multicanale n'est pas seulement de créer du contenu. Elle est de garder une cohérence entre les plateformes. Instagram privilégie le visuel, Facebook contextualise, WhatsApp crée la proximité.

Une organisation efficace consiste à partir d'un message source, puis à l'adapter. Une annonce d'événement peut devenir une publication Instagram, un post Facebook plus détaillé et un rappel WhatsApp court. L'IA accélère cette adaptation tout en gardant la validation humaine.

Le calendrier éditorial doit rester lisible : temps forts, rappels, publications récurrentes, puis récapitulatifs. EasyCom IA réunit ces usages dans le dashboard pour éviter les copier-coller dispersés.

Lien utile : les recommandations Meta Business sur https://www.facebook.com/business/help donnent un cadre complémentaire pour comprendre les usages des pages et comptes professionnels.`,
  }),
  normalizeBlogArticle({
    id: "blog-whatsapp-communautaire-bonnes-pratiques",
    slug: "whatsapp-communautaire-bonnes-pratiques",
    title: "WhatsApp communautaire : bonnes pratiques pour informer sans saturer",
    excerpt: "Fréquence, clarté, consentement et segmentation : les règles simples pour que WhatsApp reste un canal utile.",
    category: "WhatsApp",
    tags: ["WhatsApp", "messages", "contacts", "segmentation"],
    metaDescription: "Conseils pratiques pour utiliser WhatsApp dans une communication communautaire respectueuse et efficace.",
    coverImageAlt: "Conversation WhatsApp communautaire organisée",
    content: `WhatsApp est un canal puissant parce qu'il est direct. C'est aussi pour cette raison qu'il doit être utilisé avec retenue. Un message utile arrive au bon moment, avec une intention claire.

La première règle consiste à segmenter les destinataires. Tous les contacts n'ont pas besoin de recevoir toutes les annonces. Les rappels d'événements, les informations urgentes et les messages récurrents doivent être distingués.

La deuxième règle concerne la forme : phrases courtes, horaire visible, appel à l'action explicite et lien si nécessaire. Une pièce jointe doit servir le message, pas l'alourdir.

EasyCom IA permet de préparer le texte, prévisualiser le rendu et envoyer seulement après validation. Cette étape de contrôle protège la relation de confiance avec les membres.`,
  }),
  normalizeBlogArticle({
    id: "blog-repondre-avis-google-avec-ia",
    slug: "repondre-avis-google-avec-ia",
    title: "Répondre aux avis Google avec l'IA tout en gardant un ton humain",
    excerpt: "Une réponse rapide peut améliorer la relation client, mais elle doit rester personnalisée et fidèle à votre voix.",
    category: "Référencement",
    tags: ["avis Google", "réputation", "réponse IA", "SEO local"],
    metaDescription: "Méthode pour répondre aux avis Google avec l'IA sans perdre la personnalisation et la qualité relationnelle.",
    coverImageAlt: "Avis Google et réponse assistée par IA",
    content: `Les avis Google participent à la confiance et au référencement local. Répondre vite est important, mais répondre juste l'est encore plus. Une réponse générique peut donner une impression froide.

L'IA doit proposer une base : remerciement, reprise du contexte, réponse au point soulevé, invitation à poursuivre l'échange si nécessaire. L'humain garde le dernier mot avant publication.

Pour une structure locale, les avis sont aussi une source d'apprentissage. Ils révèlent les attentes, les incompréhensions et les points forts. Les centraliser dans EasyCom IA permet de mieux suivre la réputation.

Ressource externe : Google Business Profile explique les avis sur https://support.google.com/business/.`,
  }),
  normalizeBlogArticle({
    id: "blog-email-association-automatisation",
    slug: "email-association-automatisation",
    title: "Email associatif : automatiser sans perdre la personnalisation",
    excerpt: "Comment préparer newsletters, rappels et réponses avec une IA qui respecte le contexte de chaque communauté.",
    category: "Email",
    tags: ["email", "association", "newsletter", "automatisation"],
    metaDescription: "Guide pour automatiser la communication email d'une association tout en gardant un ton personnel.",
    coverImageAlt: "Boîte email triée par intelligence artificielle",
    content: `L'email reste un canal solide pour les informations détaillées. Il est moins immédiat que WhatsApp, mais plus adapté aux contenus structurés : programme, compte rendu, campagne de dons, annonce importante.

L'automatisation utile commence par le tri. Quels emails nécessitent une réponse ? Lesquels peuvent attendre ? Lesquels doivent devenir une action dans l'agenda ?

Ensuite vient la rédaction assistée. Une IA peut proposer une réponse claire, mais elle doit s'appuyer sur le contexte : nom de la communauté, ton, habitudes, liens importants.

EasyCom IA centralise cette logique pour éviter que les emails, réseaux sociaux et messages restent dans des silos séparés.`,
  }),
  normalizeBlogArticle({
    id: "blog-calendrier-editorial-chabbat-evenements",
    slug: "calendrier-editorial-chabbat-evenements",
    title: "Construire un calendrier éditorial autour de Chabbat et des événements",
    excerpt: "Une méthode simple pour anticiper les temps forts, rappels et publications récurrentes.",
    category: "Automatisation",
    tags: ["Chabbat", "événements", "calendrier éditorial", "rappels"],
    metaDescription: "Organisez un calendrier éditorial régulier autour de Chabbat, fêtes, cours et événements communautaires.",
    coverImageAlt: "Calendrier éditorial pour Chabbat et événements",
    content: `Les communautés ont des rythmes naturels : Chabbat, fêtes, cours, repas, campagnes et événements ponctuels. Le calendrier éditorial doit suivre ces rythmes plutôt que créer une pression artificielle.

Une bonne organisation distingue les contenus récurrents, les annonces à préparer, les rappels et les récapitulatifs. Chaque contenu peut ensuite être adapté aux canaux : image Instagram, post Facebook, message WhatsApp, email.

L'automatisation devient pertinente lorsqu'elle respecte ce calendrier. Elle ne remplace pas la décision, elle prépare les bons éléments au bon moment.

Dans EasyCom IA, les pages d'automatisation permettent justement d'ancrer cette régularité sans repartir de zéro chaque semaine.`,
  }),
  normalizeBlogArticle({
    id: "blog-seo-local-ia-communication",
    slug: "seo-local-ia-communication",
    title: "SEO local et IA : comment rendre votre structure plus visible",
    excerpt: "Les contenus utiles, avis Google, pages claires et données structurées renforcent la visibilité locale et IA.",
    category: "Référencement",
    tags: ["SEO local", "IA", "Google", "visibilité"],
    isFeatured: true,
    metaDescription: "Comprendre comment l'IA, le contenu utile et le SEO local renforcent la visibilité d'une structure.",
    coverImageAlt: "Référencement local Google et intelligence artificielle",
    content: `Le référencement local repose sur la cohérence : un site clair, des informations à jour, des avis suivis, des pages utiles et une structure technique propre.

Les moteurs de recherche et assistants IA valorisent les contenus explicites. Une page doit répondre à une intention. Un article doit traiter un sujet avec précision. Un titre doit annoncer clairement la promesse.

Les données structurées, le sitemap et les pages légales renforcent la lisibilité technique. Les liens internes aident les moteurs à comprendre les relations entre les pages.

Ressources utiles : Google Search Central sur https://developers.google.com/search/docs et Schema.org sur https://schema.org/.`,
  }),
  normalizeBlogArticle({
    id: "blog-association-reseaux-sociaux-regularite",
    slug: "association-reseaux-sociaux-regularite",
    title: "Pourquoi la régularité compte plus que la quantité sur les réseaux sociaux",
    excerpt: "Publier moins mais mieux : une stratégie réaliste pour associations, commerces et communautés.",
    category: "Réseaux sociaux",
    tags: ["régularité", "réseaux sociaux", "association", "contenu"],
    metaDescription: "Découvrez pourquoi une communication régulière et cohérente est plus efficace qu'une publication intensive.",
    coverImageAlt: "Planning simple de publications régulières",
    content: `La régularité crée la confiance. Une structure qui communique de manière stable devient plus lisible pour son public. Cela ne signifie pas publier tous les jours, mais tenir un rythme réaliste.

Un bon rythme peut être hebdomadaire : une annonce, un rappel, puis un récapitulatif. Pour certains événements, une séquence J-10, J-5 et jour J suffit.

L'IA aide à transformer ce rythme en système. Elle propose les textes, adapte les formats et évite les oublis, mais la validation reste centrale.

La cohérence visuelle compte aussi : mêmes repères, mêmes couleurs, mêmes mots-clés. EasyCom IA aide à préserver cette identité.`,
  }),
  normalizeBlogArticle({
    id: "blog-centraliser-contacts-communication",
    slug: "centraliser-contacts-communication",
    title: "Centraliser ses contacts pour mieux communiquer",
    excerpt: "Une base de contacts propre améliore les emails, WhatsApp, rappels et campagnes ciblées.",
    category: "Associations",
    tags: ["contacts", "segmentation", "CRM", "communication"],
    metaDescription: "Pourquoi centraliser les contacts améliore fortement la pertinence des messages et campagnes.",
    coverImageAlt: "Contacts organisés pour communication ciblée",
    content: `La qualité d'une communication dépend aussi de la qualité de la base de contacts. Un message pertinent envoyé aux mauvaises personnes perd son efficacité.

Centraliser les contacts permet de segmenter : membres actifs, donateurs, participants, familles, prospects, bénévoles. Chaque groupe peut recevoir un message adapté.

Cette organisation réduit aussi les erreurs : doublons, anciens numéros, emails invalides, oublis. Elle facilite les campagnes de dons, les rappels d'événements et les suivis personnalisés.

EasyCom IA connecte cette logique aux canaux de diffusion pour préparer des messages plus justes.`,
  }),
  normalizeBlogArticle({
    id: "blog-pages-legales-confiance-seo",
    slug: "pages-legales-confiance-seo",
    title: "Pages légales, cookies et confiance : un socle souvent négligé",
    excerpt: "Les pages légales ne servent pas seulement à cocher une case : elles rassurent les utilisateurs et clarifient le cadre.",
    category: "Référencement",
    tags: ["pages légales", "cookies", "confiance", "RGPD"],
    metaDescription: "Comprendre pourquoi les pages légales, cookies et confidentialité renforcent la confiance et la clarté SEO.",
    coverImageAlt: "Documents légaux et confiance numérique",
    content: `Un site sérieux doit rendre ses règles faciles à trouver. Conditions d'utilisation, confidentialité, cookies, contact et suppression des données créent un cadre lisible.

Ces pages aident l'utilisateur à comprendre comment le service fonctionne, quelles données sont utilisées et comment exercer ses droits. Elles aident aussi les moteurs à interpréter le site comme une entité structurée.

Le plan du site HTML complète le sitemap XML. Le premier aide les visiteurs, le second aide les robots d'exploration.

EasyCom IA doit donc combiner utilité produit, transparence juridique et structure technique propre.`,
  }),
];

export function getFallbackArticleBySlug(slug: string) {
  return FALLBACK_BLOG_ARTICLES.find((article) => article.slug === slug && article.status === "PUBLISHED") ?? null;
}
