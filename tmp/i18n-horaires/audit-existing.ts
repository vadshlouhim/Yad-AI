import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function main() {
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase environment unavailable");
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await client.from("Automation").select("id, trigger, name, triggerConfig, isActive, status").in("trigger", ["WEEKLY_SHABBAT", "JEWISH_HOLIDAY"]);
if (error) throw error;
const summary = (data ?? []).map((row) => {
  const config = row.triggerConfig && typeof row.triggerConfig === "object" && !Array.isArray(row.triggerConfig) ? row.triggerConfig as Record<string, unknown> : {};
  const nested = row.trigger === "WEEKLY_SHABBAT" ? config.shabbatPoster : config.holidayPoster;
  const poster = nested && typeof nested === "object" && !Array.isArray(nested) ? nested as Record<string, unknown> : {};
  return { id: row.id, trigger: row.trigger, name: row.name, active: row.isActive, status: row.status, storedOutputLocale: poster.outputLocale ?? null, effectiveOutputLocale: poster.outputLocale === "he" ? "he" : "fr" };
});
process.stdout.write(JSON.stringify(summary, null, 2));
}

void main();
