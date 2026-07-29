import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

type TemplateCategory =
  | "SHABBAT"
  | "HOLIDAY"
  | "EVENT"
  | "COURSE"
  | "ANNOUNCEMENT"
  | "RECAP"
  | "GREETING"
  | "GENERAL";

type CsvRow = {
  code: string;
  name: string;
  family: string;
  sourceCategory: string;
  instructions: string;
  keywords: string;
};

type TemplateRecord = {
  id: string;
  name: string;
  description: string | null;
  category: TemplateCategory;
  subCategory: string | null;
  channelType: null;
  originalUrl: string;
  thumbnailUrl: string;
  previewUrl: string;
  design: unknown[];
  isGlobal: boolean;
  isPremium: boolean;
  isActive: boolean;
  tags: string[];
  usageCount: number;
  communityId: null;
  createdAt: string;
  updatedAt: string;
};

const IMPORT_TAG = "source:desktop-affiches-2026-06-09";
const DESKTOP_DIR = path.join(process.env.HOME ?? "", "Desktop");
const IMAGE_ROOT = path.join(DESKTOP_DIR, "Affiches 09-06-2026");
const CSV_PATH = path.join(DESKTOP_DIR, "Tableaux des Affiches 10-06-2026 - Feuille 1.csv");

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Variables Supabase manquantes dans l'environnement.");
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function normalizeCode(value: string) {
  return value
    .trim()
    .replace(/\.[^.]+$/, "")
    .replace(/ \((\d+)\)$/, "$1")
    .replace(/\s+/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function parseCsv(content: string): CsvRow[] {
  const rows: string[][] = [];
  let currentField = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentField += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      currentRow.push(currentField);
      currentField = "";
      if (currentRow.some((field) => field.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      continue;
    }

    currentField += char;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((field) => field.trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  const [, ...dataRows] = rows;
  return dataRows
    .map((row) => ({
      code: row[0]?.trim() ?? "",
      name: row[1]?.trim() ?? "",
      family: row[2]?.trim() ?? "",
      sourceCategory: row[3]?.trim() ?? "",
      instructions: row[4]?.trim() ?? "",
      keywords: row[5]?.trim() ?? "",
    }))
    .filter((row) => row.code.length > 0);
}

async function collectImageFiles(rootDir: string) {
  const files: string[] = [];

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === ".DS_Store") continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (/\.(png|jpg|jpeg|webp)$/i.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  await walk(rootDir);
  files.sort((a, b) => a.localeCompare(b, "fr"));
  return files;
}

function getAliasCode(code: string) {
  const aliases: Record<string, string> = {
    BARMIT1: "BARMI1",
    BARMIT2: "BARMI2",
    BARMIT3: "BARMI3",
    BARMIT4: "BARMI4",
    BARMIT5: "BARMI5",
    LAHAIM1: "LEHAIM1",
    LAHAIM2: "LEHAIM2",
    LAHAIM3: "LEHAIM3",
    DESER6: "SEDER6",
    LECTUREMEGUILA11: "LECTUREMEGUILA1",
    KAPAROTENLIGNE1: "KAPPAROTENLIGNE1",
    KAPAROTENLIGNE2: "KAPPAROTENLIGNE2",
    KAPAROTENLIGNE3: "KAPPAROTENLIGNE3",
    KAPAROTENLIGNE4: "KAPPAROTENLIGNE4",
    KAPAROTENLIGNE5: "KAPPAROTENLIGNE5",
  };

  return aliases[code] ?? code;
}

function mapSourceCategory(value: string): TemplateCategory {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

  if (normalized.includes("CHABBAT")) return "SHABBAT";
  if (
    normalized.includes("HANOUCCA") ||
    normalized.includes("FETE JUIVE") ||
    normalized.includes("FETES JUIVES") ||
    normalized.includes("FETE HASSIDIQUE") ||
    normalized.includes("FETES HASSIDIQUE") ||
    normalized.includes("TICHRI") ||
    normalized.includes("PESSA") ||
    normalized.includes("POURIM") ||
    normalized.includes("ROCH HACHANA")
  ) {
    return "HOLIDAY";
  }
  if (
    normalized.includes("COURS") ||
    normalized.includes("ETUDE") ||
    normalized.includes("CONFERENCE") ||
    normalized.includes("CTEEN/COURS")
  ) {
    return "COURSE";
  }
  if (
    normalized.includes("MAZAL TOV") ||
    normalized.includes("MESSAGE DE FETE") ||
    normalized.includes("GREETING")
  ) {
    return "GREETING";
  }
  if (normalized.includes("REPAS COMMUNAUTAIRE")) return "EVENT";
  if (normalized.includes("EVENEMENT") || normalized.includes("GAN ISRAEL") || normalized.includes("CTEEN/CHABBAT")) {
    return "EVENT";
  }
  return "GENERAL";
}

function buildTags(row: CsvRow, code: string) {
  const keywordTags = row.keywords
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const tags = [
    IMPORT_TAG,
    `ref:${code}`,
    row.family,
    row.sourceCategory,
    ...keywordTags,
  ]
    .map((tag) => tag.trim())
    .filter(Boolean);

  return [...new Set(tags)].slice(0, 30);
}

function buildFallbackRow(code: string, filePath: string, familyFallback?: CsvRow): CsvRow {
  const relativeDir = path.dirname(path.relative(IMAGE_ROOT, filePath));
  const pathFamily = relativeDir === "." ? path.basename(path.dirname(filePath)) : relativeDir.split(path.sep).join(" / ");

  return {
    code,
    name: familyFallback?.name ?? path.basename(filePath, path.extname(filePath)),
    family: familyFallback?.family ?? pathFamily,
    sourceCategory: familyFallback?.sourceCategory ?? "GENERAL",
    instructions:
      familyFallback?.instructions ??
      `Affiche importée depuis le dossier desktop. Personnaliser les textes selon le contexte et demander une validation avant publication.`,
    keywords: familyFallback?.keywords ?? pathFamily,
  };
}

function findFamilyFallback(code: string, rowsByCode: Map<string, CsvRow>) {
  const prefix = code.replace(/\d+$/, "");
  const familyCandidates = [...rowsByCode.entries()]
    .filter(([existingCode]) => existingCode.startsWith(prefix))
    .sort((a, b) => a[0].localeCompare(b[0], "fr"));

  if (familyCandidates.length > 0) {
    return familyCandidates[familyCandidates.length - 1][1];
  }
  return undefined;
}

async function uploadImageVariants(
  supabase: ReturnType<typeof createAdminClient>,
  inputPath: string,
  code: string,
) {
  const input = await fs.readFile(inputPath);
  const previewBuffer = await sharp(input)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 86 })
    .toBuffer();
  const thumbBuffer = await sharp(input)
    .rotate()
    .resize({ width: 640, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();

  const originalExtension = path.extname(inputPath).toLowerCase() || ".img";
  const originalPath = `imports/2026-06-09/${code}/original${originalExtension}`;
  const previewPath = `imports/2026-06-09/${code}/preview.webp`;
  const thumbPath = `imports/2026-06-09/${code}/thumbnail.webp`;

  const originalUpload = await supabase.storage.from("templates").upload(originalPath, input, {
    contentType: `image/${originalExtension.replace(".", "").replace("jpg", "jpeg")}`,
    upsert: true,
  });
  if (originalUpload.error) throw new Error(`Upload original ${code}: ${originalUpload.error.message}`);

  const previewUpload = await supabase.storage.from("templates").upload(previewPath, previewBuffer, {
    contentType: "image/webp",
    upsert: true,
  });
  if (previewUpload.error) throw new Error(`Upload preview ${code}: ${previewUpload.error.message}`);

  const thumbUpload = await supabase.storage.from("templates").upload(thumbPath, thumbBuffer, {
    contentType: "image/webp",
    upsert: true,
  });
  if (thumbUpload.error) throw new Error(`Upload thumbnail ${code}: ${thumbUpload.error.message}`);

  const originalUrl = supabase.storage.from("templates").getPublicUrl(originalPath).data.publicUrl;
  const previewUrl = supabase.storage.from("templates").getPublicUrl(previewPath).data.publicUrl;
  const thumbnailUrl = supabase.storage.from("templates").getPublicUrl(thumbPath).data.publicUrl;

  return { originalUrl, previewUrl, thumbnailUrl };
}

async function main() {
  const supabase = createAdminClient();

  const csvContent = await fs.readFile(CSV_PATH, "utf8");
  const csvRows = parseCsv(csvContent);
  const rowsByCode = new Map(csvRows.map((row) => [normalizeCode(row.code), row]));
  const imageFiles = await collectImageFiles(IMAGE_ROOT);

  const templatesToInsert: TemplateRecord[] = [];
  const unresolved: string[] = [];
  const importedCodes: string[] = [];

  for (const filePath of imageFiles) {
    const rawCode = normalizeCode(path.basename(filePath, path.extname(filePath)));
    const code = getAliasCode(rawCode);
    const exactRow = rowsByCode.get(code);
    const row = exactRow ?? buildFallbackRow(code, filePath, findFamilyFallback(code, rowsByCode));

    if (!row.name || !row.family) {
      unresolved.push(`${code} -> métadonnées insuffisantes`);
      continue;
    }

    const { originalUrl, previewUrl, thumbnailUrl } = await uploadImageVariants(supabase, filePath, code);
    const now = new Date().toISOString();

    templatesToInsert.push({
      id: `template_${crypto.randomUUID()}`,
      name: row.name,
      description: row.instructions || null,
      category: mapSourceCategory(row.sourceCategory),
      subCategory: row.family || null,
      channelType: null,
      originalUrl,
      thumbnailUrl,
      previewUrl,
      design: [],
      isGlobal: true,
      isPremium: false,
      isActive: false,
      tags: buildTags(row, code),
      usageCount: 0,
      communityId: null,
      createdAt: now,
      updatedAt: now,
    });
    importedCodes.push(code);
  }

  if (unresolved.length > 0) {
    throw new Error(`Import interrompu, métadonnées introuvables pour: ${unresolved.join(", ")}`);
  }

  const previousImported = await supabase
    .from("Template")
    .delete()
    .contains("tags", [IMPORT_TAG]);
  if (previousImported.error) {
    throw new Error(`Suppression ancien import impossible: ${previousImported.error.message}`);
  }

  const batchSize = 25;
  for (let i = 0; i < templatesToInsert.length; i += batchSize) {
    const batch = templatesToInsert.slice(i, i + batchSize);
    const insert = await supabase.from("Template").insert(batch);
    if (insert.error) {
      throw new Error(`Insertion batch ${i / batchSize + 1} impossible: ${insert.error.message}`);
    }
  }

  const currentActive = await supabase
    .from("Template")
    .select("id, tags")
    .eq("isGlobal", true)
    .eq("isActive", true);
  if (currentActive.error) {
    throw new Error(`Lecture des affiches actives impossible: ${currentActive.error.message}`);
  }

  const idsToDeactivate = (currentActive.data ?? [])
    .filter((template) => !Array.isArray(template.tags) || !template.tags.includes(IMPORT_TAG))
    .map((template) => template.id);

  if (idsToDeactivate.length > 0) {
    const deactivateOld = await supabase
      .from("Template")
      .update({ isActive: false, updatedAt: new Date().toISOString() })
      .in("id", idsToDeactivate);
    if (deactivateOld.error) {
      throw new Error(`Désactivation anciennes affiches impossible: ${deactivateOld.error.message}`);
    }
  }

  const activateNew = await supabase
    .from("Template")
    .update({ isActive: true, updatedAt: new Date().toISOString() })
    .contains("tags", [IMPORT_TAG]);
  if (activateNew.error) {
    throw new Error(`Activation nouvelles affiches impossible: ${activateNew.error.message}`);
  }

  console.log(
    JSON.stringify(
      {
        importedCount: templatesToInsert.length,
        importedCodes: importedCodes.slice(0, 20),
        importTag: IMPORT_TAG,
        fallbackCount: imageFiles.length - csvRows.filter((row) => importedCodes.includes(normalizeCode(row.code))).length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
