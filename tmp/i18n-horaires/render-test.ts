import sharp from "sharp";
import { renderReligiousPoster } from "../../src/lib/religious/poster-overlay";

async function main() {
const background = await sharp({
  create: { width: 1080, height: 1350, channels: 4, background: { r: 62, g: 24, b: 104, alpha: 1 } },
}).png().toBuffer();

await renderReligiousPoster({
  background,
  locale: "he",
  content: {
    communityName: "בית חב״ד לדוגמה",
    title: "שבת שלום",
    subtitle: "פרשת נח",
    hebrewDate: "ו׳ בחשוון תשפ״ז",
    gregorianDate: "17 באוקטובר 2026",
    location: "Paris",
    entryLabel: "כניסת שבת",
    entryTime: "18:32",
    exitLabel: "יציאת שבת",
    exitTime: "19:36",
    source: "זמני שבת באדיבות Chabad.org/ShabbatTimes",
  },
}).then((buffer) => sharp(buffer).toFile("tmp/i18n-horaires/shabbat-he.png"));

await renderReligiousPoster({
  background,
  locale: "he",
  content: {
    communityName: "בית חב״ד לדוגמה",
    title: "שמחת תורה",
    subtitle: "חג שמח",
    hebrewDate: "כ״ב בתשרי תשפ״ז",
    gregorianDate: "3 באוקטובר 2026",
    location: "Paris",
    entryLabel: "ערב חג",
    entryTime: "18:51",
    exitLabel: "מוצאי חג",
    exitTime: "19:54",
  },
}).then((buffer) => sharp(buffer).toFile("tmp/i18n-horaires/holiday-he.png"));
}

void main();
