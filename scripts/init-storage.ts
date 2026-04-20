/**
 * Initialise le bucket Supabase "templates" pour stocker les affiches.
 * Usage : npx tsx scripts/init-storage.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Créer le bucket templates
  const { data, error } = await supabase.storage.createBucket("templates", {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024, // 10 Mo
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"],
  });

  if (error) {
    if (error.message.includes("already exists")) {
      console.log("✅ Bucket 'templates' existe déjà");
    } else {
      console.error("❌ Erreur:", error.message);
      process.exit(1);
    }
  } else {
    console.log("✅ Bucket 'templates' créé:", data);
  }
}

main();
