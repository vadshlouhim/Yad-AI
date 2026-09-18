const { chromium } = require('C:/Users/chlom/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const results = [];
    for (const width of [390, 768, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce', hasTouch: true });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.setDefaultTimeout(60000);
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 120000 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      for (const [id, kind] of [['home-functions-row', 'outils'], ['home-agents-row', 'agents']]) {
        const row = page.locator('#' + id);
        const overflow = await row.evaluate(e => e.scrollWidth > e.clientWidth + 1);
        const next = page.getByRole('button', { name: `Voir les ${kind} suivants`, exact: true });
        const previous = page.getByRole('button', { name: `Voir les ${kind} précédents`, exact: true });
        assert.equal(await next.count(), overflow ? 1 : 0);
        if (overflow) {
          assert(await previous.isDisabled());
          await next.click();
          await page.waitForFunction(id => { const e = document.getElementById(id); return e.scrollWidth - e.clientWidth - e.scrollLeft < 2; }, id);
          assert(await next.isDisabled());
          const lastVisible = await row.evaluate(e => { const a = e.getBoundingClientRect(); const b = e.lastElementChild.getBoundingClientRect(); return b.right <= a.right + 2 && b.left >= a.left - 2; });
          assert(lastVisible);
          await previous.click();
          await page.waitForFunction(id => document.getElementById(id).scrollLeft < 2, id);
          // A horizontal touch gesture remains supported alongside the buttons.
          const box = await row.boundingBox();
          await row.scrollIntoViewIfNeeded();
          const visibleBox = await row.boundingBox();
          const session = await page.context().newCDPSession(page);
          const startX = visibleBox.x + visibleBox.width * .8;
          const y = visibleBox.y + visibleBox.height / 2;
          await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: startX, y }] });
          for (let i = 1; i <= 8; i++) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: startX - visibleBox.width * .65 * i / 8, y }] });
          await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await page.waitForFunction(id => document.getElementById(id).scrollLeft > 1, id);
          await row.evaluate(e => e.scrollTo({ left: 0, behavior: 'instant' }));
        }
      }
      const tools = [
        ['publish','02-dovber-publier-partout','social-networks'],
        ['newsletter','04-levik-newsletter','newsletter'],
        ['automations','07-david-automatisations','automations'],
        ['posters','03-zalman-affiches','templates'],
        ['torah','08-shmouel-cours-torah','torah'],
      ];
      for (const [id, media, destination] of tools) {
        for (const type of ['tool', 'agent']) {
          const card = page.locator(`.home-${type}-${id}`);
          await card.click();
          const dialog = page.getByRole('dialog');
          await dialog.waitFor();
          const video = dialog.locator('video');
          await page.waitForFunction(() => { const v = document.querySelector('[role=dialog] video'); return v && v.readyState >= 2 && !v.paused; });
          assert.equal(await video.getAttribute('src'), `/media/home/${media}.mp4`);
          assert(await video.evaluate(v => v.muted && v.controls && v.playsInline && getComputedStyle(v).objectFit === 'contain'));
          assert.equal(await dialog.locator('a').count(), 2);
          const callback = encodeURIComponent('/dashboard/' + destination);
          assert.equal(await dialog.getByRole('link', { name: 'Utilisez cet outil', exact: true }).getAttribute('href'), '/auth/register?callbackUrl=' + callback);
          assert.equal(await dialog.getByRole('link', { name: 'Se connecter', exact: true }).getAttribute('href'), '/auth/login?callbackUrl=' + callback);
          assert.equal(await dialog.locator('p, ul, .home-preview').count(), 0);
          const player = await video.elementHandle();
          if (id === 'newsletter' && type === 'tool') await dialog.screenshot({ path: `tmp/home-qa/video-dialog-${width}.png` });
          if (type === 'agent') await dialog.getByRole('button', { name: 'Fermer la vidéo' }).click();
          else await page.keyboard.press('Escape');
          await dialog.waitFor({ state: 'detached' });
          assert(await player.evaluate(v => v.paused));
          assert(await card.evaluate(e => e === document.activeElement));
          await player.dispose();
        }
      }
      const shop = page.getByRole('link', { name: 'Découvrir Boutique en ligne', exact: true });
      assert.equal(await shop.getAttribute('href'), 'https://linktr.ee/Yadshlouhim');
      assert.equal(await shop.getAttribute('target'), null);
      await page.route('https://linktr.ee/Yadshlouhim', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Boutique publique</h1>' }));
      await shop.click();
      await page.waitForURL('https://linktr.ee/Yadshlouhim');
      assert.equal(await page.getByRole('dialog').count(), 0);
      assert.deepEqual(errors, []);
      results.push({ width, passed: true, videos: 10, navigation: true, touch: true, publicShop: true });
      console.log(JSON.stringify(results.at(-1)));
      await page.close();
    }
    fs.writeFileSync('tmp/home-qa/dialog-navigation-results.json', JSON.stringify(results, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
