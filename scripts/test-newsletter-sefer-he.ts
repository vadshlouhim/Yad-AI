import assert from "node:assert/strict";
import { fetchHebrewSeferHamitsvotSource } from "../src/lib/newsletter/hebrew-sefer-hamitsvot";
import { hebrewSeferHamitsvotUrl, newsletterShabbatDate } from "../src/lib/newsletter/shabbat-study";

const DATE = "2026-10-24";

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}

async function main() {
  assert.equal(newsletterShabbatDate("2026-10-23"), DATE);
  assert.equal(hebrewSeferHamitsvotUrl(DATE), "https://he.chabad.org/dailystudy/seferHamitzvos.asp?tdate=10%2F24%2F2026");

  const requested: string[] = [];
  const source = await fetchHebrewSeferHamitsvotSource(DATE, (async (input) => {
    const url = String(input);
    requested.push(url);
    if (url.startsWith("https://he.chabad.org/")) return new Response("Just a moment...", { status: 403 });
    if (url.startsWith("https://www.torahcalc.com/")) return jsonResponse({
      success: true,
      data: {
        date: DATE,
        dailySeferHamitzvos: {
          name: "Day 264: Positive Commandment 245",
          url: "https://www.chabad.org/dailystudy/seferHamitzvos.asp?tdate=10/24/2026",
        },
      },
    });
    if (url.includes("Sefer_HaMitzvot%2C_Positive_Commandments.245")) return jsonResponse({
      heRef: "ספר המצוות, מצוות עשה רמ״ה",
      he: ["היא שצונו בדין מקח וממכר, ובדרכים שבהן מתקיים המכר בין המוכר והקונה."],
    });
    return new Response("Not found", { status: 404 });
  }) as typeof fetch);

  assert.equal(source.date, DATE);
  assert.equal(source.retrieval, "same-day-hebrew-fallback");
  assert.equal(source.title, "מצוות עשה רמ״ה");
  assert.match(source.text, /דין מקח וממכר/);
  assert.equal(source.sourceUrl, hebrewSeferHamitsvotUrl(DATE));
  assert.ok(requested.every((url) => !url.includes("loubavitch.fr")), "Hebrew failure must never fall back to French");

  const outageRequests: string[] = [];
  await assert.rejects(fetchHebrewSeferHamitsvotSource(DATE, (async (input) => {
    outageRequests.push(String(input));
    return new Response("Unavailable", { status: 503 });
  }) as typeof fetch), /לא ניתן לטעון/);
  assert.ok(outageRequests.every((url) => !url.includes("loubavitch.fr")), "A total outage must stay Hebrew-only");

  console.log("Sefer Hamitsvot HE: exact Shabbat date, mitzvah 245, Hebrew fallback and outage behavior passed.");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
