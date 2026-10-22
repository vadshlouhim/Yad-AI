import { build } from "esbuild";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { waitForNewsletterPdf } from "./lib/newsletter-pdf-browser.mjs";

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
    if (req.method === "POST" && artifactDir && ["/artifact/provided-a", "/artifact/provided-b", "/artifact/captions", "/artifact/hebrew-rtl"].includes(req.url)) {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      await writeFile(path.join(artifactDir, req.url.split("/").at(-1) + ".pdf"), Buffer.concat(chunks));
      res.end("ok");
    } else if (req.url === "/newsletter/challot-icon.png") {
      res.setHeader("Content-Type", "image/png");
      res.end(await readFile("public/newsletter/challot-icon.png"));
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
const run = args => promisify(execFile)(chrome, ["--headless", "--no-sandbox", "--disable-gpu", "--disable-background-timer-throttling", "--run-all-compositor-stages-before-draw", "--virtual-time-budget=120000", ...args], { windowsHide: true, timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
try {
  const { stdout } = await run(["--dump-dom", url]);
  assert.match(stdout, /PASS: \d+ browser layouts/, stdout);
  console.log(stdout.match(/PASS: [^<]*/)?.[0]);
  console.log("Newsletter: Chromium layouts passed, including Hebrew RTL; two-page output (or the extra pages the user added), whole articles, exact text/captions, bottom-anchored support, whole images, no overlap, consistent fonts, and readable posters.");
  if (process.env.NEWSLETTER_SCREENSHOT) {
    const pages = Number(process.env.NEWSLETTER_PAGES) || 2;
    await run(["--hide-scrollbars", `--window-size=${pages * 806},1130`, "--screenshot=" + process.env.NEWSLETTER_SCREENSHOT, url + "/?preview=" + (process.env.NEWSLETTER_CASE || "provided-a") + (pages > 2 ? "&pages=" + pages : "")]);
  }
  if (artifactDir) for (const fixture of (process.env.NEWSLETTER_PDF_CASES || "provided-a,provided-b,captions").split(",")) {
    const pdfOutput = await waitForNewsletterPdf(chrome, url + "/?pdf=" + fixture);
    assert.ok(pdfOutput.includes("PDF PASS: " + fixture), pdfOutput.match(/FAIL:[^<]*/)?.[0] || `PDF export did not finish: ${fixture}`);
    console.log("Exported " + path.join(artifactDir, fixture + ".pdf"));
  }
} finally { server.close(); }
