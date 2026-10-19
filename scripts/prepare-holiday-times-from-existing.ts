import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { buildTemplateTaxonomy, TEMPLATE_USAGE_TAGS, type HolidayTheme } from "../src/lib/templates/taxonomy";

config({ path: ".env.local" });
config({ path: ".env" });

const COMMIT = process.argv.includes("--commit");
const IMPORT_TAG = "import:holiday-times-reused-backgrounds-2026-10";
const LEGACY_TAG = "legacy";
const SOURCE_IDS = [
  "template_shabbat_times_36f0b642ead8222fa0a22e3b",
  "template_shabbat_times_8c4fda2bda05634ae40abb4f",
  "template_shabbat_times_8fcf3f08eed755a0b84ff751",
] as const;
const DEFINITIONS: ReadonlyArray<{ id: string; name: string; theme: HolidayTheme; sourceId: (typeof SOURCE_IDS)[number] }> = [
  { id: "template_holiday_manual_generic_2026", name: "Fêtes juives — Élégance", theme: "tichri", sourceId: SOURCE_IDS[0] },
  { id: "template_holiday_manual_rosh_hashanah_2026", name: "Roch Hachana — Or", theme: "rosh-hashanah", sourceId: SOURCE_IDS[2] },
  { id: "template_holiday_manual_sukkot_2026", name: "Souccot — Lumière", theme: "sukkot", sourceId: SOURCE_IDS[1] },
  { id: "template_holiday_manual_hanukkah_2026", name: "Hanoucca — Bleu nuit", theme: "hanukkah", sourceId: SOURCE_IDS[2] },
  { id: "template_holiday_manual_purim_2026", name: "Pourim — Rose poudré", theme: "purim", sourceId: SOURCE_IDS[1] },
  { id: "template_holiday_manual_passover_2026", name: "Pessa’h — Ivoire", theme: "passover", sourceId: SOURCE_IDS[0] },
] as const;

function requireEnvironment(name: "NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY") {
  const value = process.env[name] ?? (name === "NEXT_PUBLIC_SUPABASE_URL" ? process.env.SUPABASE_URL : undefined);
  if (!value) throw new Error(`Variable ${name} manquante.`);
  return value;
}

async function main() {
  const supabase = createClient(requireEnvironment("NEXT_PUBLIC_SUPABASE_URL"), requireEnvironment("SUPABASE_SERVICE_ROLE_KEY"), { auth: { autoRefreshToken: false, persistSession: false } });
  const [{ data: oldRows, error: oldError }, { data: sources, error: sourceError }] = await Promise.all([
    supabase.from("Template").select("id,name,tags").eq("category", "HOLIDAY").contains("tags", [TEMPLATE_USAGE_TAGS.holidayTimes]),
    supabase.from("Template").select("id,originalUrl,thumbnailUrl,previewUrl").in("id", [...SOURCE_IDS]).eq("isActive", true),
  ]);
  if (oldError) throw oldError;
  if (sourceError) throw sourceError;
  const sourceById = new Map((sources ?? []).map((source) => [source.id, source]));
  if (sourceById.size !== SOURCE_IDS.length) throw new Error(`Fonds Chabbat incomplets (${sourceById.size}/${SOURCE_IDS.length}).`);

  const legacyRows = (oldRows ?? []).filter((row) => !row.tags?.includes(IMPORT_TAG) && !row.tags?.includes(LEGACY_TAG));
  console.log(`Préflight : ${legacyRows.length} ancien(s) modèle(s) à taguer legacy, ${DEFINITIONS.length} modèles manuels à préparer.`);
  if (!COMMIT) { console.log("Simulation terminée sans modification. Ajoutez --commit pour appliquer."); return; }

  for (const row of legacyRows) {
    const { error } = await supabase.from("Template").update({ tags: [...new Set([...(row.tags ?? []), LEGACY_TAG])], updatedAt: new Date().toISOString() }).eq("id", row.id);
    if (error) throw new Error(`Tag legacy ${row.name}: ${error.message}`);
  }

  const now = new Date().toISOString();
  const payload = DEFINITIONS.map((definition) => {
    const source = sourceById.get(definition.sourceId)!;
    const taxonomy = buildTemplateTaxonomy({ category: "HOLIDAY", usage: TEMPLATE_USAGE_TAGS.holidayTimes, holidayTheme: definition.theme, tags: [IMPORT_TAG, "source:shabbat-background", "crop:right-clean"] });
    return {
      id: definition.id,
      communityId: null,
      name: definition.name,
      description: "Fond décoratif existant réutilisé ; tous les textes sont superposés avec les polices du projet.",
      category: "HOLIDAY" as const,
      subCategory: taxonomy.subCategory,
      channelType: null,
      originalUrl: source.originalUrl,
      thumbnailUrl: source.thumbnailUrl,
      previewUrl: source.previewUrl,
      supportsAi: true,
      canvaUrl: null,
      design: [],
      layoutStatus: "READY" as const,
      layoutConfidence: 100,
      layoutAnalyzedAt: now,
      layoutAnalysisVersion: 1,
      isGlobal: true,
      isPremium: false,
      isActive: true,
      tags: taxonomy.tags,
      languages: ["fr", "he"],
      usageCount: 0,
      updatedAt: now,
    };
  });
  const { error: upsertError } = await supabase.from("Template").upsert(payload, { onConflict: "id" });
  if (upsertError) throw upsertError;

  const { data: verified, error: verifyError } = await supabase.from("Template").select("id,tags,isActive,category,languages").in("id", DEFINITIONS.map((definition) => definition.id));
  if (verifyError) throw verifyError;
  if (verified?.length !== DEFINITIONS.length || verified.some((row) => row.category !== "HOLIDAY" || !row.isActive || !row.tags?.includes(IMPORT_TAG) || row.tags?.includes(LEGACY_TAG) || row.languages?.length !== 2 || !row.languages.includes("fr") || !row.languages.includes("he"))) throw new Error("Vérification des modèles manuels échouée.");
  const { count: legacyCount, error: legacyError } = await supabase.from("Template").select("id", { count: "exact", head: true }).eq("category", "HOLIDAY").contains("tags", [TEMPLATE_USAGE_TAGS.holidayTimes, LEGACY_TAG]);
  if (legacyError) throw legacyError;
  console.log(`Vérification réussie : ${verified.length} modèles manuels actifs ; ${legacyCount ?? 0} modèles historiques tagués legacy.`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
