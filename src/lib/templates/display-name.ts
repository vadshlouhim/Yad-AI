import { CATEGORY_LABELS } from "@/lib/templates/shared";

type NamedTemplate = { name: string; category: string; subCategory: string | null };

// Imported file names ("YTK4", "CHABBAT COMMUNAUTAIRE (5)") mean nothing to a visitor:
// show the theme they belong to instead, numbered when the file name carries a number.
function isTechnicalName(name: string) {
  return !/[a-zà-ÿ]/.test(name) || /\(\d+\)\s*$/.test(name) || /[A-Za-zÀ-ÿ]\d+$/.test(name.trim());
}

export function posterDisplayName(template: NamedTemplate) {
  if (!isTechnicalName(template.name)) return template.name;
  const theme = (template.subCategory?.split(" › ").map((part) => part.trim()).filter(Boolean) ?? []).join(" – ")
    || CATEGORY_LABELS[template.category]
    || template.name;
  const number = template.name.match(/(\d+)\)?\s*$/)?.[1];
  return number ? `${theme} · modèle ${Number(number)}` : theme;
}
