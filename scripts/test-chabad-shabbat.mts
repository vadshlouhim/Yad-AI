import assert from "node:assert/strict";
import { getUpcomingShabbatTimes, parseChabadShabbatWidget } from "../src/lib/automation/hebcal";

const fixture = String.raw`
  document.write('<div class="CLdate">Friday, October 16, 2026</div><div class="CLTime">Light Candles at <b>18:41</b></div>');
  document.write('<div class="CLdate">Shabbat, October 17, 2026</div><div class="CLTime">Shabbat Ends <b>19:44</b></div>');
`;

assert.deepEqual(parseChabadShabbatWidget(fixture), [
  { kind: "friday", date: "2026-10-16", time: "18:41" },
  { kind: "shabbat", date: "2026-10-17", time: "19:44" },
]);

const referenceDate = new Date("2026-10-16T12:00:00Z");
const paris = (await getUpcomingShabbatTimes({ city: "Paris", timezone: "Europe/Paris", date: referenceDate, count: 1 }))[0];
const lyon = (await getUpcomingShabbatTimes({
  city: "Lyon",
  latitude: 45.764,
  longitude: 4.8357,
  timezone: "Europe/Paris",
  date: referenceDate,
  count: 1,
}))[0];

assert.ok(paris, "Chabad.org doit retourner les horaires de Paris.");
assert.equal(paris.entry, "18:41");
assert.equal(paris.exit, "19:44");
assert.equal(paris.parasha, "Noa’h");
assert.equal(paris.hebrewDate, "6 'Hechvan 5787");
assert.match(paris.sourceUrl ?? "", /fr\.chabad\.org\/calendar\/candlelighting_cdo/);

assert.ok(lyon, "Chabad.org doit retourner les horaires de Lyon.");
assert.equal(lyon.entry, "18:35");
assert.equal(lyon.exit, "19:36");
assert.notEqual(lyon.entry, paris.entry, "La ville doit réellement personnaliser les horaires.");

console.log("Chabad.org + Loubavitch.fr : villes, horaires et libellés français validés.");
