export const NEWSLETTER_LABEL_KEYS = [
  "ravWord",
  "parasha",
  "community",
  "parness",
  "kiddush",
  "seferHamitsvot",
  "agenda",
  "birthdays",
  "support",
  "photos",
  "posters",
  "partners",
  "specificEvent",
] as const;

export type NewsletterLabelKey = typeof NEWSLETTER_LABEL_KEYS[number];
export type NewsletterLabels = Record<NewsletterLabelKey, string>;

export const DEFAULT_NEWSLETTER_LABELS: NewsletterLabels = {
  ravWord: "Mot du Rav",
  parasha: "Résumé de la Paracha",
  community: "Dans notre communauté",
  parness: "Parness Hayom",
  kiddush: "Kidouch offert par",
  seferHamitsvot: "Sefer Hamitsvot",
  agenda: "À l’agenda",
  birthdays: "Les anniversaires de la semaine",
  support: "Nous soutenir",
  photos: "La semaine en images",
  posters: "Affiches & événements à venir…",
  partners: "Nos partenaires",
  specificEvent: "Événement spécifique",
};

export const NEWSLETTER_LABEL_EDITOR: ReadonlyArray<{ key: NewsletterLabelKey; description: string }> = [
  { key: "ravWord", description: "Mot du Rav" },
  { key: "parasha", description: "Paracha" },
  { key: "community", description: "Dédicaces communautaires" },
  { key: "parness", description: "Parness Hayom" },
  { key: "kiddush", description: "Kidouch" },
  { key: "seferHamitsvot", description: "Sefer Hamitsvot" },
  { key: "agenda", description: "Agenda" },
  { key: "birthdays", description: "Anniversaires" },
  { key: "specificEvent", description: "Événement spécifique" },
  { key: "support", description: "Soutien / dons" },
  { key: "photos", description: "Photos" },
  { key: "posters", description: "Affiches" },
  { key: "partners", description: "Partenaires" },
];

export function parseNewsletterLabels(value: unknown): Partial<NewsletterLabels> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  return Object.fromEntries(NEWSLETTER_LABEL_KEYS.flatMap((key) => {
    const label = typeof input[key] === "string" ? input[key].trim().slice(0, 80) : "";
    return label ? [[key, label]] : [];
  })) as Partial<NewsletterLabels>;
}

export function resolveNewsletterLabels(
  communityDefaults?: Partial<NewsletterLabels> | null,
  draftOverrides?: Partial<NewsletterLabels> | null,
): NewsletterLabels {
  return {
    ...DEFAULT_NEWSLETTER_LABELS,
    ...parseNewsletterLabels(communityDefaults),
    ...parseNewsletterLabels(draftOverrides),
  };
}
