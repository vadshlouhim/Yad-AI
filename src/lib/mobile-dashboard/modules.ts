export const MOBILE_HOME_DEFAULT_MODULES = [
  "publish",
  "newsletter-paper",
  "shabbat-times",
  "event-reminders",
  "daily-study",
  "birthdays-yahrzeit",
  "visuals",
  "photo-recap",
  "torah",
] as const;
export const MOBILE_HOME_MAX_MODULES = 11;

export type MobileHomeModuleKey =
  | "publish" | "automations" | "newsletter-paper" | "torah" | "contacts" | "visuals"
  | "targeted" | "email-reviews" | "email" | "reviews" | "whatsapp" | "website" | "seo" | "shop" | "assistance"
  | "shabbat-times" | "daily-study" | "birthdays-yahrzeit" | "event-reminders" | "photo-recap";

export const MOBILE_HOME_MODULES: ReadonlyArray<{ key: MobileHomeModuleKey; title: string; href: string }> = [
  { key: "publish", title: "Publier partout en un clic", href: "/dashboard/social-networks" },
  { key: "shabbat-times", title: "Horaires de Chabbat & Fêtes", href: "/dashboard/shabbat-times-auto" },
  { key: "daily-study", title: "Hayom Yom & Sefer Hamitsvot", href: "/dashboard/hayom-yom-sefer-hamitsvot" },
  { key: "birthdays-yahrzeit", title: "Anniversaires & Yahrzeit", href: "/dashboard/jewish-birthdays" },
  { key: "event-reminders", title: "Automatisations", href: "/dashboard/event-reminders-auto" },
  { key: "photo-recap", title: "Récap photos", href: "/dashboard/recap-auto" },
  { key: "newsletter-paper", title: "Newsletter", href: "/dashboard/newsletter" },
  { key: "torah", title: "Cours de Torah", href: "/dashboard/torah" },
  { key: "email-reviews", title: "Email & Avis Google", href: "/dashboard?module=email" },
  { key: "contacts", title: "CRM intelligent", href: "/dashboard/contacts" },
  { key: "visuals", title: "Affiches professionnelles", href: "/dashboard/templates" },
  { key: "targeted", title: "Communication ciblée", href: "/dashboard/communication-ciblee" },
  { key: "email", title: "Email", href: "/dashboard/email" },
  { key: "reviews", title: "Avis Google", href: "/dashboard/google-reviews" },
  { key: "whatsapp", title: "WhatsApp automatisé", href: "/dashboard/whatsapp" },
  { key: "website", title: "Création de site web", href: "/dashboard/website" },
  { key: "seo", title: "Référencement IA", href: "/dashboard/referencement" },
  { key: "shop", title: "Boutique en ligne", href: "https://linktr.ee/Yadshlouhim" },
  { key: "assistance", title: "Assistance indemnisation", href: "/dashboard/assistance-indemnisation-aerienne" },
];

const allowedModuleKeys = new Set<string>(MOBILE_HOME_MODULES.map((module) => module.key));

const LEGACY_DEFAULT_LAYOUTS: ReadonlyArray<ReadonlyArray<string>> = [
  ["publish", "newsletter-paper", "contacts", "visuals"],
  ["publish", "newsletter-paper", "automations", "visuals"],
  ["publish", "newsletter-paper", "automations", "visuals", "torah", "email-reviews"],
  ["publish", "newsletter-paper", "shabbat-times", "visuals", "daily-study", "birthdays-yahrzeit", "event-reminders", "photo-recap", "targeted", "torah", "email-reviews"],
  ["publish", "newsletter-paper", "shabbat-times", "event-reminders", "daily-study", "birthdays-yahrzeit", "visuals", "photo-recap", "torah", "targeted", "email-reviews"],
];

function sameLayout(value: unknown[], expected: ReadonlyArray<string>) {
  return value.length === expected.length && value.every((key, index) => key === expected[index]);
}

export function normalizeMobileHomeModules(value: unknown): MobileHomeModuleKey[] {
  if (!Array.isArray(value)) return [...MOBILE_HOME_DEFAULT_MODULES];
  if (LEGACY_DEFAULT_LAYOUTS.some((layout) => sameLayout(value, layout))) return [...MOBILE_HOME_DEFAULT_MODULES];
  const migrated = value.map((key) => key === "automations" ? "shabbat-times" : key);
  const unique = migrated.filter((key): key is MobileHomeModuleKey => typeof key === "string" && allowedModuleKeys.has(key));
  return Array.from(new Set(unique)).slice(0, MOBILE_HOME_MAX_MODULES);
}
