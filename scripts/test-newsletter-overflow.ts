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

async function main() {
  const he = JSON.parse(await readFile("messages/he.json", "utf8"));
  assert.equal(he.newsletter.overflow.message, "התוכן לא נכנס בעלון דו־צדדי (2 עמודי A4). קצרו טקסט או הסירו תמונה/מודעה. שום טקסט לא נחתך ולא נמחק.");
  assert.ok(!/[A-Za-zÀ-ÿ]{4}/.test(he.newsletter.overflow.message), "Hebrew overflow message must not contain French");
  console.log(`Newsletter overflow: normal ${normal.percent}%, overloaded ${full.percent}%, localization and layout preferences passed.`);
}

void main();
