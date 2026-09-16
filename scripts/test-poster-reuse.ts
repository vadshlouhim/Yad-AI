import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database.types";
import { mergePosterChanges, readPosterEditState } from "../src/lib/templates/edit-state";
import { getPosterSource, trustedCommunityLogo, logoEditInstructions } from "../src/lib/templates/edit-source";
import { buildFalPosterEditPrompt } from "../src/lib/templates/fal-edit";
import { getNextFriday, getUpcomingShabbatTimes } from "../src/lib/automation/hebcal";
import { resolveShabbatLocation } from "../src/lib/automation/city-location";
import { buildShabbatPosterChanges, buildShabbatCaption } from "../src/lib/automation/shabbat-poster";

async function main() {
  const previous = [
    { label: "Invité", currentText: "", newText: "Rav Cohen" },
    { label: "Heure", currentText: "", newText: "19:00" },
    { label: "Adresse", currentText: "", newText: "12 rue des Lilas" },
  ];
  const merged = mergePosterChanges(previous, [{ label: "Heure", currentText: "19:00", newText: "20:00" }]);
  assert.equal(merged.length, 3);
  assert.equal(merged[1].newText, "20:00");
  assert.equal(merged[2].newText, "12 rue des Lilas");
  assert.equal(previous[1].newText, "19:00", "Previous versions must stay immutable");
  assert.equal(mergePosterChanges(previous, [], ["Rav Cohen"]).length, 2);
  assert.equal(readPosterEditState(null), null, "Legacy images need visual analysis");

  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  const logo = "https://example.supabase.co/storage/v1/object/public/community-assets/ours/logo.png";
  assert.equal(trustedCommunityLogo(logo, "ours"), logo);
  assert.equal(trustedCommunityLogo(logo, "other"), null);
  assert.equal(trustedCommunityLogo("https://example.supabase.co.evil.test/logo.png", "ours"), null);
  assert.equal(trustedCommunityLogo("https://example.supabase.co/storage/v1/object/public/community-assets/ours/%2e%2e/other/logo.png", "ours"), null);
  assert.equal(trustedCommunityLogo("https://example.supabase.co/storage/v1/object/public/community-assets/ours/%2e%2e%2fother/logo.png", "ours"), null);
  assert.match(buildFalPosterEditPrompt([], { editInstructions: logoEditInstructions(logo) }), /official logo replacement/);

  const filters = new Map<string, unknown>();
  const builder = {
    select() { return this; },
    eq(key: string, value: unknown) { filters.set(key, value); return this; },
    async single() {
      return filters.get("communityId") === "ours" ? { data: { id: "image", templateId: "template", publicId: "generated-ai/ours/image.png" }, error: null } : { data: null, error: { message: "not found" } };
    },
  };
  const admin = { from() { return builder; } } as unknown as SupabaseClient<Database>;
  assert.equal((await getPosterSource(admin, "ours", "image"))?.id, "image");
  await assert.rejects(getPosterSource(admin, "other", "image"), /inaccessible/);
  await assert.rejects(resolveShabbatLocation(""), /ville/);
  await assert.rejects(resolveShabbatLocation("Paris", "Canada"), /pays/);
  assert.equal((await resolveShabbatLocation("Paris", "France")).timezone, "Europe/Paris");
  assert.equal((await resolveShabbatLocation("Montréal", "Canada")).timezone, "America/Toronto");

  const nearMidnight = new Date("2026-09-18T23:30:00Z");
  assert.equal(getNextFriday(nearMidnight, "Europe/Paris").toISOString().slice(0, 10), "2026-09-25");
  assert.equal(getNextFriday(nearMidnight, "America/New_York").toISOString().slice(0, 10), "2026-09-18");
  assert.equal(getNextFriday(new Date("2026-12-31T23:30:00Z"), "Europe/Paris").toISOString().slice(0, 10), "2027-01-01");

  const originalFetch = globalThis.fetch;
  let requestUrl = "";
  globalThis.fetch = async (input) => {
    requestUrl = String(input);
    return Response.json({ items: [
      { category: "candles", date: "2026-09-18T19:39:00+02:00" },
      { category: "parashat", date: "2026-09-19", title: "Haazinou", hdate: "8 Tichri 5787" },
      { category: "havdalah", date: "2026-09-19T20:46:00+02:00" },
      { category: "candles", date: "2026-09-20T19:35:00+02:00" },
      { category: "havdalah", date: "2026-09-21T20:42:00+02:00" },
      { category: "candles", date: "2026-09-25T19:24:00+02:00" },
      { category: "holiday", date: "2026-09-26", title: "Soukkot", hdate: "15 Tichri 5787", yomtov: true },
      { category: "candles", date: "2026-09-26T20:27:00+02:00" },
    ] });
  };
  try {
    const weeks = await getUpcomingShabbatTimes({ city: "Paris", date: new Date("2026-09-16T12:00:00Z"), count: 2 });
    assert.equal(weeks.length, 2, "Holiday weekday candles must not become a Shabbat");
    assert.equal(weeks[0].parasha, "Haazinou");
    assert.equal(weeks[0].exit, "20:46");
    assert.equal(weeks[1].parasha, "Soukkot", "Festival Shabbat must not keep last week's parasha");
    assert.equal(weeks[1].exit, "20:27");
    const query = new URL(requestUrl).searchParams;
    assert.equal(query.get("m"), "63");
    assert.equal(query.get("b"), "18");
    assert.equal(query.get("tzid"), "Europe/Paris");
    const fields = { structureName: "Beth Habad", city: "Paris", kiddouch: "Offert par la famille Lévy", officeTimes: "Office vendredi à 19:00" };
    const edits = buildShabbatPosterChanges(fields, weeks[1]);
    assert.equal(edits.find((change) => change.label === "parasha")?.newText, "Soukkot");
    assert.equal(edits.find((change) => change.label === "Kiddouch")?.newText, fields.kiddouch);
    assert.equal(edits.find((change) => change.label === "Offices")?.newText, fields.officeTimes);
    const caption = buildShabbatCaption(fields, weeks[1]);
    assert.match(caption, /Soukkot/);
    assert.doesNotMatch(caption, /Haazinou/);
    assert.match(caption, /Office vendredi/);
    await getUpcomingShabbatTimes({ latitude: 0, longitude: 0, timezone: "UTC", date: new Date("2026-09-16T12:00:00Z"), count: 1 });
    assert.equal(new URL(requestUrl).searchParams.get("longitude"), "0", "Zero coordinates must be accepted");
  } finally { globalThis.fetch = originalFetch; }
  console.log("Poster reuse, logo access, timezone boundaries and weekly Shabbat scenarios: passed");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
