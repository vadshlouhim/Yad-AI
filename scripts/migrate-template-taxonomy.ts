import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  buildTemplateTaxonomy,
  holidayThemeLabel,
  inferHolidayTheme,
  inferShabbatTimesVariant,
  normalizeTaxonomyText,
  TEMPLATE_USAGE_TAGS,
  type HolidayTheme,
} from "../src/lib/templates/taxonomy";

config({ path: ".env.local" });
config({ path: ".env" });

const COMMIT = process.argv.includes("--commit");
const RESTORE_PATH = process.argv.find((argument) => argument.startsWith("--restore="))?.slice("--restore=".length);
const ARCHIVED_TEMPLATE_TAG_PREFIX = "archive:";

type TemplateRow = {
  id: string;
  name: string;
  category: string;
  subCategory: string | null;
  tags: string[] | null;
  updatedAt: string;
};

function requireEnvironment(name: "NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY") {
  const value = process.env[name];
  if (!value) throw new Error(`Variable ${name} manquante.`);
  return value;
}

function holidayUsage(template: TemplateRow) {
  const tags = template.tags ?? [];
  if (tags.includes(TEMPLATE_USAGE_TAGS.holidayTimes)) return TEMPLATE_USAGE_TAGS.holidayTimes;
  const pathText = normalizeTaxonomyText(template.subCategory);
  return /caledrier tichri|calendrier tichri|horaires des fetes/.test(pathText)
    ? TEMPLATE_USAGE_TAGS.holidayTimes
    : TEMPLATE_USAGE_TAGS.holidayPoster;
}

function holidayDetail(template: TemplateRow, theme: HolidayTheme | null) {
  const parts = (template.subCategory ?? "").split(/\s+[›>]\s+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const candidate = parts.at(-1) ?? null;
  if (!candidate || /caledrier|calendrier|horaires des fetes/i.test(candidate)) return null;
  const normalizedCandidate = normalizeTaxonomyText(candidate);
  const normalizedTheme = normalizeTaxonomyText(holidayThemeLabel(theme));
  if (normalizedCandidate === normalizedTheme) return null;
  if (["hochana raba", "simhat torah", "hai elloul", "slihot", "chavouot v"].includes(normalizedCandidate)) return null;
  if (["tichri", "elloul"].includes(normalizedCandidate)) return null;
  return candidate;
}

function migrateTemplate(template: TemplateRow) {
  if (template.category === "SHABBAT") {
    const isTimes = /horaire/.test(normalizeTaxonomyText(template.subCategory)) || (template.tags ?? []).includes(TEMPLATE_USAGE_TAGS.shabbatTimes);
    return buildTemplateTaxonomy({
      category: template.category,
      usage: isTimes ? TEMPLATE_USAGE_TAGS.shabbatTimes : TEMPLATE_USAGE_TAGS.shabbatCommunity,
      shabbatVariant: inferShabbatTimesVariant(template),
      tags: template.tags,
    });
  }

  const theme = inferHolidayTheme(template);
  return buildTemplateTaxonomy({
    category: template.category,
    usage: holidayUsage(template),
    holidayTheme: theme,
    detail: holidayDetail(template, theme),
    tags: template.tags,
  });
}

function arraysEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

async function main() {
  const supabase = createClient(requireEnvironment("NEXT_PUBLIC_SUPABASE_URL"), requireEnvironment("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  if (RESTORE_PATH) {
    const backup = JSON.parse(await readFile(RESTORE_PATH, "utf8")) as TemplateRow[];
    for (const template of backup) {
      const { error: restoreError } = await supabase.from("Template").update({ subCategory: template.subCategory, tags: template.tags ?? [] }).eq("id", template.id);
      if (restoreError) throw new Error(`${template.id} (${template.name}) : ${restoreError.message}`);
    }
    console.log(`${backup.length} affiches restaurées depuis ${RESTORE_PATH}.`);
    return;
  }
  const { data, error } = await supabase
    .from("Template")
    .select("id,name,category,subCategory,tags,updatedAt")
    .in("category", ["SHABBAT", "HOLIDAY"])
    .order("category")
    .order("name");
  if (error) throw error;

  const allTemplates = (data ?? []) as TemplateRow[];
  const archivedTemplates = allTemplates.filter((template) =>
    (template.tags ?? []).some((tag) => tag.startsWith(ARCHIVED_TEMPLATE_TAG_PREFIX)),
  );
  const templates = allTemplates.filter((template) => !archivedTemplates.includes(template));
  const changes = templates.flatMap((template) => {
    const next = migrateTemplate(template);
    const currentTags = template.tags ?? [];
    return template.subCategory === next.subCategory && arraysEqual(currentTags, next.tags)
      ? []
      : [{ template, next }];
  });

  const summary = {
    mode: COMMIT ? "commit" : "dry-run",
    scanned: templates.length,
    archivedSkipped: archivedTemplates.length,
    changed: changes.length,
    shabbatTimes: templates.filter((template) => migrateTemplate(template).tags.includes(TEMPLATE_USAGE_TAGS.shabbatTimes)).length,
    shabbatCommunity: templates.filter((template) => migrateTemplate(template).tags.includes(TEMPLATE_USAGE_TAGS.shabbatCommunity)).length,
    holidayTimes: templates.filter((template) => migrateTemplate(template).tags.includes(TEMPLATE_USAGE_TAGS.holidayTimes)).length,
    holidayPosters: templates.filter((template) => migrateTemplate(template).tags.includes(TEMPLATE_USAGE_TAGS.holidayPoster)).length,
  };

  console.log(JSON.stringify(summary, null, 2));
  console.table(changes.map(({ template, next }) => ({ id: template.id, name: template.name, before: template.subCategory, after: next.subCategory })));
  if (!COMMIT || changes.length === 0) return;

  const backupPath = path.join(tmpdir(), `easycom-template-taxonomy-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  await writeFile(backupPath, JSON.stringify(templates, null, 2), "utf8");
  console.log(`Sauvegarde créée : ${backupPath}`);

  for (const { template, next } of changes) {
    const { error: updateError } = await supabase
      .from("Template")
      .update({ subCategory: next.subCategory, tags: next.tags })
      .eq("id", template.id);
    if (updateError) throw new Error(`${template.id} (${template.name}) : ${updateError.message}`);
  }
  console.log(`${changes.length} affiches migrées.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
