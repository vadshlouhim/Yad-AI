import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

config({ path: ".env.local" });
config({ path: ".env" });

const SOURCE_ROOT = process.argv.find((arg) => arg.startsWith("--source="))?.slice("--source=".length);
const COMMIT = process.argv.includes("--commit");
const IMPORT_TAG = "import:affiches-2026";
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

type Category = "SHABBAT" | "HOLIDAY" | "EVENT" | "COURSE" | "ANNOUNCEMENT" | "GENERAL";
type ImportFile = { absolutePath: string; relativePath: string; category: Category; subCategory: string | null; tags: string[]; id: string };

const SHABBAT = new Set(["horaires de chabbat", "chabbat communautaire"]);
const HOLIDAYS = new Set(["tichri", "19 kisslev", "hannoucah", "youd chavat", "tou bichvat", "pourim", "pessah", "lag baomer", "chavouot", "guimel tamouz", "didan notsah", "youd aleph nissan"]);
const COURSES = new Set(["cours de torah", "avot oubanim", "kinous torah", "lunch and learn"]);
const EVENTS = new Set(["bar mitsva", "brit milla", "hahnassat sefer torah", "gan israel", "club ados", "cteen", "hafrachat halla", "lehaim fillancailes", "coup de chevaeux"]);

function cleanName(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function classify(parts: string[]): Category {
  const root = parts[0]?.toLocaleLowerCase("fr") ?? "";
  if (SHABBAT.has(root)) return "SHABBAT";
  if (HOLIDAYS.has(root)) return "HOLIDAY";
  if (COURSES.has(root)) return "COURSE";
  if (EVENTS.has(root)) return "EVENT";
  return "GENERAL";
}

function uniqueAdjacent(values: string[]) {
  return values.filter((value, index) => index === 0 || value !== values[index - 1]);
}

async function walk(directory: string, root = directory): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(absolute, root);
    return IMAGE_EXTENSIONS.has(path.extname(entry.name).toLocaleLowerCase()) ? [absolute] : [];
  }));
  return nested.flat();
}

function toImportFile(absolutePath: string, sourceRoot: string): ImportFile {
  const relativePath = path.relative(sourceRoot, absolutePath).replaceAll("\\", "/");
  const rawParts = relativePath.split("/");
  const folderParts = rawParts.slice(0, -1).map(cleanName);
  const taxonomy = uniqueAdjacent(folderParts);
  const fingerprint = createHash("sha256").update(relativePath).digest("hex").slice(0, 24);
  return {
    absolutePath,
    relativePath,
    category: classify(taxonomy),
    subCategory: taxonomy.length ? taxonomy.join(" › ") : null,
    tags: [IMPORT_TAG, ...taxonomy.map((part) => `theme:${part.toLocaleLowerCase("fr")}`)],
    id: `template_import_${fingerprint}`,
  };
}

async function runWithConcurrency<T>(items: T[], worker: (item: T) => Promise<void>, limit = 4) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (item) await worker(item);
    }
  }));
}

async function main() {
  if (!SOURCE_ROOT) throw new Error("Utilisez --source=CHEMIN_VERS_LE_DOSSIER_EXTRAIT");
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Variables Supabase manquantes dans .env.local ou .env.");

  const files = (await walk(path.resolve(SOURCE_ROOT))).map((file) => toImportFile(file, path.resolve(SOURCE_ROOT)));
  const summary = files.reduce<Record<string, number>>((result, file) => ({ ...result, [file.category]: (result[file.category] ?? 0) + 1 }), {});
  console.log(`Analyse : ${files.length} images.`, summary);
  if (!COMMIT) {
    console.log("Aucune modification : aperçu seulement. Ajoutez --commit pour importer.");
    return;
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: existing, error: existingError } = await supabase.from("Template").select("id").in("id", files.map((file) => file.id));
  if (existingError) throw existingError;
  const existingIds = new Set((existing ?? []).map((template) => template.id));
  const pending = files.filter((file) => !existingIds.has(file.id));
  console.log(`${existingIds.size} déjà importées, ${pending.length} à envoyer.`);

  let imported = 0;
  const failures: string[] = [];
  await runWithConcurrency(pending, async (file) => {
    try {
      const buffer = await readFile(file.absolutePath);
      const extension = path.extname(file.absolutePath).toLocaleLowerCase();
      const storagePath = `global-library/affiches-2026/${file.id}${extension}`;
      const { error: uploadError } = await supabase.storage.from("templates").upload(storagePath, buffer, { contentType: extension === ".png" ? "image/png" : `image/${extension.slice(1)}`, cacheControl: "31536000", upsert: false });
      if (uploadError) throw uploadError;
      const publicUrl = supabase.storage.from("templates").getPublicUrl(storagePath).data.publicUrl;
      const { error: insertError } = await supabase.from("Template").insert({
        id: file.id,
        communityId: null,
        name: cleanName(path.basename(file.absolutePath, extension)),
        description: file.subCategory ? `Banque d’affiches · ${file.subCategory}` : "Banque d’affiches EasyCom",
        category: file.category,
        subCategory: file.subCategory,
        channelType: null,
        originalUrl: publicUrl,
        thumbnailUrl: publicUrl,
        previewUrl: publicUrl,
        design: [],
        isGlobal: true,
        isPremium: false,
        isActive: true,
        tags: file.tags,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      if (insertError) throw insertError;
      imported += 1;
      console.log(`[${imported}/${pending.length}] ${file.relativePath}`);
    } catch (error) {
      failures.push(`${file.relativePath}: ${error instanceof Error ? error.message : "erreur inconnue"}`);
    }
  });
  console.log(`Import terminé : ${imported} importées, ${failures.length} erreurs.`);
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
