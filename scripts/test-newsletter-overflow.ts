import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { estimateNewsletterFill } from "../src/lib/newsletter/layout-estimate";
import { parseLayoutPreferences } from "../src/lib/newsletter/revision";
import type { NewsletterDocumentData } from "../src/lib/newsletter/document-layout";

const base = {
  outputLocale: "he",
  community: { id: "test", name: "קהילה", city: "Paris", timezone: "Europe/Paris", donationUrl: null },
  generated: { title: "עלון שבת", subtitle: "", intro: "פתיחה קצרה", ravWord: "דבר הרב ".repeat(15), shabbatNote: "פרשה ".repeat(15), eventIntro: "", restaurantAd: "", proofreadNote: "", warnings: [] },
  enabled: { ravWord: true, shabbat: true, photos: true, posters: true, parness: false, kiddush: false, events: false, specificEvent: false, birthdays: false, restaurantAd: false, seferHamitsvot: false, support: false },
  parnessText: "", kiddushText: "", bannerPhotoUrl: "", events: [], birthdays: [], shabbat: null,
  photos: [], posters: [], partnerAds: [],
} as unknown as NewsletterDocumentData;

const normal = estimateNewsletterFill(base);
assert.ok(normal.percent < 90, `normal fixture should stay green, got ${normal.percent}%`);

const overloaded: NewsletterDocumentData = {
  ...base,
  generated: { ...base.generated, intro: "מבוא ".repeat(150), ravWord: "דבר הרב ".repeat(100), shabbatNote: "פרשה ".repeat(100) },
  enabled: { ...base.enabled, events: true, birthdays: true, restaurantAd: true, support: true },
  events: Array.from({ length: 4 }, (_, index) => ({ id: String(index), title: "אירוע", description: "פרטים", startDate: "2026-10-24T12:00:00Z", endDate: null, location: null, category: null })),
  birthdays: Array.from({ length: 5 }, (_, index) => ({ id: String(index), name: "שם", hebrewDate: "י חשוון", gregorianDate: "2026-10-24" })),
  photos: Array.from({ length: 4 }, (_, index) => ({ id: `photo-${index}`, name: "photo", url: "data:image/png;base64," })),
  posters: Array.from({ length: 3 }, (_, index) => ({ id: `poster-${index}`, name: "poster", url: "data:image/png;base64," })),
  partnerAds: [{ id: "partner", name: "partner", url: "data:image/png;base64," }],
};
const full = estimateNewsletterFill(overloaded);
assert.ok(full.percent > 100, `overloaded fixture should be red, got ${full.percent}%`);
assert.equal(full.sections.slice().sort((a, b) => b.percent - a.percent)[0]?.key, "posters");

assert.deepEqual(parseLayoutPreferences({ fontSize: 9, density: "tight", pageLimit: 3, deferredMediaIds: ["a", "a", "b"] }), { density: "tight", pageLimit: 3, deferredMediaIds: ["a", "b"] });
assert.equal(parseLayoutPreferences({ fontSize: 9.5 }).fontSize, 9.5);
// 3 pages is the maximum: legacy 4-page drafts are brought back to 3.
assert.equal(parseLayoutPreferences({ pageLimit: 4 }).pageLimit, 3);
assert.equal(parseLayoutPreferences({ pageLimit: 5 }).pageLimit, undefined);

// The gauge measures against the selected page count.
const onThreePages = estimateNewsletterFill({ ...overloaded, layout: { pageLimit: 3 } });
assert.ok(Math.abs(onThreePages.percent - full.percent * 2 / 3) <= 1, `3-page gauge should be 2/3 of the 2-page fill, got ${onThreePages.percent}% vs ${full.percent}%`);

async function main() {
  const he = JSON.parse(await readFile("messages/he.json", "utf8"));
  const fr = JSON.parse(await readFile("messages/fr.json", "utf8"));
  // The overflow UI is a single banner: one button, one alternative.
  const keys = ["bannerTitle", "bannerHelp", "addThirdPage", "shortenInstead", "shortenAction", "shortening", "fullTitle", "omitted", "deferHelp"];
  assert.deepEqual(Object.keys(fr.newsletter.overflow).sort(), [...keys].sort());
  assert.deepEqual(Object.keys(he.newsletter.overflow).sort(), [...keys].sort());
  const withoutIcuSyntax = (text: string) => text.replace(/\{count, plural,|\b(?:one|other) \{/g, "");
  for (const key of keys) assert.ok(!/[A-Za-zÀ-ÿ]{4}/.test(withoutIcuSyntax(he.newsletter.overflow[key])), `Hebrew overflow.${key} must not contain French`);
  console.log(`Newsletter overflow: normal ${normal.percent}%, overloaded ${full.percent}%, localization and layout preferences passed.`);
}

void main();
