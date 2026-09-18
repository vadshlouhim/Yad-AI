const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/chlom/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    for (const width of [390, 768, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      await page.route('**/*', route => ['script', 'image', 'media', 'font'].includes(route.request().resourceType()) ? route.abort() : route.continue());
      await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.locator('.home-tool-publish').waitFor();
      await page.waitForFunction(() => getComputedStyle(document.querySelector('.home-tool-publish')).backgroundImage !== 'none', null, { timeout: 10000 });
      const gradient = await page.locator('.home-tool-publish').evaluate(e => getComputedStyle(e).backgroundImage);
      assert.equal(gradient, width < 768
        ? 'linear-gradient(130deg, rgb(34, 103, 223), rgb(7, 87, 204))'
        : 'linear-gradient(130deg, rgb(50, 126, 255), rgb(7, 87, 239))');
      assert(await page.locator('.home-tool').evaluateAll(es => es.every(e => getComputedStyle(e).backgroundImage.startsWith('linear-gradient(130deg,'))));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      console.log(JSON.stringify({ width, homePaletteUnchanged: true }));
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
