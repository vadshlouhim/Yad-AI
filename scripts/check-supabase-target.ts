import { config } from "dotenv";
import { assertSupabaseDatabaseTarget } from "../src/lib/supabase/project-target";

config({ path: ".env.local" });
config({ path: ".env" });

const databaseUrls = [
  ["DIRECT_URL", process.env.DIRECT_URL],
  ["DATABASE_URL", process.env.DATABASE_URL],
] as const;

try {
  for (const [name, databaseUrl] of databaseUrls) {
    const result = assertSupabaseDatabaseTarget({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      databaseUrl,
    });
    console.log(`${name}: projet ${result.databaseProjectRef} verifie`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Configuration Supabase invalide.");
  process.exitCode = 1;
}
