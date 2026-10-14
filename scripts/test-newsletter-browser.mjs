import { build } from "esbuild";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";

// Set CHROME_PATH to a Chromium/headless-shell executable on other machines.
const chrome = process.env.CHROME_PATH;
if (!chrome) throw new Error("Set CHROME_PATH to a Chromium executable.");
const bundled = await build({
  stdin: { resolveDir: process.cwd(), contents: `
import { composeNewsletter } from './src/lib/newsletter/document-layout';
const check = (condition, message) => { if (!condition) throw new Error(message); };
const image = (id, width, height) => ({ id, name: id, url: 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '"><rect width="100%" height="100%" fill="#005572"/><text x="10" y="30" fill="white">' + id + '</text></svg>') });
const data = {
  community: { name: 'Beth Habad Vanves', city: 'Vanves', timezone: 'Europe/Paris', address: '10 rue de Paris', email: 'contact@example.org' },
  generated: { title: 'La newsletter', intro: 'Bienvenue dans notre communauté.', ravWord: 'Un message de paix et de partage. '.repeat(15), shabbatNote: 'Cette semaine, partageons un moment ensemble. '.repeat(8), eventIntro: 'Retrouvons-nous dimanche.', restaurantAd: '' },
  enabled: { ravWord: true, shabbat: true, photos: true, posters: true, parness: true, kiddush: true, events: true, birthdays: true, restaurantAd: true, seferHamitsvot: true },
  parnessText: 'Pour notre communauté', kiddushText: 'La famille Cohen', bannerPhotoUrl: '',
  events: [{ id: '1', title: 'Rencontre communautaire', startDate: '2026-10-18T10:00:00Z', description: 'Nous vous attendons nombreux.' }],
  birthdays: [{ name: 'David', hebrewDate: '10 Tichri' }],
  shabbat: { date: '2026-10-16', parasha: 'Noah', hebrewDate: '3 Hechvan', entry: '18:40', exit: '19:45' },
  seferHamitsvot: { date: '2026-10-17', dateLabel: 'samedi 17 octobre 2026', text: 'Texte témoin de l’étude, conservé intégralement. '.repeat(30), sourceUrl: 'https://www.loubavitch.fr/etude/sefer-hamitsvot' },
  photos: [], posters: [], partnerAds: []
};
(async () => {
  let cases = 0;
  let preview = '';
  for (const count of [0, 1, 4, 5, 8]) {
    for (const portrait of [false, true]) {
      data.photos = Array.from({length: count}, (_, i) => image('photo-' + i, portrait ? 300 : 600, portrait ? 600 : 300));
      data.posters = Array.from({length: count}, (_, i) => image('poster-' + i, i % 2 ? 600 : 300, i % 2 ? 300 : 600));
      data.partnerAds = Array.from({length: 3}, (_, i) => image('partner-' + i, 500, 200));
      const pages = await composeNewsletter(data);
      preview = pages.join('');
      check(pages.length <= 2, 'More than two pages');
      const root = document.createElement('div');
      root.innerHTML = pages.join('');
      document.body.append(root);
      const studyText = [...root.querySelectorAll('[data-newsletter-text="sefer-hamitsvot"]')].map(node => node.textContent).join('');
      check(studyText.includes(data.seferHamitsvot.text), 'Study text changed');
      check(root.textContent.includes('samedi 17 octobre 2026'), 'Missing Saturday date');
      for (const grid of root.querySelectorAll('[data-newsletter-content] > div')) {
        if (grid.style.display === 'grid') check(grid.firstElementChild?.textContent, 'Empty left column');
      }
      const images = [...root.querySelectorAll('img')];
      check(images.length === count * 2 + 3, 'Missing image');
      for (const img of images) {
        check(img.style.objectFit === 'contain', 'Cropped image');
        check(img.parentElement.querySelectorAll('img').length <= 4, 'Too many images per row');
        const source = [...data.photos, ...data.posters, ...data.partnerAds].find(item => item.name === img.alt);
        check(source && source.url === img.getAttribute('src'), 'Changed image');
      }
      for (const [id, value] of [['intro', data.generated.intro], ['rav', data.generated.ravWord], ['parasha', data.generated.shabbatNote]]) {
        const rendered = [...root.querySelectorAll('[data-newsletter-text="' + id + '"]')].map(node => node.textContent).join('');
        check(rendered === value, 'Changed text: ' + id);
      }
      root.remove();
      cases++;
    }
  }
  data.seferHamitsvot.date = '2026-10-16';
  let wrongDateRejected = false;
  try { await composeNewsletter(data); } catch { wrongDateRejected = true; }
  check(wrongDateRejected, 'Friday study must not be printed as Saturday study');
  document.body.textContent = 'PASS: ' + cases + ' browser layouts';
  if (location.search.includes('preview')) {
    document.body.innerHTML = preview;
    document.body.style.display = 'flex';
    document.body.style.gap = '12px';
  }
})().catch(error => { document.body.textContent = 'FAIL: ' + error.message; });
` }, bundle: true, write: false, platform: "browser", format: "iife",
});
const server = createServer((req, res) => {
  if (req.url === "/test.js") {
    res.setHeader("Content-Type", "application/javascript");
    res.end(bundled.outputFiles[0].text);
  } else {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end('<!doctype html><html><head><style>*{box-sizing:border-box}body{margin:0}</style></head><body>RUNNING<script src="/test.js"></script></body></html>');
  }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
try {
  const { stdout } = await promisify(execFile)(chrome, ["--headless", "--no-sandbox", "--disable-gpu", "--dump-dom", "--virtual-time-budget=30000", `http://127.0.0.1:${server.address().port}`], { windowsHide: true, timeout: 60000, maxBuffer: 4 * 1024 * 1024 });
  assert.match(stdout, /PASS: 10 browser layouts/, stdout);
  console.log("Newsletter: 10 real Chromium layouts passed (0–8 photos + 0–8 posters, portraits/landscapes, whole images and exact text, maximum two pages).");
  if (process.env.NEWSLETTER_SCREENSHOT) {
    await promisify(execFile)(chrome, ["--headless", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--window-size=1600,1130", "--virtual-time-budget=30000", `--screenshot=${process.env.NEWSLETTER_SCREENSHOT}`, `http://127.0.0.1:${server.address().port}/?preview`], { windowsHide: true, timeout: 60000 });
  }
} finally { server.close(); }
