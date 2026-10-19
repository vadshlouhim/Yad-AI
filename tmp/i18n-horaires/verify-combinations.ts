import { readFileSync } from "node:fs";
import { buildShabbatCaption } from "../../src/lib/automation/shabbat-poster";

const messages = {
  fr: JSON.parse(readFileSync("messages/fr.json", "utf8")),
  he: JSON.parse(readFileSync("messages/he.json", "utf8")),
};
const times = { date: "2026-10-16", hebrewDate: "ה׳ בחשוון תשפ״ז", parasha: "נח", entry: "18:32", exit: "19:36", candleLighting: "18:32", havdalah: "19:36" };
const fields = { structureName: "EasyCom Test", city: "Paris" };

for (const interfaceLocale of ["fr", "he"] as const) {
  for (const outputLocale of ["fr", "he"] as const) {
    const caption = buildShabbatCaption(fields, times, outputLocale);
    const valid = outputLocale === "he" ? caption.includes("כניסת שבת") : caption.includes("Entrée de Chabbat");
    if (!valid || !messages[interfaceLocale].shabbatTimes.outputLanguage) throw new Error(`${interfaceLocale}/${outputLocale} failed`);
    process.stdout.write(`${interfaceLocale}/${outputLocale}: ok\n`);
  }
}

