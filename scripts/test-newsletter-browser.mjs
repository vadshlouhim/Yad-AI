import { build } from "esbuild";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

// Optional artifacts use the application's actual html-to-image/jsPDF export path.
const chrome = process.env.CHROME_PATH;
if (!chrome) throw new Error("Set CHROME_PATH to a Chromium executable.");
const bundled = await build({
  entryPoints: ["scripts/fixtures/newsletter-layout-browser.js"],
  bundle: true, write: false, platform: "browser", format: "iife",
});
const artifactDir = process.env.NEWSLETTER_PDF_DIR;
if (artifactDir) await mkdir(artifactDir, { recursive: true });
const server = createServer(async (req, res) => {
  try {
    if (req.method === "POST" && artifactDir && ["/artifact/provided-a", "/artifact/provided-b"].includes(req.url)) {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      await writeFile(path.join(artifactDir, req.url.split("/").at(-1) + ".pdf"), Buffer.concat(chunks));
      res.end("ok");
    } else if (req.url === "/test.js") {
      res.setHeader("Content-Type", "application/javascript");
      res.end(bundled.outputFiles[0].text);
    } else {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end('<!doctype html><html><head><style>*{box-sizing:border-box}body{margin:0}</style></head><body>RUNNING<script src="/test.js"></script></body></html>');
    }
  } catch (error) { res.statusCode = 500; res.end(String(error)); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const url = "http://127.0.0.1:" + server.address().port;
const run = args => promisify(execFile)(chrome, ["--headless", "--no-sandbox", "--disable-gpu", "--virtual-time-budget=60000", ...args], { windowsHide: true, timeout: 60000, maxBuffer: 8 * 1024 * 1024 });
try {
  const { stdout } = await run(["--dump-dom", url]);
  assert.match(stdout, /PASS: 23 browser layouts/, stdout);
  console.log("Newsletter: 23 Chromium layouts passed; exact text, whole images, no overlap, consistent fonts, 0–8 images, two-page maximum.");
  if (process.env.NEWSLETTER_SCREENSHOT) {
    await run(["--hide-scrollbars", "--window-size=1600,1130", "--screenshot=" + process.env.NEWSLETTER_SCREENSHOT, url + "/?preview=" + (process.env.NEWSLETTER_CASE || "provided-a")]);
  }
  if (artifactDir) for (const fixture of ["provided-a", "provided-b"]) {
    const { stdout: pdfOutput } = await run(["--dump-dom", url + "/?pdf=" + fixture]);
    assert.ok(pdfOutput.includes("PDF PASS: " + fixture), pdfOutput);
    console.log("Exported " + path.join(artifactDir, fixture + ".pdf"));
  }
} finally { server.close(); }
