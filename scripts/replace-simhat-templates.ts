import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { optimizeTemplateImages } from "../src/lib/templates/image-optimization";
import {
  buildTemplateTaxonomy,
  normalizeTaxonomyText,
  type HolidayTheme,
  TEMPLATE_USAGE_TAGS,
} from "../src/lib/templates/taxonomy";

config({ path: ".env.local" });
config({ path: ".env" });

const DEFAULT_SOURCE_ROOT =
  "C:/Users/chlom/Desktop/projet EASYCOM-AI/Affiches 22-09-2026/Tichri/Simhat Torah Hachoeava";
const SOURCE_ROOT =
  process.argv.find((argument) => argument.startsWith("--source="))?.slice("--source=".length) ??
  DEFAULT_SOURCE_ROOT;
const COMMIT = process.argv.includes("--commit");
const BUCKET = "templates";
const STORAGE_DIRECTORY = "global-library/tichri/simhat-torah-hachoeva/2026-09-22";
const CANVA_URL =
  "https://www.canva.com/design/DAHV86hrfZw/uK9vNHVnyDbORhylLsuoaw/view?utm_content=DAHV86hrfZw&utm_campaign=designshare&utm_medium=link&utm_source=publishsharelink&mode=preview";
const THUMBNAIL_LIMIT = 150 * 1024;
const PREVIEW_LIMIT = 500 * 1024;
const EXPECTED_DIMENSIONS = new Set(["1414x2000", "1944x2750"]);
const IMPORT_TAG = "import:simhat-2026-09-22";
const ARCHIVE_TAG = "archive:replaced-simhat-2026-09-22";

const TEMPLATE_DEFINITIONS: ReadonlyArray<{
  fileName: string;
  name: string;
  holidayTheme: HolidayTheme;
  detail?: string;
  extraTags?: string[];
}> = [
  { fileName: "1.png", name: "Sim’hat Torah – Programme bleu et orange", holidayTheme: "simchat-torah" },
  { fileName: "2.png", name: "Sim’hat Torah – Séfarim rose", holidayTheme: "simchat-torah" },
  { fileName: "3.png", name: "Grande soirée des Hakafot – Séfarim", holidayTheme: "simchat-torah" },
  {
    fileName: "4.png",
    name: "Sim’hat Beth Hachoeva – Saxophone et guitare",
    holidayTheme: "sukkot",
    detail: "Sim’hat Beth Hachoeva",
    extraTags: ["theme:simhat-beth-hachoeva"],
  },
  { fileName: "5.png", name: "Sim’hat Torah – Bleu nuit et or", holidayTheme: "simchat-torah" },
  {
    fileName: "6.png",
    name: "Sim’hat Beth Hachoeva – Concert rose",
    holidayTheme: "sukkot",
    detail: "Sim’hat Beth Hachoeva",
    extraTags: ["theme:simhat-beth-hachoeva"],
  },
  {
    fileName: "7.png",
    name: "Sim’hat Beth Hachoeva – Concert bleu",
    holidayTheme: "sukkot",
    detail: "Sim’hat Beth Hachoeva",
    extraTags: ["theme:simhat-beth-hachoeva"],
  },
  {
    fileName: "8.png",
    name: "Sim’hat Beth Hachoeva – Concert orange",
    holidayTheme: "sukkot",
    detail: "Sim’hat Beth Hachoeva",
    extraTags: ["theme:simhat-beth-hachoeva"],
  },
  {
    fileName: "SIMHATTOR1.png",
    name: "Sim’hat Torah – Bleu nuit et or – Grand format",
    holidayTheme: "simchat-torah",
  },
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
  subCategory: string | null;
  tags: string[] | null;
};

function requireEnvironment(name: "NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY") {
  const value = process.env[name];
  if (!value) throw new Error(`Variable ${name} manquante.`);
  return value;
}

function isTargetTemplate(template: ExistingTemplate) {
  const text = normalizeTaxonomyText(
    [template.name, template.subCategory, ...(template.tags ?? [])].join(" "),
  );
  return (
    /simhat torah|simchat torah/.test(text) ||
    /simhat beth hachoeva|simhat beth hashoeva|simhat beit hachoeva/.test(text)
  );
}

async function prepareTemplate(sourceRoot: string, index: number): Promise<PreparedTemplate> {
  const definition = TEMPLATE_DEFINITIONS[index];
  const absolutePath = path.join(sourceRoot, definition.fileName);
  const fileStats = await stat(absolutePath);
  if (!fileStats.isFile()) throw new Error(`${definition.fileName} n'est pas un fichier.`);

  const original = await readFile(absolutePath);
  const metadata = await sharp(original).metadata();
  const dimensions = `${metadata.width ?? 0}x${metadata.height ?? 0}`;
  if (!EXPECTED_DIMENSIONS.has(dimensions) || metadata.format !== "png") {
    throw new Error(
      `${definition.fileName}: format inattendu (${metadata.width}x${metadata.height}, ${metadata.format ?? "inconnu"}).`,
    );
  }

  const fingerprint = createHash("sha256").update(original).digest("hex");
  const id = `template_simhat_${fingerprint.slice(0, 24)}`;
  const variants = await optimizeTemplateImages(original);
  if (variants.thumbnail.size > THUMBNAIL_LIMIT) {
    throw new Error(`${definition.fileName}: miniature trop lourde (${variants.thumbnail.size} octets).`);
  }
  if (variants.preview.size > PREVIEW_LIMIT) {
    throw new Error(`${definition.fileName}: aperçu trop lourd (${variants.preview.size} octets).`);
  }

  const taxonomy = buildTemplateTaxonomy({
    category: "HOLIDAY",
    usage: TEMPLATE_USAGE_TAGS.holidayPoster,
    holidayTheme: definition.holidayTheme,
    detail: definition.detail,
    tags: [IMPORT_TAG, ...(definition.extraTags ?? [])],
  });

  return {
    fileName: definition.fileName,
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
    throw new Error("Deux fichiers source ont exactement le même contenu.");
  }

  const preparedIds = prepared.map((template) => template.id);
  const [{ data: existingNewRows, error: existingNewError }, { data: posterRows, error: posterRowsError }] =
    await Promise.all([
      supabase.from("Template").select("id").in("id", preparedIds),
      supabase
        .from("Template")
        .select("id,name,subCategory,tags")
        .eq("category", "HOLIDAY")
        .eq("isActive", true)
        .contains("tags", [TEMPLATE_USAGE_TAGS.holidayPoster])
        .order("name"),
    ]);
  if (existingNewError) throw existingNewError;
  if (posterRowsError) throw posterRowsError;

  const existingNewIds = new Set((existingNewRows ?? []).map((row) => row.id));
  const pending = prepared.filter((template) => !existingNewIds.has(template.id));
  const oldRows = ((posterRows ?? []) as ExistingTemplate[]).filter(
    (template) =>
      !preparedIds.includes(template.id) &&
      !template.tags?.includes(ARCHIVE_TAG) &&
      isTargetTemplate(template),
  );

  console.log(
    `Préflight : ${existingNewIds.size} nouveau(x) déjà présent(s), ${pending.length} à importer, ${oldRows.length} ancien(s) ciblé(s) à archiver.`,
  );
  for (const template of oldRows) {
    console.log(`  - ancien : ${template.name} · ${template.subCategory ?? "sans sous-catégorie"} (${template.id})`);
  }

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
        description: "Affiche de fête personnalisable avec l'IA ou dans Canva.",
        category: "HOLIDAY",
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
      "id,category,thumbnailUrl,previewUrl,supportsAi,canvaUrl,isGlobal,isPremium,isActive,tags",
    )
    .in("id", preparedIds);
  if (insertedRowsError) throw insertedRowsError;
  if ((insertedRows ?? []).length !== TEMPLATE_DEFINITIONS.length) {
    throw new Error(`Vérification échouée : ${insertedRows?.length ?? 0}/9 nouveaux modèles.`);
  }
  for (const row of insertedRows ?? []) {
    if (
      row.category !== "HOLIDAY" ||
      !row.tags?.includes(TEMPLATE_USAGE_TAGS.holidayPoster) ||
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
  if (verifiedStorageCount !== 27) {
    throw new Error(`Vérification Storage échouée : ${verifiedStorageCount}/27 fichiers.`);
  }

  for (const oldRow of oldRows) {
    const tags = [...new Set([ARCHIVE_TAG, ...(oldRow.tags ?? [])])];
    const { error: archiveError } = await supabase
      .from("Template")
      .update({ isActive: false, tags, updatedAt: new Date().toISOString() })
      .eq("id", oldRow.id)
      .eq("isActive", true);
    if (archiveError) throw new Error(`Archivage de ${oldRow.name}: ${archiveError.message}`);
    console.log(`[archivé] ${oldRow.name}`);
  }

  const { data: finalPosterRows, error: finalPosterError } = await supabase
    .from("Template")
    .select("id,name,subCategory,tags")
    .eq("category", "HOLIDAY")
    .eq("isActive", true)
    .contains("tags", [TEMPLATE_USAGE_TAGS.holidayPoster]);
  if (finalPosterError) throw finalPosterError;
  const finalTargets = ((finalPosterRows ?? []) as ExistingTemplate[]).filter(isTargetTemplate);
  const finalIds = new Set(finalTargets.map((row) => row.id));
  if (finalIds.size !== 9 || preparedIds.some((id) => !finalIds.has(id))) {
    throw new Error(`Vérification finale échouée : ${finalIds.size}/9 affiches Sim’hat actives.`);
  }

  console.log(
    `Remplacement réussi : 9 nouveaux modèles actifs, ${oldRows.length} anciens archivés et 27 nouveaux fichiers vérifiés.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
