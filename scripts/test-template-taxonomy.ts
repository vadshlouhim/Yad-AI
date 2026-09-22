import assert from "node:assert/strict";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  buildTemplateTaxonomy,
  inferHolidayTheme,
  TEMPLATE_USAGE_TAGS,
} from "../src/lib/templates/taxonomy";

config({ path: ".env.local" });
config({ path: ".env" });

assert.equal(inferHolidayTheme({ name: "Kapparot", subCategory: null, tags: [] }), "yom-kippur");
assert.equal(inferHolidayTheme({ name: "Grande fête de Souccot", subCategory: null, tags: [] }), "sukkot");
assert.deepEqual(
  buildTemplateTaxonomy({ category: "SHABBAT", usage: TEMPLATE_USAGE_TAGS.shabbatTimes, shabbatVariant: "with-offices", tags: ["public"] }),
  { subCategory: "Horaires de Chabbat › Avec offices", tags: ["public", "usage:shabbat-times", "schedule:with-offices"] },
);
assert.deepEqual(
  buildTemplateTaxonomy({ category: "HOLIDAY", usage: TEMPLATE_USAGE_TAGS.holidayTimes, holidayTheme: "rosh-hashanah", tags: [] }),
  { subCategory: "Horaires des fêtes › Roch Hachana", tags: ["usage:holiday-times", "holiday:rosh-hashanah"] },
);

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Variables Supabase manquantes.");
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.from("Template").select("id,name,category,subCategory,tags,isActive").in("category", ["SHABBAT", "HOLIDAY"]);
  if (error) throw error;

  const templates = data ?? [];
  const hasTag = (tag: string) => templates.filter((template) => (template.tags ?? []).includes(tag));
  const activeWithTag = (tag: string) => hasTag(tag).filter((template) => template.isActive);
  assert.equal(activeWithTag(TEMPLATE_USAGE_TAGS.shabbatTimes).length, 9);
  assert.equal(activeWithTag(TEMPLATE_USAGE_TAGS.shabbatCommunity).length, 9);
  assert.equal(activeWithTag(TEMPLATE_USAGE_TAGS.holidayTimes).length, 14);
  assert.equal(activeWithTag(TEMPLATE_USAGE_TAGS.holidayPoster).length, 120);
  assert.equal(activeWithTag(TEMPLATE_USAGE_TAGS.shabbatTimes).some((template) => template.subCategory === "Chabbat communautaire"), false);
  assert.equal(
    hasTag(TEMPLATE_USAGE_TAGS.holidayTimes).every((template) => template.subCategory?.startsWith("Horaires des fêtes › ")),
    true,
  );
  assert.equal(hasTag("import:holiday-times-2026-09-22").length, 12);
  assert.equal(activeWithTag("import:shabbat-times-2026-09-22").length, 9);
  assert.equal(activeWithTag("import:simhat-2026-09-22").length, 9);
  assert.equal(templates.filter((template) => /PESSAHPROGRAME/i.test(template.name)).every((template) => !(template.tags ?? []).includes(TEMPLATE_USAGE_TAGS.holidayTimes)), true);

  console.log("Taxonomie active validée : 9 horaires Chabbat, 9 communautaires, 14 horaires de fêtes, 120 affiches de fêtes.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
