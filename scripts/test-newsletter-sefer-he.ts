import assert from "node:assert/strict";
import { commandmentRefs, fetchHebrewSeferHamitsvotSource } from "../src/lib/newsletter/hebrew-sefer-hamitsvot";
import { hebrewSeferHamitsvotUrl, newsletterShabbatDate, upcomingSaturdayDate } from "../src/lib/newsletter/shabbat-study";

const DATE = "2026-10-24";

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}

async function main() {
  assert.equal(newsletterShabbatDate("2026-10-23"), DATE);
  assert.equal(upcomingSaturdayDate(new Date("2026-10-20T23:30:00Z"), "Europe/Paris"), DATE);
  assert.equal(hebrewSeferHamitsvotUrl(DATE), "https://he.chabad.org/dailystudy/seferHamitzvos.asp?tdate=10%2F24%2F2026");

  const requested: string[] = [];
  const source = await fetchHebrewSeferHamitsvotSource(DATE, (async (input) => {
    const url = String(input);
    requested.push(url);
    if (url.startsWith("https://he.chabad.org/")) return new Response("Just a moment...", { status: 403 });
    if (url.includes("view=day") && url.includes("year=2026") && url.includes("month=10") && url.includes("day=24")) {
      return new Response('<a href="/etude/etudes-quotidiennes/251709/sefer-hamitsvot">Sefer</a>', { status: 200 });
    }
    if (url.includes("loubavitch.fr/etude/etudes-quotidiennes/251709/sefer-hamitsvot")) {
      return new Response('<div class="date today">10.24.2026</div><div class="event-desc">Mitsva positive N° 245 :\nTexte français.</div>', { status: 200 });
    }
    if (url.includes("api/v3/texts/Sefer_HaMitzvot,_Positive_Commandments.245?version=hebrew")) return jsonResponse({
      ref: "Sefer HaMitzvot, Positive Commandments 245",
      heRef: "ספר המצוות, מצוות עשה רמ״ה",
      versions: [{ language: "he", text: ["היא שצונו בדין מקח וממכר, ובדרכים שבהן מתקיים המכר בין המוכר והקונה."] }],
    });
    return new Response("Not found", { status: 404 });
  }) as typeof fetch);

  assert.equal(source.date, DATE);
  assert.equal(source.retrieval, "loubavitch.fr+sefaria");
  assert.equal(source.title, "מצוות עשה רמ״ה");
  assert.match(source.text, /דין מקח וממכר/);
  assert.match(source.sourceUrl, /sefaria\.org\/Sefer_HaMitzvot,_Positive_Commandments\.245/);
  assert.equal(source.sourceLabel, "מקור: ספר המצוות לרמב״ם (Sefaria)");
  assert.deepEqual(commandmentRefs("Mitsva positive N° 8 ; Mitsva négative N° 64 ; Mitsva positive N° 206"), [
    { type: "Positive", number: 8 },
    { type: "Negative", number: 64 },
    { type: "Positive", number: 206 },
  ]);
  assert.ok(requested.some((url) => url.includes("loubavitch.fr")), "The fallback must identify the mitzvah on loubavitch.fr");

  const outageRequests: string[] = [];
  await assert.rejects(fetchHebrewSeferHamitsvotSource(DATE, (async (input) => {
    outageRequests.push(String(input));
    return new Response("Unavailable", { status: 503 });
  }) as typeof fetch), /לא ניתן לטעון/);
  assert.ok(outageRequests.some((url) => url.includes("loubavitch.fr")), "After the Chabad block, the fallback must try the French schedule source");

  console.log("Sefer Hamitsvot HE: exact Shabbat date, mitzvah 245, Hebrew fallback and outage behavior passed.");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
