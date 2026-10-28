import assert from "node:assert/strict";
import { formatOfficeLines, parseOfficeText, resolveOfficeTime, serializeOfficeLines } from "../src/lib/religious/office-times";

const clock = { entry: "18:12", exit: "19:20" };

// Free text, several services per line, the day carried over.
const lines = parseOfficeText("Vendredi Min'ha 18h30, Arvit 18h50\nSamedi : Cha'harit 9h30, Moussaf après la lecture; Min'ha 30 min avant la sortie");
assert.deepEqual(lines, [
  { label: "Vendredi · Min'ha", when: "18h30" },
  { label: "Vendredi · Arvit", when: "18h50" },
  { label: "Samedi · Cha'harit", when: "9h30" },
  { label: "Samedi · Moussaf après la lecture", when: "" },
  { label: "Min'ha", when: "30 min avant la sortie" },
]);

// Clock formats.
assert.equal(resolveOfficeTime("18:30", clock, "fr"), "18h30");
assert.equal(resolveOfficeTime("9h", clock, "fr"), "9h00");
assert.equal(resolveOfficeTime("18h05", clock, "he"), "18:05");

// Times relative to the candle lighting and to the end of Shabbat, recalculated from the week's times.
assert.equal(resolveOfficeTime("15 min avant l'allumage", clock, "fr"), "17h57");
assert.equal(resolveOfficeTime("10 minutes après la sortie", clock, "fr"), "19h30");
assert.equal(resolveOfficeTime("à l'allumage", clock, "fr"), "18h12");
assert.equal(resolveOfficeTime("20 דקות לפני הדלקת נרות", clock, "he"), "17:52");
assert.equal(resolveOfficeTime("15 min avant l'allumage", { entry: "16:40", exit: "17:50" }, "fr"), "16h25", "next week follows the new times");
assert.equal(resolveOfficeTime("après la lecture", clock, "fr"), null, "wording that is not a time stays as written");

// What the poster shows.
assert.deepEqual(formatOfficeLines(parseOfficeText("Min'ha 15 min avant l'allumage\nCours : après Arvit"), clock, "fr"), [
  "Min'ha — 17h57",
  "Cours — après Arvit",
]);

// Hebrew, with a day.
assert.deepEqual(parseOfficeText("ערב שבת: מנחה 18:30"), [{ label: "ערב שבת · מנחה", when: "18:30" }]);

// Saved text reads back to the same lines, so the user's edits survive from week to week.
assert.deepEqual(parseOfficeText(serializeOfficeLines(lines)), lines);

console.log("Office times: parsing, relative times, Hebrew and round trip passed.");
