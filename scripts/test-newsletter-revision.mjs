import assert from "node:assert/strict";
import { build } from "esbuild";

const bundle = async entry => {
  const result = await build({ entryPoints: [entry], bundle: true, write: false, platform: "node", format: "esm", plugins: [{ name: "revision-fixtures", setup(build) {
    build.onResolve({ filter: /^(@\/lib\/(supabase\/(server|admin)|billing|ai\/engine)|next\/server)$/ }, args => ({ path: args.path, namespace: "mock" }));
    build.onLoad({ filter: /.*/, namespace: "mock" }, args => ({ contents: args.path === "next/server" ? "export const NextResponse={json:(data,options)=>Response.json(data,options)}" : args.path.endsWith("server") ? "export const createClient=async()=>globalThis.__newsletter.session" : args.path.endsWith("admin") ? "export const createAdminClient=()=>globalThis.__newsletter.admin" : args.path.endsWith("billing") ? "export const assertPaidFeature=async()=>globalThis.__newsletter.access" : "export const generateContent=async(params)=>{globalThis.__newsletter.params=params;return {body:globalThis.__newsletter.answer}}" }));
  } }] });
  return import("data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text).toString("base64"));
};
let user = { id: "user-one" }, saved = null;
globalThis.__newsletter = {
  session: { auth: { getUser: async () => ({ data: { user } }) } }, access: { ok: true }, answer: JSON.stringify({ changes: {}, layout: { photoSide: "back" } }),
  admin: { from(table) {
    const filters = []; let mutation = null;
    const result = () => {
      if (table === "profiles") return { data: { communityId: "own-community" }, error: null };
      assert.ok(filters.some(([key, value]) => key === "communityId" && value === "own-community") || mutation?.communityId === "own-community", "tenant scope");
      if (mutation) { saved = { ...saved, ...mutation }; return { data: { updatedAt: saved.updatedAt }, error: null }; }
      return { data: saved ? [saved] : [], error: null };
    };
    const query = { select: () => query, eq: (key, value) => { filters.push([key, value]); return query; }, order: () => query, limit: () => query, insert: value => { mutation = value; return query; }, update: value => { mutation = value; return query; }, single: async () => result(), maybeSingle: async () => result(), then: resolve => Promise.resolve(result()).then(resolve) };
    return query;
  } },
};
const api = await bundle("src/app/api/newsletter/revise/route.ts");
const request = body => new Request("http://localhost", { method: "POST", body: JSON.stringify(body) });
const body = { instructions: "Mets les photos au verso", texts: { ravWord: "Texte exact à conserver." }, editableFields: [], communityId: "other" };
assert.equal((await api.POST(request(body))).status, 200);
assert.equal(globalThis.__newsletter.params.communityId, "own-community");
globalThis.__newsletter.answer = JSON.stringify({ changes: { ravWord: "Changé" }, layout: {} });
assert.equal((await api.POST(request(body))).status, 422);
assert.equal((await api.POST(request({ ...body, editableFields: ["ravWord"], instructions: "Raccourcis le Mot du Rav" }))).status, 200);
globalThis.__newsletter.answer = "réponse invalide";
assert.equal((await api.POST(request(body))).status, 502);
assert.equal((await api.POST(request({ ...body, instructions: "" }))).status, 400);
user = null; assert.equal((await api.POST(request(body))).status, 401); user = { id: "user-one" };
globalThis.__newsletter.access = { ok: false, response: Response.json({ error: "Abonnement requis" }, { status: 403 }) };
assert.equal((await api.POST(request(body))).status, 403);

const draftApi = await bundle("src/app/api/newsletter/draft/route.ts");
const draft = { version: 1, title: "Feuillet", generated: { ravWord: "Texte exact" }, photos: [{ id: "one", url: "https://example.test/photo.jpg", caption: "Kermesse", captionGroup: "school", groupCaption: "Les enfants de l’école" }], layout: { photoSide: "back", order: ["parasha", "rav"] }, previousRevision: { generated: { ravWord: "Texte précédent" }, photos: [] } };
assert.equal((await draftApi.PUT(request({ draft, expectedUpdatedAt: null }))).status, 201);
assert.deepEqual((await (await draftApi.GET()).json()).draft, draft);
assert.equal((await draftApi.PUT(request({ draft, expectedUpdatedAt: null }))).status, 409);
assert.equal((await draftApi.PUT(request({ draft: { ...draft, title: "Nouvelle version" }, expectedUpdatedAt: saved.updatedAt }))).status, 200);
delete globalThis.__newsletter;
console.log("PASS newsletter revision: auth, subscription, tenant context, protected texts, explicit rewriting, malformed AI, captions/layout/undo draft roundtrip and conflict protection (mock database).");
