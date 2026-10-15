import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { readFile, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
import path from "node:path";
const chrome = process.env.CHROME_PATH;
if (!chrome) throw new Error("Set CHROME_PATH.");
const bundle = await build({ entryPoints: ["scripts/fixtures/newsletter-revision-browser.tsx"], bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' } });
const css = await postcss([tailwind()]).process(await readFile("src/app/globals.css", "utf8"), { from: path.resolve("src/app/globals.css") });
const server = createServer((req, res) => {
  if (req.url === "/test.js") { res.setHeader("Content-Type", "application/javascript"); res.end(bundle.outputFiles[0].text); }
  else if (req.url === "/test.css") { res.setHeader("Content-Type", "text/css"); res.end(css.css); }
  else { res.setHeader("Content-Type", "text/html; charset=utf-8"); res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/test.css"></head><body><div id="root"></div><script src="/test.js"></script></body></html>'); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${server.address().port}`;
const output = path.resolve("tmp/pdfs/newsletter-revision"); await mkdir(output, { recursive: true });
try {
  for (const width of [390, 1440]) {
    const args = ["--headless", "--no-sandbox", "--disable-gpu", "--virtual-time-budget=45000", `--window-size=${width},1000`];
    const result = await promisify(execFile)(chrome, [...args, "--dump-dom", url], { windowsHide: true, timeout: 60000, maxBuffer: 4 * 1024 * 1024 });
    assert.ok(result.stdout.includes("PASS NEWSLETTER REVISION UI"), result.stdout.match(/FAIL:[\s\S]*?<\/pre>/)?.[0] ?? result.stdout.slice(-1000));
    await promisify(execFile)(chrome, [...args, `--screenshot=${path.join(output, `editor-${width}.png`)}`, url + "?preview=1"], { windowsHide: true, timeout: 60000 });
    console.log(`PASS newsletter revision UI ${width}px`);
  }
} finally { server.close(); }
