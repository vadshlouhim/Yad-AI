import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildMemberPatch, cleanGroups, validCivilDate } from "../src/lib/contacts/member-patch";
import { birthdaySoon, matchesContact, type CommunityMember } from "../src/lib/contacts/crm";
import { ContactSaveQueue } from "../src/lib/contacts/save-queue";
import { getBirthdayOccurrence } from "../src/lib/contacts/hebrew-birthday";

const row: CommunityMember = { id: "one", displayName: "Élie Cohen", firstName: "Élie", lastName: "Cohen", phone: "+33123456789", email: "elie@example.test", city: "Créteil", notes: "Privé", address: "Rue A", tags: ["Bénévoles"], birthDate: "1990-01-01", birthAfterSunset: false, hebrewBirthDay: 4, hebrewBirthMonth: 10, hebrewBirthYear: 5750 };
const patch = buildMemberPatch({ ...row, optInEmail: false, optInWhatsapp: true }, { phone: "06 12 34 56 78", communityId: "other", optInEmail: true });
assert.deepEqual(Object.keys(patch).sort(), ["phone", "updatedAt"]);
assert.equal(patch.phone, "0612345678");
assert.equal(buildMemberPatch(row, { email: "" }).optInEmail, false);
assert.equal(buildMemberPatch(row, {}).birthDate, undefined);
assert.equal(buildMemberPatch(row, { lastName: "Lévy" }).displayName, "Élie Lévy");
assert.equal(buildMemberPatch({ ...row, displayName: "Rav Élie" }, { lastName: "Lévy" }).displayName, undefined);
assert.equal(buildMemberPatch({ ...row, firstName: null, lastName: null }, { firstName: "Élie" }).displayName, undefined);
assert.deepEqual(cleanGroups([" Parents ", "parents", "", "Bénévoles"]), ["Parents", "Bénévoles"]);
assert.throws(() => buildMemberPatch(row, { tags: "bad" }));
assert.throws(() => buildMemberPatch(row, { city: 42 }));
assert.throws(() => buildMemberPatch(row, { email: "invalid" }));
assert.equal(validCivilDate("2024-02-29"), true);
assert.equal(validCivilDate("2023-02-29"), false);
assert.throws(() => buildMemberPatch(row, { birthDate: "2023-02-29" }));
assert.throws(() => buildMemberPatch(row, { hebrewBirthDay: 12 }));
for (const sunset of [true, false]) for (const civil of ["1990-01-01", "2024-03-24", "2023-09-16", "2000-02-29"]) {
  const converted = buildMemberPatch(row, { birthDate: civil, birthAfterSunset: sunset });
  const back = buildMemberPatch(row, { hebrewBirthDay: converted.hebrewBirthDay, hebrewBirthMonth: converted.hebrewBirthMonth, hebrewBirthYear: converted.hebrewBirthYear, birthAfterSunset: sunset });
  assert.equal(back.birthDate, civil);
}
assert.equal(buildMemberPatch(row, { birthDate: null }).hebrewBirthYear, null);
assert.equal(buildMemberPatch(row, { hebrewBirthDay: "", hebrewBirthMonth: "", hebrewBirthYear: "" }).birthDate, null);
assert.throws(() => buildMemberPatch(row, { hebrewBirthDay: 12, hebrewBirthMonth: 13, hebrewBirthYear: 5783 }));
assert.ok(buildMemberPatch(row, { hebrewBirthDay: 12, hebrewBirthMonth: 13, hebrewBirthYear: 5784 }).birthDate);
assert.ok(matchesContact(row, "elie benevoles creteil"));
assert.ok(!matchesContact(row, "Privé"));
assert.ok(birthdaySoon(row, "civil", new Date("2025-12-20T12:00:00Z")));
const tishri = { ...row, hebrewBirthDay: 2, hebrewBirthMonth: 7, hebrewBirthYear: 5750 };
assert.ok(birthdaySoon(tishri, "hebrew", new Date("2024-09-20T12:00:00Z")));
for (const month of [12, 13]) {
  const birthday = { hebrewBirthDay: 15, hebrewBirthMonth: month, hebrewBirthYear: 5784 };
  const occurrence = getBirthdayOccurrence(birthday, 5785)!;
  assert.ok(birthdaySoon({ ...row, ...birthday }, "hebrew", new Date(`${occurrence.gregorianDate}T12:00:00Z`)));
}

async function queueTest() {
  const sent: MemberInputLike[] = [];
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let fail = true;
  let stored = row;
  let lastState: { pending: unknown[]; error: string | null } | undefined;
  const queue = new ContactSaveQueue(async (_id, input) => {
    sent.push(input); if (sent.length === 1) await gate;
    if (fail) throw new Error("offline");
    stored = { ...stored, ...input } as CommunityMember; return stored;
  }, (_id, state) => { lastState = state; });
  queue.enqueue(row.id, { phone: "1" }); queue.enqueue(row.id, { city: "Paris" });
  assert.equal(sent.length, 1); release(); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(lastState!.pending.length, 2); assert.equal(lastState!.error, "offline");
  fail = false; queue.retry(row.id); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(sent.length, 3); assert.equal(stored.phone, "1"); assert.equal(stored.city, "Paris"); assert.equal(lastState!.pending.length, 0);
}
type MemberInputLike = Record<string, unknown> | object;
const route = readFileSync("src/app/api/community/members/[id]/route.ts", "utf8");
assert.equal((route.match(/\.eq\("communityId", communityId\)/g) || []).length, 3);
assert.equal((route.match(/auth.getUser\(\)/g) || []).length, 2);
void queueTest().then(() => console.log("PASS CRM: partial writes, preserved names/consents, date roundtrips, Adar/year boundaries, search, ordered saves and retry; tenant predicates present."));
