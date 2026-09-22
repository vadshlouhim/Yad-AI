export const TEMPLATE_USAGE_TAGS = {
  shabbatTimes: "usage:shabbat-times",
  holidayTimes: "usage:holiday-times",
  holidayPoster: "usage:holiday-poster",
  shabbatCommunity: "usage:shabbat-community",
} as const;

export type TemplateUsage = (typeof TEMPLATE_USAGE_TAGS)[keyof typeof TEMPLATE_USAGE_TAGS];
export type ShabbatTimesVariant = "simple" | "with-offices";

export const HOLIDAY_THEMES = [
  { value: "tichri", label: "Mois de Tichri" },
  { value: "selihot", label: "Sli’hot" },
  { value: "18-elul", label: "18 Elloul" },
  { value: "rosh-hashanah", label: "Roch Hachana" },
  { value: "yom-kippur", label: "Yom Kippour" },
  { value: "sukkot", label: "Souccot" },
  { value: "hoshana-rabba", label: "Hochana Rabba" },
  { value: "shemini-atzeret", label: "Chemini Atseret" },
  { value: "simchat-torah", label: "Sim’hat Torah" },
  { value: "19-kislev", label: "19 Kislev" },
  { value: "hanukkah", label: "Hanouka" },
  { value: "didane-notsah", label: "Didan Notsah" },
  { value: "10-shevat", label: "10 Chevat" },
  { value: "tu-bishvat", label: "Tou Bichvat" },
  { value: "purim", label: "Pourim" },
  { value: "11-nissan", label: "11 Nissan" },
  { value: "passover", label: "Pessa’h" },
  { value: "lag-baomer", label: "Lag BaOmer" },
  { value: "shavuot", label: "Chavouot" },
  { value: "3-tammuz", label: "3 Tamouz" },
  { value: "tisha-beav", label: "Ticha BeAv" },
] as const;

export type HolidayTheme = (typeof HOLIDAY_THEMES)[number]["value"];

const CONTROLLED_TAG_PREFIXES = ["usage:", "holiday:", "schedule:"];

export function normalizeTaxonomyText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

export function holidayThemeLabel(value: string | null | undefined) {
  return HOLIDAY_THEMES.find((theme) => theme.value === value)?.label ?? "Autre / à classer";
}

export function holidayThemeFromTag(tags: string[] | null | undefined): HolidayTheme | null {
  const tag = (tags ?? []).find((item) => item.startsWith("holiday:"));
  const value = tag?.slice("holiday:".length);
  return HOLIDAY_THEMES.some((theme) => theme.value === value) ? (value as HolidayTheme) : null;
}

export function inferTemplateUsage(template: { category?: string | null; subCategory?: string | null; tags?: string[] | null }): TemplateUsage | null {
  const explicit = (template.tags ?? []).find((tag) => Object.values(TEMPLATE_USAGE_TAGS).includes(tag as TemplateUsage));
  if (explicit) return explicit as TemplateUsage;
  const path = normalizeTaxonomyText(template.subCategory);
  if (template.category === "SHABBAT") {
    return path.includes("horaire") ? TEMPLATE_USAGE_TAGS.shabbatTimes : TEMPLATE_USAGE_TAGS.shabbatCommunity;
  }
  if (template.category === "HOLIDAY") {
    return path.includes("horaire") || path.includes("calendrier") || path.includes("caledrier")
      ? TEMPLATE_USAGE_TAGS.holidayTimes
      : TEMPLATE_USAGE_TAGS.holidayPoster;
  }
  return null;
}

export function inferShabbatTimesVariant(template: { subCategory?: string | null; tags?: string[] | null }): ShabbatTimesVariant {
  if ((template.tags ?? []).includes("schedule:with-offices")) return "with-offices";
  const text = normalizeTaxonomyText(template.subCategory);
  return /detail|office|programme/.test(text) ? "with-offices" : "simple";
}

export function inferHolidayTheme(template: { name?: string | null; subCategory?: string | null; tags?: string[] | null }): HolidayTheme | null {
  const explicit = holidayThemeFromTag(template.tags);
  if (explicit) return explicit;
  const text = normalizeTaxonomyText([template.subCategory, template.name, ...(template.tags ?? [])].join(" "));
  const rules: Array<[HolidayTheme, RegExp]> = [
    ["hoshana-rabba", /hochana|hoshana/], ["shemini-atzeret", /chemini|shemini/], ["simchat-torah", /simhat|simchat/],
    ["yom-kippur", /yom kipp|kapparot/], ["rosh-hashanah", /roch hachana|rosh hashana/], ["sukkot", /souccot|soucot|sukkot/],
    ["18-elul", /hai elloul|18 elloul|18 elul/], ["selihot", /slihot|selihot/], ["tichri", /calendrier tichri|caledrier tichri|mois de tichri/],
    ["19-kislev", /19 kiss?lev/], ["hanukkah", /hann?oucc?ah|hanoukka|hanukkah/], ["didane-notsah", /didan notsah/],
    ["10-shevat", /youd chavat|10 chevat/], ["tu-bishvat", /tou bichvat/], ["purim", /pourim|meguila|michte/],
    ["11-nissan", /youd aleph nissan|11 nissan/], ["passover", /pessah|pesah|matsa|seder|machiah/],
    ["lag-baomer", /lag baomer|lag ba omer/], ["shavuot", /chavouot|shavouot/], ["3-tammuz", /guimel tamouz|3 tamouz/],
    ["tisha-beav", /ticha beav|tisha beav/],
  ];
  return rules.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}

export function replaceControlledTags(tags: string[] | null | undefined, controlled: string[]) {
  return [...new Set([...(tags ?? []).filter((tag) => !CONTROLLED_TAG_PREFIXES.some((prefix) => tag.startsWith(prefix))), ...controlled])];
}

export function buildTemplateTaxonomy(input: {
  category: string;
  usage: TemplateUsage;
  holidayTheme?: HolidayTheme | null;
  shabbatVariant?: ShabbatTimesVariant;
  detail?: string | null;
  tags?: string[] | null;
}) {
  const detail = input.detail?.trim() || null;
  if (input.category === "SHABBAT") {
    if (input.usage === TEMPLATE_USAGE_TAGS.shabbatTimes) {
      const variant = input.shabbatVariant ?? "simple";
      return {
        subCategory: `Horaires de Chabbat › ${variant === "with-offices" ? "Avec offices" : "Simples"}`,
        tags: replaceControlledTags(input.tags, [input.usage, `schedule:${variant}`]),
      };
    }
    return { subCategory: detail ? `Chabbat communautaire › ${detail}` : "Chabbat communautaire", tags: replaceControlledTags(input.tags, [TEMPLATE_USAGE_TAGS.shabbatCommunity]) };
  }
  if (input.category === "HOLIDAY") {
    const label = holidayThemeLabel(input.holidayTheme);
    const usage = input.usage === TEMPLATE_USAGE_TAGS.holidayTimes ? TEMPLATE_USAGE_TAGS.holidayTimes : TEMPLATE_USAGE_TAGS.holidayPoster;
    return {
      subCategory: usage === TEMPLATE_USAGE_TAGS.holidayTimes ? `Horaires des fêtes › ${label}` : detail ? `${label} › ${detail}` : label,
      tags: replaceControlledTags(input.tags, [usage, ...(input.holidayTheme ? [`holiday:${input.holidayTheme}`] : [])]),
    };
  }
  return { subCategory: detail, tags: input.tags ?? [] };
}

