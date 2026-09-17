// HTTP payload checks, not a browser dashboard benchmark or a load-time measure.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const origin = process.argv[2] || "http://127.0.0.1:3100";
const source = readFileSync(new URL("../src/lib/agents.ts", import.meta.url), "utf8");
const portraits = source.match(/export const AGENT_IMAGE_URLS = \{([\s\S]*?)\} as const;/)?.[1];
assert.ok(portraits, "Agent portrait URL map must exist");
const paths = [...new Set([...portraits.matchAll(/"(\/agents\/[^"\s]+\.png)"/g)].map((match) => match[1]))];
const remote = source.match(/image: "(https:[^"]+)"/)?.[1];
if (remote) paths.push(remote);
let failed = false;
for (const src of paths) {
  try {
    const raw = await fetch(new URL(src, origin), { signal: AbortSignal.timeout(20000), cache: "no-store" });
    assert.equal(raw.status, 200, `original ${src}`);
    const rawBuffer = Buffer.from(await raw.arrayBuffer());
    const original = await sharp(rawBuffer).metadata();
    const samples = [];
    // Default srcset candidates for a 94px card at DPR 1, 2 and 3.
    // They also bound the sizes used by sidebar portraits up to DPR 3.
    for (const width of [96, 256, 384]) {
      const url = new URL("/_next/image", origin);
      url.searchParams.set("url", src);
      url.searchParams.set("w", String(width));
      url.searchParams.set("q", "75");
      const response = await fetch(url, {
        headers: { Accept: "image/webp" }, cache: "no-store", signal: AbortSignal.timeout(20000),
      });
      assert.equal(response.status, 200, `optimized ${src} at ${width}px`);
      assert.equal(response.headers.get("content-type"), "image/webp");
      const buffer = Buffer.from(await response.arrayBuffer());
      const metadata = await sharp(buffer).metadata();
      assert.equal(metadata.width, Math.min(width, original.width));
      assert.ok(Math.abs(metadata.height - metadata.width * original.height / original.width) <= 1);
      if (original.hasAlpha) assert.ok(metadata.hasAlpha, `alpha ${src}`);
      assert.ok(buffer.length < rawBuffer.length, `payload ${src}`);
      samples.push({ width: metadata.width, height: metadata.height, bytes: buffer.length, alpha: metadata.hasAlpha });
    }
    console.log(JSON.stringify({ src, originalBytes: rawBuffer.length, samples }));
  } catch (error) {
    failed = true;
    console.error(`${src}: ${error.message}`);
  }
}
if (failed) process.exitCode = 1;
