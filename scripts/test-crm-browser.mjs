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
if (!chrome) throw new Error("Set CHROME_PATH to Chromium.");
const bundle = await build({ entryPoints: ["scripts/fixtures/crm-browser.tsx"], bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, plugins: [{ name: "next-test-adapter", setup(build) {
  build.onResolve({ filter: /^next\/(navigation|link)$/ }, args => ({ path: args.path, namespace: "mock" }));
  build.onLoad({ filter: /.*/, namespace: "mock" }, args => ({ contents: args.path.endsWith("navigation") ? 'export const usePathname=()=>"/dashboard/contacts"; export const useRouter=()=>({push(){}});' : 'import React from "react";export default function Link(props){return React.createElement("a",props)}', resolveDir: process.cwd() }));
} }] });
const css = await postcss([tailwind()]).process(await readFile("src/app/globals.css", "utf8"), { from: path.resolve("src/app/globals.css") });
const server = createServer((req, res) => {
  if (req.url === "/test.js") { res.setHeader("Content-Type", "application/javascript"); res.end(bundle.outputFiles[0].text); }
  else if (req.url === "/test.css") { res.setHeader("Content-Type", "text/css"); res.end(css.css); }
  else { res.setHeader("Content-Type", "text/html; charset=utf-8"); res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/test.css"></head><body><script src="/test.js"></script></body></html>'); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${server.address().port}`;
const output = path.resolve(".tmp/crm-review"); await mkdir(output, { recursive: true });
try {
  for (const width of [360, 390, 430, 1440]) {
    const args = ["--headless", "--no-sandbox", "--disable-gpu", "--virtual-time-budget=12000", `--window-size=${width},900`];
    const result = await promisify(execFile)(chrome, [...args, "--dump-dom", url], { windowsHide: true, timeout: 60000, maxBuffer: 4 * 1024 * 1024 });
    assert.ok(result.stdout.includes("PASS CRM BROWSER"), result.stdout.match(/FAIL:[\s\S]*?<\/pre>/)?.[0] ?? result.stdout.slice(-2500));
    await promisify(execFile)(chrome, [...args, `--screenshot=${path.join(output, `${width}.png`)}`, url + "?preview=1"], { windowsHide: true, timeout: 60000 });
    console.log(`PASS CRM Chromium ${width}px`);
  }
} finally { server.close(); }
