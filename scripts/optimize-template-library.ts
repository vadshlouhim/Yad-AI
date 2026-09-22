import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { optimizeTemplateImages } from "../src/lib/templates/image-optimization";

config({ path: ".env.local" });
config({ path: ".env" });

const COMMIT = process.argv.includes("--commit");
const FORCE = process.argv.includes("--force");

async function runWithConcurrency<T>(items: T[], worker: (item: T) => Promise<void>, limit = 2) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (item) await worker(item);
    }
  }));
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Variables Supabase manquantes dans .env.local ou .env.");

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await supabase
    .from("Template")
    .select("id, name, originalUrl, thumbnailUrl, previewUrl")
    .not("originalUrl", "is", null)
    .order("createdAt", { ascending: true });
  if (error) throw error;

  const templates = (data ?? []).filter((template) => FORCE
    || !template.thumbnailUrl
    || !template.previewUrl
    || template.thumbnailUrl === template.originalUrl
    || template.previewUrl === template.originalUrl
    || !template.thumbnailUrl.endsWith(".webp")
    || !template.previewUrl.endsWith(".webp"));

  console.log(`${templates.length} affiche(s) à optimiser sur ${data?.length ?? 0}.`);
  if (!COMMIT) {
    console.log("Aucune modification. Relancez avec --commit pour générer et enregistrer les variantes WebP.");
    return;
  }

  let optimized = 0;
  const failures: string[] = [];
  await runWithConcurrency(templates, async (template) => {
    try {
      const response = await fetch(template.originalUrl!);
      if (!response.ok) throw new Error(`Téléchargement HTTP ${response.status}`);
      const input = Buffer.from(await response.arrayBuffer());
      const variants = await optimizeTemplateImages(input);
      const thumbnailPath = `optimized/${template.id}/thumbnail.webp`;
      const previewPath = `optimized/${template.id}/preview.webp`;
      const [{ error: thumbnailError }, { error: previewError }] = await Promise.all([
        supabase.storage.from("templates").upload(thumbnailPath, variants.thumbnail.buffer, { contentType: variants.thumbnail.contentType, cacheControl: "31536000", upsert: true }),
        supabase.storage.from("templates").upload(previewPath, variants.preview.buffer, { contentType: variants.preview.contentType, cacheControl: "31536000", upsert: true }),
      ]);
      if (thumbnailError) throw thumbnailError;
      if (previewError) throw previewError;
      const thumbnailUrl = supabase.storage.from("templates").getPublicUrl(thumbnailPath).data.publicUrl;
      const previewUrl = supabase.storage.from("templates").getPublicUrl(previewPath).data.publicUrl;
      const { error: updateError } = await supabase.from("Template").update({ thumbnailUrl, previewUrl, updatedAt: new Date().toISOString() }).eq("id", template.id);
      if (updateError) throw updateError;
      optimized += 1;
      console.log(`[${optimized}/${templates.length}] ${template.name} · ${Math.round(variants.thumbnail.size / 1024)} Ko / ${Math.round(variants.preview.size / 1024)} Ko`);
    } catch (cause) {
      failures.push(`${template.name}: ${cause instanceof Error ? cause.message : "erreur inconnue"}`);
    }
  });

  console.log(`Optimisation terminée : ${optimized} réussie(s), ${failures.length} erreur(s).`);
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
