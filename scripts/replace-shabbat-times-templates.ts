import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { optimizeTemplateImages } from "../src/lib/templates/image-optimization";
import {
  buildTemplateTaxonomy,
  type ShabbatTimesVariant,
  TEMPLATE_USAGE_TAGS,
} from "../src/lib/templates/taxonomy";

config({ path: ".env.local" });
config({ path: ".env" });

const DEFAULT_SOURCE_ROOT =
  "C:/Users/chlom/Desktop/projet EASYCOM-AI/Affiches 22-09-2026/Horaires de Chabbat";
const SOURCE_ROOT =
  process.argv.find((argument) => argument.startsWith("--source="))?.slice("--source=".length) ??
  DEFAULT_SOURCE_ROOT;
const COMMIT = process.argv.includes("--commit");
const BUCKET = "templates";
const STORAGE_DIRECTORY = "global-library/shabbat-times/2026-09-22";
const CANVA_URL =
  "https://www.canva.com/design/DAHV8MPt_pY/QqHudnkcJZo9yse40PSF2w/view?utm_content=DAHV8MPt_pY&utm_campaign=designshare&utm_medium=link&utm_source=publishsharelink&mode=preview";
const THUMBNAIL_LIMIT = 150 * 1024;
const PREVIEW_LIMIT = 500 * 1024;
const EXPECTED_DIMENSIONS = new Set(["1500x2000", "1080x1350"]);
const IMPORT_TAG = "import:shabbat-times-2026-09-22";
const ARCHIVE_TAG = "archive:replaced-shabbat-times-2026-09-22";

const TEMPLATE_DEFINITIONS: ReadonlyArray<{
  name: string;
  variant: ShabbatTimesVariant;
}> = [
  { name: "Horaires de Chabbat et offices – Bleu nuit et or", variant: "with-offices" },
  { name: "Horaires de Chabbat et offices – Bleu", variant: "with-offices" },
  { name: "Horaires de Chabbat – Ki Tissa", variant: "with-offices" },
  { name: "Horaires de Chabbat – Choftim", variant: "simple" },
  { name: "Horaires de Chabbat et offices – Rouge", variant: "with-offices" },
  { name: "Horaires de Chabbat – Floral turquoise", variant: "simple" },
  { name: "Horaires de Chabbat – Élégance noire et or", variant: "simple" },
  { name: "Horaires de Chabbat – Rose poudré", variant: "simple" },
  { name: "Horaires de Chabbat – Bleu nuit et or", variant: "simple" },
] as const;

type PreparedTemplate = {
  fileName: string;
  id: string;
  name: string;
  subCategory: string | null;
  tags: string[];
  original: Buffer;
  thumbnail: Awaited<ReturnType<typeof optimizeTemplateImages>>["thumbnail"];
  preview: Awaited<ReturnType<typeof optimizeTemplateImages>>["preview"];
  originalPath: string;
  thumbnailPath: string;
  previewPath: string;
};

type ExistingTemplate = {
  id: string;
  name: string;
  tags: string[] | null;
};

function requireEnvironment(name: "NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY") {
  const value = process.env[name];
  if (!value) throw new Error(`Variable ${name} manquante.`);
  return value;
}

async function prepareTemplate(sourceRoot: string, index: number): Promise<PreparedTemplate> {
  const definition = TEMPLATE_DEFINITIONS[index];
  const fileName = `${index + 1}.png`;
  const absolutePath = path.join(sourceRoot, fileName);
  const fileStats = await stat(absolutePath);
  if (!fileStats.isFile()) throw new Error(`${fileName} n'est pas un fichier.`);

  const original = await readFile(absolutePath);
  const metadata = await sharp(original).metadata();
  const dimensions = `${metadata.width ?? 0}x${metadata.height ?? 0}`;
  if (!EXPECTED_DIMENSIONS.has(dimensions) || metadata.format !== "png") {
    throw new Error(
      `${fileName}: format inattendu (${metadata.width}x${metadata.height}, ${metadata.format ?? "inconnu"}).`,
    );
  }

  const fingerprint = createHash("sha256").update(original).digest("hex");
  const id = `template_shabbat_times_${fingerprint.slice(0, 24)}`;
  const variants = await optimizeTemplateImages(original);
  if (variants.thumbnail.size > THUMBNAIL_LIMIT) {
    throw new Error(`${fileName}: miniature trop lourde (${variants.thumbnail.size} octets).`);
  }
  if (variants.preview.size > PREVIEW_LIMIT) {
    throw new Error(`${fileName}: aperçu trop lourd (${variants.preview.size} octets).`);
  }

  const taxonomy = buildTemplateTaxonomy({
    category: "SHABBAT",
    usage: TEMPLATE_USAGE_TAGS.shabbatTimes,
    shabbatVariant: definition.variant,
    tags: [IMPORT_TAG],
  });

  return {
    fileName,
    id,
    name: definition.name,
    subCategory: taxonomy.subCategory,
    tags: taxonomy.tags,
    original,
    thumbnail: variants.thumbnail,
    preview: variants.preview,
    originalPath: `${STORAGE_DIRECTORY}/${id}.png`,
    thumbnailPath: `${STORAGE_DIRECTORY}/${id}-thumbnail.webp`,
    previewPath: `${STORAGE_DIRECTORY}/${id}-preview.webp`,
  };
}

async function main() {
  const sourceRoot = path.resolve(SOURCE_ROOT);
  const supabase = createClient(
    requireEnvironment("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnvironment("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const prepared: PreparedTemplate[] = [];
  for (let index = 0; index < TEMPLATE_DEFINITIONS.length; index += 1) {
    const template = await prepareTemplate(sourceRoot, index);
    prepared.push(template);
    console.log(
      `[préparé ${index + 1}/${TEMPLATE_DEFINITIONS.length}] ${template.name} · ${template.subCategory} · original ${Math.round(template.original.byteLength / 1024)} Ko · miniature ${Math.round(template.thumbnail.size / 1024)} Ko · aperçu ${Math.round(template.preview.size / 1024)} Ko`,
    );
  }

  if (new Set(prepared.map((template) => template.id)).size !== TEMPLATE_DEFINITIONS.length) {
    throw new Error("Deux fichiers ont le même contenu.");
  }

  const preparedIds = prepared.map((template) => template.id);
  const [{ data: existingNewRows, error: existingNewError }, { data: scheduleRows, error: scheduleRowsError }] =
    await Promise.all([
      supabase.from("Template").select("id").in("id", preparedIds),
      supabase
        .from("Template")
        .select("id,name,tags")
        .eq("category", "SHABBAT")
        .contains("tags", [TEMPLATE_USAGE_TAGS.shabbatTimes])
        .order("name"),
    ]);
  if (existingNewError) throw existingNewError;
  if (scheduleRowsError) throw scheduleRowsError;

  const existingNewIds = new Set((existingNewRows ?? []).map((row) => row.id));
  const pending = prepared.filter((template) => !existingNewIds.has(template.id));
  const oldRows = ((scheduleRows ?? []) as ExistingTemplate[]).filter(
    (template) => !preparedIds.includes(template.id) && !template.tags?.includes(ARCHIVE_TAG),
  );

  console.log(
    `Préflight : ${existingNewIds.size} nouveau(x) déjà présent(s), ${pending.length} à importer, ${oldRows.length} ancien(s) à archiver.`,
  );
  for (const template of oldRows) console.log(`  - ancien : ${template.name} (${template.id})`);

  if (!COMMIT) {
    console.log("Simulation terminée sans modification. Ajoutez --commit pour effectuer le remplacement.");
    return;
  }

  for (let index = 0; index < pending.length; index += 1) {
    const template = pending[index];
    const uploadedPaths: string[] = [];
    try {
      const uploads = [
        { storagePath: template.originalPath, buffer: template.original, contentType: "image/png" },
        {
          storagePath: template.thumbnailPath,
          buffer: template.thumbnail.buffer,
          contentType: template.thumbnail.contentType,
        },
        {
          storagePath: template.previewPath,
          buffer: template.preview.buffer,
          contentType: template.preview.contentType,
        },
      ];

      for (const upload of uploads) {
        const { error } = await supabase.storage.from(BUCKET).upload(upload.storagePath, upload.buffer, {
          contentType: upload.contentType,
          cacheControl: "31536000",
          upsert: false,
        });
        if (error) throw error;
        uploadedPaths.push(upload.storagePath);
      }

      const publicUrl = (storagePath: string) =>
        supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
      const now = new Date().toISOString();
      const { error: insertError } = await supabase.from("Template").insert({
        id: template.id,
        communityId: null,
        name: template.name,
        description: "Affiche d'horaires de Chabbat personnalisable avec l'IA ou dans Canva.",
        category: "SHABBAT",
        subCategory: template.subCategory,
        channelType: null,
        originalUrl: publicUrl(template.originalPath),
        thumbnailUrl: publicUrl(template.thumbnailPath),
        previewUrl: publicUrl(template.previewPath),
        supportsAi: true,
        canvaUrl: CANVA_URL,
        design: [],
        isGlobal: true,
        isPremium: false,
        isActive: true,
        tags: template.tags,
        usageCount: 0,
        createdAt: now,
        updatedAt: now,
      });
      if (insertError) throw insertError;
      console.log(`[importé ${index + 1}/${pending.length}] ${template.name}`);
    } catch (error) {
      if (uploadedPaths.length > 0) {
        const { error: cleanupError } = await supabase.storage.from(BUCKET).remove(uploadedPaths);
        if (cleanupError) {
          console.error(`Nettoyage incomplet pour ${template.fileName}: ${cleanupError.message}`);
        }
      }
      throw new Error(`${template.fileName}: ${error instanceof Error ? error.message : "erreur inconnue"}`);
    }
  }

  const { data: insertedRows, error: insertedRowsError } = await supabase
    .from("Template")
    .select(
      "id,name,category,subCategory,thumbnailUrl,previewUrl,supportsAi,canvaUrl,isGlobal,isPremium,isActive,tags",
    )
    .in("id", preparedIds);
  if (insertedRowsError) throw insertedRowsError;
  if ((insertedRows ?? []).length !== TEMPLATE_DEFINITIONS.length) {
    throw new Error(
      `Vérification des nouveaux modèles échouée : ${insertedRows?.length ?? 0}/${TEMPLATE_DEFINITIONS.length}.`,
    );
  }

  for (const row of insertedRows ?? []) {
    if (
      row.category !== "SHABBAT" ||
      !row.tags?.includes(TEMPLATE_USAGE_TAGS.shabbatTimes) ||
      !row.tags?.includes(IMPORT_TAG) ||
      !row.supportsAi ||
      row.canvaUrl !== CANVA_URL ||
      !row.isGlobal ||
      row.isPremium ||
      !row.isActive ||
      !row.thumbnailUrl?.endsWith("-thumbnail.webp") ||
      !row.previewUrl?.endsWith("-preview.webp")
    ) {
      throw new Error(`Vérification des métadonnées échouée pour ${row.id}.`);
    }
  }

  const { data: storageFiles, error: storageError } = await supabase.storage
    .from(BUCKET)
    .list(STORAGE_DIRECTORY, { limit: 1000, sortBy: { column: "name", order: "asc" } });
  if (storageError) throw storageError;
  const expectedStorageNames = new Set(
    prepared.flatMap((template) => [
      path.posix.basename(template.originalPath),
      path.posix.basename(template.thumbnailPath),
      path.posix.basename(template.previewPath),
    ]),
  );
  const verifiedStorageCount = (storageFiles ?? []).filter((file) =>
    expectedStorageNames.has(file.name),
  ).length;
  if (verifiedStorageCount !== TEMPLATE_DEFINITIONS.length * 3) {
    throw new Error(
      `Vérification Storage échouée : ${verifiedStorageCount}/${TEMPLATE_DEFINITIONS.length * 3} fichiers.`,
    );
  }

  for (const oldRow of oldRows) {
    const tags = [...new Set([...(oldRow.tags ?? []), ARCHIVE_TAG])];
    const { error: archiveError } = await supabase
      .from("Template")
      .update({ isActive: false, tags, updatedAt: new Date().toISOString() })
      .eq("id", oldRow.id);
    if (archiveError) throw new Error(`Archivage de ${oldRow.name}: ${archiveError.message}`);
    console.log(`[archivé] ${oldRow.name}`);
  }

  const [{ data: finalActiveRows, error: finalActiveError }, { count: activeCommunityCount, error: communityError }] =
    await Promise.all([
      supabase
        .from("Template")
        .select("id")
        .eq("category", "SHABBAT")
        .eq("isActive", true)
        .contains("tags", [TEMPLATE_USAGE_TAGS.shabbatTimes]),
      supabase
        .from("Template")
        .select("id", { count: "exact", head: true })
        .eq("category", "SHABBAT")
        .eq("isActive", true)
        .contains("tags", [TEMPLATE_USAGE_TAGS.shabbatCommunity]),
    ]);
  if (finalActiveError) throw finalActiveError;
  if (communityError) throw communityError;
  const finalIds = new Set((finalActiveRows ?? []).map((row) => row.id));
  if (finalIds.size !== TEMPLATE_DEFINITIONS.length || preparedIds.some((id) => !finalIds.has(id))) {
    throw new Error(`Vérification finale échouée : ${finalIds.size}/9 horaires de Chabbat actifs.`);
  }
  if (activeCommunityCount !== 9) {
    throw new Error(`Protection des affiches communautaires échouée : ${activeCommunityCount ?? 0}/9 actives.`);
  }

  console.log(
    `Remplacement réussi : 9 nouveaux modèles actifs, ${oldRows.length} anciens archivés, 27 nouveaux fichiers et 9 affiches communautaires intactes.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
