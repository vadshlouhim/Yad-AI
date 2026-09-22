import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { optimizeTemplateImages } from "../src/lib/templates/image-optimization";
import {
  buildTemplateTaxonomy,
  type HolidayTheme,
  TEMPLATE_USAGE_TAGS,
} from "../src/lib/templates/taxonomy";

config({ path: ".env.local" });
config({ path: ".env" });

const DEFAULT_SOURCE_ROOT =
  "C:/Users/chlom/Desktop/projet EASYCOM-AI/Affiches 22-09-2026/Horaires de fetes";
const SOURCE_ROOT =
  process.argv.find((argument) => argument.startsWith("--source="))?.slice("--source=".length) ??
  DEFAULT_SOURCE_ROOT;
const COMMIT = process.argv.includes("--commit");
const BUCKET = "templates";
const STORAGE_DIRECTORY = "global-library/holiday-times/2026-09-22";
const CANVA_URL =
  "https://www.canva.com/design/DAHV8FuqIRw/WCP8wWYi11IqFUNPVd8mUA/view?utm_content=DAHV8FuqIRw&utm_campaign=designshare&utm_medium=link&utm_source=publishsharelink&mode=preview";
const THUMBNAIL_LIMIT = 150 * 1024;
const PREVIEW_LIMIT = 500 * 1024;
const EXPECTED_WIDTH = 1414;
const EXPECTED_HEIGHT = 2000;
const IMPORT_TAG = "import:holiday-times-2026-09-22";

const TEMPLATE_DEFINITIONS: ReadonlyArray<{ name: string; holidayTheme: HolidayTheme }> = [
  { name: "Calendrier de Tichri 5787 – Rouge", holidayTheme: "tichri" },
  { name: "Calendrier de Tichri 5786 – Bleu", holidayTheme: "tichri" },
  { name: "Horaires de Roch Hachana – Grenade et Chofar", holidayTheme: "rosh-hashanah" },
  { name: "Horaires des fêtes de Tichri – Bleu", holidayTheme: "tichri" },
  { name: "Horaires des fêtes de Tichri – Or", holidayTheme: "tichri" },
  { name: "Sonneries du Chofar – Rose", holidayTheme: "rosh-hashanah" },
  { name: "Sonneries du Chofar – Rouge", holidayTheme: "rosh-hashanah" },
  { name: "Horaires de Roch Hachana – Bleu", holidayTheme: "rosh-hashanah" },
  { name: "Horaires de Yom Kippour – Rouge et bleu", holidayTheme: "yom-kippur" },
  { name: "Horaires de Yom Kippour – Bleu", holidayTheme: "yom-kippur" },
  { name: "Horaires de Yom Kippour – Rouge", holidayTheme: "yom-kippur" },
  { name: "Horaires de Souccot 5786 – Vert", holidayTheme: "sukkot" },
] as const;

type PreparedTemplate = {
  fileName: string;
  id: string;
  name: string;
  holidayTheme: HolidayTheme;
  subCategory: string | null;
  tags: string[];
  original: Buffer;
  thumbnail: Awaited<ReturnType<typeof optimizeTemplateImages>>["thumbnail"];
  preview: Awaited<ReturnType<typeof optimizeTemplateImages>>["preview"];
  originalPath: string;
  thumbnailPath: string;
  previewPath: string;
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
  if (
    metadata.width !== EXPECTED_WIDTH ||
    metadata.height !== EXPECTED_HEIGHT ||
    metadata.format !== "png"
  ) {
    throw new Error(
      `${fileName}: format inattendu (${metadata.width}x${metadata.height}, ${metadata.format ?? "inconnu"}).`,
    );
  }

  const fingerprint = createHash("sha256").update(original).digest("hex");
  const id = `template_holiday_times_${fingerprint.slice(0, 24)}`;
  const variants = await optimizeTemplateImages(original);
  if (variants.thumbnail.size > THUMBNAIL_LIMIT) {
    throw new Error(`${fileName}: miniature trop lourde (${variants.thumbnail.size} octets).`);
  }
  if (variants.preview.size > PREVIEW_LIMIT) {
    throw new Error(`${fileName}: aperçu trop lourd (${variants.preview.size} octets).`);
  }

  const taxonomy = buildTemplateTaxonomy({
    category: "HOLIDAY",
    usage: TEMPLATE_USAGE_TAGS.holidayTimes,
    holidayTheme: definition.holidayTheme,
    tags: [IMPORT_TAG],
  });

  return {
    fileName,
    id,
    name: definition.name,
    holidayTheme: definition.holidayTheme,
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

  const { data: existingRows, error: existingError } = await supabase
    .from("Template")
    .select("id")
    .in("id", prepared.map((template) => template.id));
  if (existingError) throw existingError;
  const existingIds = new Set((existingRows ?? []).map((row) => row.id));
  const pending = prepared.filter((template) => !existingIds.has(template.id));
  console.log(`Préflight : ${existingIds.size} déjà présente(s), ${pending.length} à importer.`);

  if (!COMMIT) {
    console.log("Simulation terminée sans modification. Ajoutez --commit pour importer.");
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
        description: "Affiche d'horaires de fête personnalisable avec l'IA ou dans Canva.",
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

  const ids = prepared.map((template) => template.id);
  const { data: verifiedRows, error: verifyRowsError } = await supabase
    .from("Template")
    .select(
      "id,name,category,subCategory,originalUrl,thumbnailUrl,previewUrl,supportsAi,canvaUrl,isGlobal,isPremium,isActive,tags",
    )
    .in("id", ids)
    .order("name");
  if (verifyRowsError) throw verifyRowsError;
  if ((verifiedRows ?? []).length !== TEMPLATE_DEFINITIONS.length) {
    throw new Error(
      `Vérification base échouée : ${verifiedRows?.length ?? 0}/${TEMPLATE_DEFINITIONS.length} lignes.`,
    );
  }

  for (const row of verifiedRows ?? []) {
    if (
      row.category !== "HOLIDAY" ||
      !row.tags?.includes(TEMPLATE_USAGE_TAGS.holidayTimes) ||
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

  console.log(
    `Vérification réussie : ${verifiedRows?.length ?? 0} affiches, ${verifiedStorageCount} fichiers et aucun doublon d'empreinte.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
