// Public presentation data only. Never import customer data or dashboard loaders here.
export type PreviewKind =
  | "poster"
  | "newsletter"
  | "channels"
  | "schedule"
  | "message"
  | "contacts"
  | "calendar"
  | "library"
  | "review";
export type PublicScene = {
  label: string;
  title: string;
  lines: readonly string[];
  kind: PreviewKind;
};
export type PublicTool = {
  id: string;
  name: string;
  description: string;
  category: "Créer" | "Diffuser" | "Automatiser" | "Organiser";
  destination: string;
  agent: string;
  portrait: string;
  benefits: readonly [string, string, string];
  scenes: readonly [PublicScene, PublicScene, PublicScene];
  featured?: boolean;
};

const portraits = {
  Dov: "/agents/dov-ber-transparent.png",
  David: "/agents/david-transparent.png",
  Mendy: "/agents/mendy-transparent.png",
  Israël: "/agents/israel-transparent.png",
  Zalman: "/agents/zalman-transparent.png",
  Tsemah: "/agents/tsemah-transparent.png",
  Levik: "/agents/levik-transparent.png",
  Shmouel: "/agents/shmouel-transparent.png",
} as const;

function tool(
  id: string,
  name: string,
  description: string,
  category: PublicTool["category"],
  destination: string,
  agent: keyof typeof portraits,
  kind: PreviewKind,
  result: string,
  lines: readonly string[],
  benefits: PublicTool["benefits"],
  featured = false,
): PublicTool {
  return {
    id,
    name,
    description,
    category,
    destination,
    agent,
    portrait: portraits[agent],
    benefits,
    featured,
    scenes: [
      {
        label: "Votre besoin",
        title: name,
        kind: "message",
        lines: [description, "Communauté de démonstration"],
      },
      { label: "Votre aperçu", title: result, kind, lines },
      {
        label: "À votre rythme",
        title: result,
        kind,
        lines: [...lines, benefits[2]],
      },
    ],
  };
}

export const PUBLIC_TOOLS: readonly PublicTool[] = [
  tool(
    "publish",
    "Publier partout",
    "Une communication, plusieurs réseaux.",
    "Diffuser",
    "/dashboard/social-networks",
    "Dov",
    "channels",
    "Repas communautaire de Chabbat",
    ["Facebook", "Instagram", "WhatsApp"],
    [
      "Un espace de publication",
      "Des contenus adaptés",
      "Vous gardez la validation",
    ],
    true,
  ),
  tool(
    "newsletter",
    "Newsletter papier Chabbat",
    "Votre semaine, dans un journal imprimable.",
    "Créer",
    "/dashboard/newsletter",
    "Tsemah",
    "newsletter",
    "Le journal de votre communauté",
    [
      "À la une · Repas de Chabbat",
      "La vie communautaire",
      "Les prochains rendez-vous",
    ],
    [
      "Contenus réunis",
      "Préparation assistée par IA",
      "Un résultat imprimable",
    ],
    true,
  ),
  tool(
    "posters",
    "Affiches & visuels",
    "Donnez une image à vos événements.",
    "Créer",
    "/dashboard/templates",
    "Zalman",
    "poster",
    "Un Chabbat, ensemble",
    [
      "Repas communautaire",
      "Vendredi · 19 h 30",
      "Communauté de démonstration",
    ],
    [
      "Modèles de création",
      "Visuels personnalisables",
      "Vous choisissez le résultat",
    ],
    true,
  ),
  tool(
    "assistant",
    "Agents IA",
    "Le bon accompagnement pour votre communication.",
    "Créer",
    "/dashboard/assistant",
    "David",
    "message",
    "Préparons votre prochain événement",
    ["Votre besoin", "Une proposition de contenu", "Votre relecture"],
    ["Dialogue naturel", "Agents spécialisés", "Vous gardez la main"],
  ),
  tool(
    "torah",
    "Cours de Torah IA",
    "Préparez vos supports de cours.",
    "Créer",
    "/dashboard/torah",
    "Shmouel",
    "newsletter",
    "Votre prochain cours",
    ["Un thème", "Un plan de séance", "Un support à relire"],
    [
      "Préparation accompagnée",
      "Supports structurés",
      "Relecture avant utilisation",
    ],
  ),
  tool(
    "library",
    "Bibliothèque partagée",
    "Retrouvez des ressources communautaires.",
    "Créer",
    "/dashboard/community-library",
    "Shmouel",
    "library",
    "Des ressources à découvrir",
    [
      "Supports de cours",
      "Ressources communautaires",
      "Idées pour vos activités",
    ],
    [
      "Ressources réunies",
      "Découverte simplifiée",
      "Inspirez vos prochaines activités",
    ],
  ),
  tool(
    "creations",
    "Mes créations",
    "Retrouvez vos visuels au même endroit.",
    "Créer",
    "/dashboard/media-library",
    "Zalman",
    "library",
    "Votre collection de visuels",
    [
      "Affiche · Repas de Chabbat",
      "Visuel · Prochain cours",
      "Invitation · Vie communautaire",
    ],
    ["Créations réunies", "Visuels accessibles", "Réutilisez vos supports"],
  ),
  tool(
    "instagram",
    "Instagram",
    "Préparez vos publications Instagram.",
    "Diffuser",
    "/dashboard/instagram",
    "Dov",
    "channels",
    "Un Chabbat, ensemble sur Instagram",
    ["Instagram", "Votre visuel", "Votre légende"],
    ["Préparation de contenu", "Canal dédié", "Validez avant diffusion"],
  ),
  tool(
    "facebook",
    "Facebook",
    "Partagez la vie de votre communauté.",
    "Diffuser",
    "/dashboard/facebook",
    "Dov",
    "channels",
    "Votre événement sur Facebook",
    ["Facebook", "Repas communautaire", "Invitation à partager"],
    ["Contenus communautaires", "Canal dédié", "Validez votre publication"],
  ),
  tool(
    "whatsapp",
    "WhatsApp",
    "Gardez le lien avec votre communauté.",
    "Diffuser",
    "/dashboard/whatsapp",
    "Israël",
    "message",
    "Votre invitation WhatsApp",
    [
      "Nous nous retrouvons pour Chabbat.",
      "Vendredi · 19 h 30",
      "Au plaisir de partager ce moment.",
    ],
    ["Messages préparés", "Communication directe", "Votre canal à connecter"],
  ),
  tool(
    "email",
    "Email",
    "Vos échanges, réunis dans la plateforme.",
    "Diffuser",
    "/dashboard/email",
    "Levik",
    "message",
    "Invitation au repas communautaire",
    [
      "Objet · Un Chabbat, ensemble",
      "Un message à relire",
      "Une réponse à préparer",
    ],
    [
      "Échanges centralisés",
      "Aide à la rédaction",
      "Vous validez vos messages",
    ],
  ),
  tool(
    "targeted",
    "Communication ciblée",
    "Adressez le bon message au bon public.",
    "Diffuser",
    "/dashboard/communication-ciblee",
    "Israël",
    "contacts",
    "Une invitation adaptée",
    [
      "Groupe · Participants au repas",
      "Message · Invitation de Chabbat",
      "Votre sélection",
    ],
    [
      "Publics sélectionnés",
      "Messages adaptés",
      "Vous choisissez les destinataires",
    ],
  ),
  tool(
    "reviews",
    "Avis Google",
    "Suivez les retours sur votre communauté.",
    "Diffuser",
    "/dashboard/google-reviews",
    "Levik",
    "review",
    "Un retour, une réponse attentionnée",
    [
      "Avis fictif · Un bel accueil",
      "Proposition de réponse",
      "Merci pour votre visite.",
    ],
    ["Avis réunis", "Réponses accompagnées", "Votre réponse à valider"],
  ),
  tool(
    "automations",
    "Automatisations",
    "Organisez votre communication récurrente.",
    "Automatiser",
    "/dashboard/automations",
    "David",
    "schedule",
    "Votre rythme de communication",
    [
      "Choisissez un scénario",
      "Définissez votre rythme",
      "Suivez votre programmation",
    ],
    [
      "Scénarios réunis",
      "Rythme personnalisable",
      "Choisissez le niveau de validation",
    ],
  ),
  tool(
    "shabbat",
    "Horaires de Chabbat",
    "Préparez vos rendez-vous hebdomadaires.",
    "Automatiser",
    "/dashboard/shabbat-times-auto",
    "David",
    "schedule",
    "Votre rendez-vous du vendredi",
    [
      "Votre ville",
      "Votre modèle de message",
      "Votre programmation hebdomadaire",
    ],
    [
      "Ville personnalisable",
      "Message préparé",
      "Horaires à vérifier avant diffusion",
    ],
  ),
  tool(
    "daily-study",
    "Études quotidiennes",
    "Partagez Hayom Yom et Sefer Hamitsvot.",
    "Automatiser",
    "/dashboard/hayom-yom-sefer-hamitsvot",
    "Shmouel",
    "schedule",
    "Un rendez-vous d'étude quotidien",
    ["Hayom Yom", "Sefer Hamitsvot", "Votre diffusion Facebook"],
    ["Études réunies", "Rendez-vous régulier", "Programmation personnalisable"],
  ),
  tool(
    "birthdays",
    "Anniversaires juifs",
    "Préparez vos messages de Mazal Tov.",
    "Automatiser",
    "/dashboard/jewish-birthdays",
    "David",
    "message",
    "Mazal Tov, Léa !",
    [
      "Un contact fictif",
      "Un message personnalisé",
      "Une attention communautaire",
    ],
    [
      "Contacts pris en compte",
      "Message personnalisé",
      "Votre envoi à valider",
    ],
  ),
  tool(
    "reminders",
    "Rappels d'événements",
    "Gardez vos rendez-vous dans les esprits.",
    "Automatiser",
    "/dashboard/event-reminders-auto",
    "David",
    "schedule",
    "Repas de Chabbat · Les rappels",
    [
      "J−10 · Première invitation",
      "J−5 · Le rendez-vous approche",
      "Votre campagne de rappels",
    ],
    [
      "Rappels anticipés",
      "Campagnes personnalisables",
      "Vous choisissez votre rythme",
    ],
  ),
  tool(
    "recap",
    "Récap automatique",
    "Prolongez vos événements en communication.",
    "Automatiser",
    "/dashboard/recap-auto",
    "David",
    "newsletter",
    "Retour sur notre repas communautaire",
    [
      "Votre événement",
      "Les moments à partager",
      "Une proposition de récapitulatif",
    ],
    ["Événements valorisés", "Récap préparé", "Vous relisez le résultat"],
  ),
  tool(
    "weekly-images",
    "Cette semaine en images",
    "Rassemblez les moments de votre semaine.",
    "Automatiser",
    "/dashboard/weekly-images-auto",
    "Zalman",
    "library",
    "Une semaine de vie communautaire",
    [
      "Le repas communautaire",
      "Le cours de la semaine",
      "Les moments partagés",
    ],
    ["Images réunies", "Rythme configurable", "Votre contenu à valider"],
  ),
  tool(
    "holidays",
    "Fêtes juives et hassidiques",
    "Préparez la communication de vos fêtes.",
    "Automatiser",
    "/dashboard/jewish-holidays-auto",
    "David",
    "calendar",
    "Votre prochain rendez-vous communautaire",
    ["Une fête à venir", "Un visuel à choisir", "Votre campagne à préparer"],
    [
      "Calendrier communautaire",
      "Supports de communication",
      "Vous choisissez votre programmation",
    ],
  ),
  tool(
    "events",
    "Agenda communautaire",
    "Vos rendez-vous, bien organisés.",
    "Organiser",
    "/dashboard/events",
    "David",
    "calendar",
    "Les prochains rendez-vous",
    [
      "Vendredi · Repas de Chabbat",
      "Dimanche · Cours communautaire",
      "Mercredi · Rencontre",
    ],
    [
      "Événements réunis",
      "Planning accessible",
      "Préparez votre communication",
    ],
  ),
  tool(
    "contacts",
    "CRM communautaire",
    "Retrouvez les membres de votre communauté.",
    "Organiser",
    "/dashboard/contacts",
    "Israël",
    "contacts",
    "Votre communauté, mieux organisée",
    [
      "Léa · Contact fictif",
      "David · Contact fictif",
      "Groupe · Participants aux événements",
    ],
    [
      "Contacts centralisés",
      "Groupes organisés",
      "Une communication mieux ciblée",
    ],
  ),
  tool(
    "calendar",
    "Calendrier hébraïque",
    "Retrouvez vos dates communautaires.",
    "Organiser",
    "/dashboard/hebrew-calendar",
    "David",
    "calendar",
    "Les dates de votre communauté",
    ["Votre ville", "Chabbat et fêtes", "Les prochains rendez-vous"],
    ["Dates réunies", "Repères communautaires", "Horaires selon votre ville"],
  ),
  tool(
    "daily-assistant",
    "Assistant du quotidien",
    "Une aide pour vos besoins de chaque jour.",
    "Organiser",
    "/dashboard/daily-assistant",
    "David",
    "message",
    "Votre demande du jour",
    [
      "Décrivez votre besoin",
      "Explorez une proposition",
      "Adaptez-la à votre communauté",
    ],
    ["Demandes simples", "Aide au quotidien", "Vous choisissez la suite"],
  ),
];

export const PUBLIC_SERVICES = [
  {
    id: "website",
    name: "Création de site web",
    description: "Un site professionnel pour votre communauté.",
    destination: "/dashboard/website",
  },
  {
    id: "seo",
    name: "Référencement Google et IA",
    description: "Découvrez notre accompagnement en visibilité.",
    destination: "/dashboard/referencement",
  },
  {
    id: "shop",
    name: "Boutique communautaire",
    description: "Découvrez les supports et produits proposés.",
    destination: "/dashboard/boutique",
  },
  {
    id: "travel",
    name: "Assistance indemnisations",
    description: "Découvrez ce service d'accompagnement.",
    destination: "/dashboard/assistance-indemnisation-aerienne",
  },
] as const;

export const UPCOMING_TOOLS = ["Clips vidéo", "Campagnes de dons"] as const;

export function getPublicToolDestination(
  value: string | null | undefined,
): string | null {
  return value &&
    [...PUBLIC_TOOLS, ...PUBLIC_SERVICES].some(
      (item) => item.destination === value,
    )
    ? value
    : null;
}

export function getToolOnboardingPath(
  value: string | null | undefined,
): string {
  const destination = getPublicToolDestination(value);
  return destination
    ? `/onboarding?callbackUrl=${encodeURIComponent(destination)}`
    : "/onboarding";
}
