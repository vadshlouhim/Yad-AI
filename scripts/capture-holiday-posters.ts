import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { renderReligiousPoster, renderReusableHolidayBackground, type ReligiousPosterContent } from "../src/lib/religious/poster-overlay";

config({ path: ".env.local" });
config({ path: ".env" });
const outputDir = path.join(process.cwd(), "tmp", "i18n-fetes");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Configuration Supabase manquante.");
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const names: Record<string, { fr: string; he: string }> = {
  "template_holiday_manual_generic_2026": { fr: "Fêtes juives", he: "חגי ישראל" },
  "template_holiday_manual_rosh_hashanah_2026": { fr: "Roch Hachana", he: "ראש השנה" },
  "template_holiday_manual_sukkot_2026": { fr: "Souccot", he: "סוכות" },
  "template_holiday_manual_hanukkah_2026": { fr: "Hanoucca", he: "חנוכה" },
  "template_holiday_manual_purim_2026": { fr: "Pourim", he: "פורים" },
  "template_holiday_manual_passover_2026": { fr: "Pessa’h", he: "פסח" },
};

function escapeXml(value: string) { return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character] ?? character); }
function oldLine(value: string | undefined, y: number, size: number, weight = 500) { return value?.trim() ? `<text x="540" y="${y}" text-anchor="middle" font-size="${size}" font-weight="${weight}">${escapeXml(value.trim())}</text>` : ""; }
async function legacyRender(background: Buffer, locale: "fr" | "he", content: ReligiousPosterContent) {
  const direction = locale === "he" ? "rtl" : "ltr";
  const svg = Buffer.from(`<svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg"><rect x="86" y="185" width="908" height="980" rx="36" fill="#ffffff" fill-opacity="0.92" stroke="#7c3aed" stroke-opacity="0.32" stroke-width="3"/><g fill="#24173d" font-family="Arial, 'Noto Sans Hebrew', sans-serif" direction="${direction}" unicode-bidi="embed">${oldLine(content.communityName,275,34,600)}${oldLine(content.title,380,66,800)}${oldLine(content.subtitle,455,42,700)}${oldLine(content.hebrewDate,520,32,500)}${oldLine(content.gregorianDate,570,27,400)}${oldLine(content.location,625,28,500)}${content.entryTime ? `<text x="540" y="740" text-anchor="middle" font-size="34" font-weight="600">${escapeXml(content.entryLabel ?? "")}: <tspan direction="ltr" unicode-bidi="embed" font-size="52" font-weight="800">${escapeXml(content.entryTime)}</tspan></text>` : ""}${content.exitTime ? `<text x="540" y="825" text-anchor="middle" font-size="34" font-weight="600">${escapeXml(content.exitLabel ?? "")}: <tspan direction="ltr" unicode-bidi="embed" font-size="52" font-weight="800">${escapeXml(content.exitTime)}</tspan></text>` : ""}${oldLine(content.source,1110,18,400)}</g></svg>`);
  return sharp(background).rotate().resize(1080,1350,{fit:"cover"}).composite([{input:svg,top:0,left:0}]).png().toBuffer();
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  const ids = Object.keys(names);
  const { data: templates, error } = await supabase.from("Template").select("id,originalUrl").in("id", ids).order("id");
  if (error) throw error;
  if (templates?.length !== ids.length) throw new Error("Modèles de capture incomplets.");
  for (const template of templates) {
    if (!template.originalUrl) throw new Error(`Fond absent: ${template.id}`);
    const response = await fetch(template.originalUrl);
    if (!response.ok) throw new Error(`Fond inaccessible: ${template.id}`);
    const background = await renderReusableHolidayBackground(template.originalUrl);
    for (const locale of ["fr", "he"] as const) {
      const content: ReligiousPosterContent = { communityName: locale === "he" ? "בית חב״ד לדוגמה" : "Beth Habad Exemple", title: names[template.id][locale], subtitle: locale === "he" ? "כ״ח בכסלו תשפ״ז" : "28 Kislev 5787", gregorianDate: locale === "he" ? "8 בדצמבר 2026" : "8 décembre 2026", location: locale === "he" ? "פריז" : "Paris", entryLabel: locale === "he" ? "הדלקת נרות" : "Allumage des bougies", entryTime: "16:37", exitLabel: locale === "he" ? "מוצאי חג" : "Fin de fête", exitTime: "17:52" };
      const poster = await renderReligiousPoster({ background, locale, content, embeddedHebrewFonts: true });
      await writeFile(path.join(outputDir, `${template.id.replace("template_holiday_manual_", "").replace("_2026", "")}-${locale}.png`), poster);
    }
  }

  const source = templates[0];
  const sourceResponse = await fetch(source.originalUrl!);
  const shabbatBackground = Buffer.from(await sourceResponse.arrayBuffer());
  const shabbatContent: ReligiousPosterContent = { communityName: "Beth Habad Exemple", title: "Parachat Berechit", gregorianDate: "17 octobre 2026", location: "Paris", entryLabel: "Entrée", entryTime: "18:22", exitLabel: "Sortie", exitTime: "19:27", source: "Chabad.org/ShabbatTimes" };
  const before = await legacyRender(shabbatBackground, "fr", shabbatContent);
  const after = await renderReligiousPoster({ background: shabbatBackground, locale: "fr", content: shabbatContent });
  await Promise.all([writeFile(path.join(outputDir, "shabbat-before.png"), before), writeFile(path.join(outputDir, "shabbat-after.png"), after)]);
  const [beforeRaw, afterRaw] = await Promise.all([sharp(before).raw().toBuffer(), sharp(after).raw().toBuffer()]);
  let changed = 0;
  for (let index = 0; index < beforeRaw.length; index += 1) if (beforeRaw[index] !== afterRaw[index]) changed += 1;
  console.log(`Captures: ${ids.length * 2} fêtes + 2 Chabbat. Différence pixel Chabbat: ${changed}/${beforeRaw.length} canaux.`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
