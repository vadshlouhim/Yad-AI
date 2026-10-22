import fr from "../../../messages/fr.json";
import he from "../../../messages/he.json";
import en from "../../../messages/en.json";

export type BillingLocale = "fr" | "he" | "en";

const messages = { fr: fr.billing, he: he.billing, en: en.billing } as const;

export function normalizeBillingLocale(value: string | null | undefined): BillingLocale {
  return value === "he" || value === "en" ? value : "fr";
}

export function getBillingCopy(locale: string | null | undefined) {
  return messages[normalizeBillingLocale(locale)];
}
