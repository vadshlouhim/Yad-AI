import assert from "node:assert/strict";
import { fetchSeferHamitsvot } from "../src/lib/automation/hayom-yom";
import {
  HEBREW_SEFER_MAX_LENGTH,
  HEBREW_SEFER_SOURCE_LABEL,
  frenchCommandments,
  hebrewCommandmentHeading,
  hebrewTranslationPrompt,
  prepareHebrewSeferTranslation,
  stripFrenchSeferIntroduction,
} from "../src/lib/newsletter/hebrew-sefer-translation";
import { newsletterShabbatDate, upcomingSaturdayDate } from "../src/lib/newsletter/shabbat-study";
import heMessages from "../messages/he.json";

const DATE = "2026-10-24";
const WARNING = "Notons que bon nombre de ces lois ne sont pas pratiquées de nos jours. Ce texte constitue un premier essai. ";
const FRENCH_STUDY = `${WARNING}Mitsva positive N° 245 : C'est le commandement qui nous a été enjoint en ce qui concerne la loi de l'achat et de la vente.`;

async function main() {
  assert.equal(newsletterShabbatDate("2026-10-23"), DATE);
  assert.equal(upcomingSaturdayDate(new Date("2026-10-20T23:30:00Z"), "Europe/Paris"), DATE);

  const requested: string[] = [];
  const source = await fetchSeferHamitsvot(DATE, (async (input) => {
    const url = String(input);
    requested.push(url);
    if (url.includes("view=day") && url.includes("year=2026") && url.includes("month=10") && url.includes("day=24")) {
      return new Response('<a href="/etude/etudes-quotidiennes/251709/sefer-hamitsvot">Sefer</a>', { status: 200 });
    }
    if (url.includes("loubavitch.fr/etude/etudes-quotidiennes/251709/sefer-hamitsvot")) {
      return new Response(`<div class="date today">10.24.2026</div><div class="event-desc">${FRENCH_STUDY}</div>`, { status: 200 });
    }
    return new Response("Not found", { status: 404 });
  }) as typeof fetch);

  assert.equal(source.text, FRENCH_STUDY);
  assert.ok(requested.length === 2 && requested.every((url) => url.startsWith("https://www.loubavitch.fr/")));
  assert.equal(stripFrenchSeferIntroduction(source.text), FRENCH_STUDY.slice(WARNING.length));
  assert.deepEqual(frenchCommandments("Mitsva positive N° 245; Mitsva négative N° 64"), [
    { type: "positive", number: 245 },
    { type: "negative", number: 64 },
  ]);
  assert.equal(hebrewCommandmentHeading(source.text), "מצוות עשה מס׳ 245");
  const prompt = hebrewTranslationPrompt(source.text);
  assert.doesNotMatch(prompt, /premier essai|bon nombre de ces lois/i);
  assert.match(prompt, /מצוות עשה מס׳ 245/);

  const translated = prepareHebrewSeferTranslation(
    "המצווה עוסקת בדיני קנייה ומכירה ומלמדת כיצד העסקה חלה בין המוכר לקונה. יש לפעול בדרכי הקניין שקבעה ההלכה, כדי שהעברת הבעלות תהיה ברורה ומחייבת.",
    source.text,
  );
  assert.match(translated, /^מצוות עשה מס׳ 245/);
  assert.ok(translated.length < HEBREW_SEFER_MAX_LENGTH);
  assert.equal(prepareHebrewSeferTranslation(FRENCH_STUDY, source.text), "", "Raw French must never reach a Hebrew newsletter");
  assert.equal(HEBREW_SEFER_SOURCE_LABEL, "מקור: Beth Loubavitch · תורגם ותומצת בעזרת AI");
  assert.equal(heMessages.newsletter.studyTranslationFailed, "התרגום לא הצליח – נסו שוב");

  console.log("Sefer Hamitsvot HE: same Loubavitch source/date, intro removal, Hebrew-only translation and 1,000-character limit passed.");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
