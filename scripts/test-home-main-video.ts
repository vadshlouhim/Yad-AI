import assert from "node:assert/strict";
import { resolveHomeMainVideo } from "../src/lib/home-main-video";
import { FALLBACK_MAIN_VIDEO, MAIN_VIDEO_URL } from "../src/components/home/home-media";

async function main() {
  const originalFetch = globalThis.fetch;
  const originalNow = Date.now;
  const urls: string[] = [];
  let now = 100;
  Date.now = () => ++now;
  try {
    globalThis.fetch = async (input, options) => {
      urls.push(String(input));
      assert.equal(options?.cache, "no-store");
      assert.deepEqual(options?.headers, { Range: "bytes=0-31" });
      return new Response("\0\0\0\x18ftypisom", { status: 206, headers: { "Content-Type": "video/mp4" } });
    };
    assert.equal(await resolveHomeMainVideo(), MAIN_VIDEO_URL + "?v=101");
    assert.equal(await resolveHomeMainVideo(), MAIN_VIDEO_URL + "?v=102");
    assert.notEqual(urls[0], urls[1]);
    for (const response of [
      new Response("missing", { status: 404 }),
      new Response("login", { status: 200, headers: { "Content-Type": "text/html" } }),
      new Response("invalid", { status: 206, headers: { "Content-Type": "video/mp4" } }),
    ]) {
      globalThis.fetch = async () => response;
      assert.equal(await resolveHomeMainVideo(), FALLBACK_MAIN_VIDEO);
    }
    globalThis.fetch = async () => { throw new Error("Storage unavailable"); };
    assert.equal(await resolveHomeMainVideo(), FALLBACK_MAIN_VIDEO);
    console.log("Main video tests passed: fixed filename, fresh URLs, no-store, verified MP4, fallback on missing/invalid/unavailable file.");
  } finally {
    globalThis.fetch = originalFetch;
    Date.now = originalNow;
  }
}
void main();
