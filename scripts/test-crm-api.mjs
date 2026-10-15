import assert from "node:assert/strict";
import { build } from "esbuild";

// Execute the real route handlers against an in-memory Supabase adapter. No live writes.
let user = { id: "user-a" };
let failure = false;
const members = [
  { id: "a", communityId: "community-a", displayName: "Ancien nom complet", firstName: null, lastName: null, email: "a@example.test", phone: "123", notes: "À préserver", address: "Rue A", optInEmail: false, optInWhatsapp: true, tags: ["Parents"], birthDate: "1990-01-01", birthAfterSunset: false, hebrewBirthDay: 4, hebrewBirthMonth: 10, hebrewBirthYear: 5750 },
  { id: "b", communityId: "community-b", displayName: "Autre communauté", phone: "456" },
];
globalThis.__crmTest = {
  session: { auth: { getUser: async () => ({ data: { user } }) } },
  admin: { from(table) {
    const filters = []; let update = null; let deleting = false; let range = null;
    const result = () => {
      if (table === "profiles") return { data: { communityId: "community-a" }, error: null };
      if (failure) return { data: null, error: { message: "offline" } };
      const row = members.find(row => filters.every(([key, value]) => row[key] === value));
      if (row && update) Object.assign(row, update);
      if (row && deleting) members.splice(members.indexOf(row), 1);
      return { data: row ? { ...row } : null, error: null };
    };
    const query = { select: () => query, order: () => query, range: (start, end) => { range = [start, end]; return query; }, eq: (key, value) => { filters.push([key, value]); return query; }, update: patch => { update = patch; return query; }, delete: () => { deleting = true; return query; }, maybeSingle: async () => result(), single: async () => result(), then: resolve => Promise.resolve(range ? { data: members.filter(row => filters.every(([key, value]) => row[key] === value)).slice(range[0], range[1] + 1), error: null } : result()).then(resolve) };
    return query;
  } },
};
const options = { bundle: true, write: false, platform: "node", format: "esm", plugins: [{ name: "api-fixtures", setup(build) {
  build.onResolve({ filter: /^(@\/lib\/supabase\/(server|admin)|next\/server)$/ }, args => ({ path: args.path, namespace: "mock" }));
  build.onLoad({ filter: /.*/, namespace: "mock" }, args => ({ contents: args.path === "next/server" ? "export const NextResponse = { json: (data, options) => Response.json(data, options) };" : args.path.endsWith("admin") ? "export const createAdminClient = () => globalThis.__crmTest.admin;" : "export const createClient = async () => globalThis.__crmTest.session;" }));
} }] };
const bundled = await build({ ...options, entryPoints: ["src/app/api/community/members/[id]/route.ts"] });
const api = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));
const patch = (id, body) => api.PATCH(new Request("http://localhost/api/community/members/" + id, { method: "PATCH", body: JSON.stringify(body) }), { params: Promise.resolve({ id }) });
const before = { ...members[0] };
assert.equal((await patch("a", { phone: "06 12", communityId: "community-b", optInEmail: true })).status, 200);
assert.deepEqual({ ...members[0], phone: before.phone, updatedAt: undefined }, { ...before, updatedAt: undefined });
assert.equal((await patch("b", { notes: "unauthorized" })).status, 404);
assert.equal(members[1].notes, undefined);
assert.equal((await patch("a", { firstName: "Élie" })).status, 200);
assert.equal(members[0].displayName, "Ancien nom complet");
assert.equal((await patch("a", { birthDate: "2023-02-29" })).status, 400);
assert.equal(members[0].birthDate, before.birthDate);
assert.equal((await patch("a", { email: "" })).status, 200);
assert.equal(members[0].email, null); assert.equal(members[0].notes, before.notes);
user = null;
assert.equal((await patch("a", { phone: "999" })).status, 401);
user = { id: "user-a" };
await api.DELETE(new Request("http://localhost"), { params: Promise.resolve({ id: "b" }) });
assert.equal(members.length, 2);
failure = true;
assert.equal((await api.DELETE(new Request("http://localhost"), { params: Promise.resolve({ id: "a" }) })).status, 500);
failure = false;
await api.DELETE(new Request("http://localhost"), { params: Promise.resolve({ id: "a" }) });
assert.equal(members.length, 1);
for (let index = 0; index < 1005; index++) members.push({ id: "batch-" + index, communityId: "community-a", displayName: "Test " + index });
const listBundle = await build({ ...options, entryPoints: ["src/app/api/community/members/route.ts"] });
const listApi = await import("data:text/javascript;base64," + Buffer.from(listBundle.outputFiles[0].text).toString("base64"));
const listed = await (await listApi.GET()).json();
assert.equal(listed.length, 1005);
assert.ok(listed.every(row => row.communityId === "community-a"));
delete globalThis.__crmTest;
console.log("PASS CRM API: authenticated PATCH/DELETE, cross-community denial, omissions preserved, explicit clearing, legacy name, invalid date, delete failure and GET over 1000 contacts.");
