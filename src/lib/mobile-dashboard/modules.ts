export const MOBILE_HOME_DEFAULT_MODULES = ["publish", "newsletter-paper", "contacts", "visuals"] as const;
export const MOBILE_HOME_MAX_MODULES = 8;

export type MobileHomeModuleKey =
  | "publish" | "automations" | "newsletter-paper" | "torah" | "contacts" | "visuals"
  | "targeted" | "email" | "reviews" | "whatsapp" | "website" | "seo" | "shop" | "assistance";

export const MOBILE_HOME_MODULES: ReadonlyArray<{ key: MobileHomeModuleKey; title: string; href: string }> = [
  { key: "publish", title: "Publier partout en un clic", href: "/dashboard/social-networks" },
  { key: "automations", title: "Automatiser", href: "/dashboard/automations" },
  { key: "newsletter-paper", title: "Le Newsletter", href: "/dashboard/newsletter" },
  { key: "torah", title: "Cours de Torah", href: "/dashboard/torah" },
  { key: "contacts", title: "Contacts", href: "/dashboard/contacts" },
  { key: "visuals", title: "Affiches & Visuels", href: "/dashboard/templates" },
  { key: "targeted", title: "Communication ciblée", href: "/dashboard/communication-ciblee" },
  { key: "email", title: "Email", href: "/dashboard/email" },
  { key: "reviews", title: "Avis Google", href: "/dashboard/google-reviews" },
  { key: "whatsapp", title: "WhatsApp", href: "/dashboard/whatsapp" },
  { key: "website", title: "Création de site web", href: "/dashboard/website" },
  { key: "seo", title: "Référencement IA", href: "/dashboard/referencement" },
  { key: "shop", title: "Boutique & articles", href: "/dashboard/boutique" },
  { key: "assistance", title: "Assistance indemnisation", href: "/dashboard/assistance-indemnisation-aerienne" },
];

const allowedModuleKeys = new Set<string>(MOBILE_HOME_MODULES.map((module) => module.key));

export function normalizeMobileHomeModules(value: unknown): MobileHomeModuleKey[] {
  if (!Array.isArray(value)) return [...MOBILE_HOME_DEFAULT_MODULES];
  const unique = value.filter((key): key is MobileHomeModuleKey => typeof key === "string" && allowedModuleKeys.has(key));
  return Array.from(new Set(unique)).slice(0, MOBILE_HOME_MAX_MODULES);
}
