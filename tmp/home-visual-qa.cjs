const { chromium } = require('C:/Users/chlom/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');
let browser;
(async () => {
  const out = path.resolve('tmp/home-qa');
  fs.mkdirSync(out, { recursive: true });
  browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const report = [];
  for (const width of [1440, 768, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.setDefaultTimeout(60000);
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.locator('.home-final').waitFor();
    await page.locator('.home-final').scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(out, `home-${width}.png`), fullPage: true, style: 'nextjs-portal { display: none !important; }' });
    const layout = await page.evaluate(() => ({
      width: innerWidth, documentWidth: document.documentElement.scrollWidth,
      faqVisible: getComputedStyle(document.querySelector('.home-faq')).display !== 'none',
      initialSecondarySources: [...document.querySelectorAll('.home-tool video')].map(v => v.getAttribute('src')),
      masterSrc: document.querySelector('.home-master-video').getAttribute('src'),
      tools: document.querySelectorAll('.home-tool').length,
      agents: document.querySelectorAll('.home-agent').length,
      bodyHeight: document.body.scrollHeight,
    }));
    if (layout.documentWidth > width || layout.tools !== 6 || layout.agents !== 5 || layout.initialSecondarySources.some(Boolean) || layout.masterSrc || layout.faqVisible !== (width >= 768)) throw new Error(JSON.stringify(layout));
    if (width < 1024) {
      await page.getByRole('button', { name: 'Ouvrir le menu', exact: true }).click();
      await page.getByRole('navigation', { name: 'Navigation mobile', exact: true }).waitFor();
      await page.keyboard.press('Escape');
      if (await page.locator('#home-mobile-menu').count()) throw new Error('Menu Escape failed');
    }
    if (width >= 768) {
      const question = page.getByRole('button', { name: 'Puis-je arrêter mon abonnement quand je veux ?' });
      await question.click();
      if (await question.getAttribute('aria-expanded') !== 'true') throw new Error('FAQ failed');
      await question.click();
    }
    await page.getByRole('button', { name: 'Découvrir Newsletter papier', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    const href = await page.getByRole('link', { name: 'Utiliser cet outil' }).getAttribute('href');
    if (href !== '/auth/register?callbackUrl=%2Fdashboard%2Fnewsletter') throw new Error('Callback drift: ' + href);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Découvrir Newsletter papier', exact: true }).waitFor();
    if (!await page.getByRole('button', { name: 'Découvrir Newsletter papier', exact: true }).evaluate(e => e === document.activeElement)) throw new Error('Focus restoration failed');
    await page.getByRole('button', { name: 'Découvrir Boutique en ligne', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    const shopHref = await page.getByRole('link', { name: 'Découvrir ce service' }).getAttribute('href');
    if (shopHref !== '/auth/register?callbackUrl=%2Fdashboard%2Fboutique') throw new Error('Shop callback drift');
    await page.keyboard.press('Escape');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.getByRole('button', { name: 'Découvrir Publier partout', exact: true }).hover();
    await page.waitForFunction(() => document.querySelector('.home-tool-publish video').paused === false);
    await page.getByRole('button', { name: 'Découvrir Newsletter papier', exact: true }).hover();
    await page.waitForFunction(() => document.querySelector('.home-tool-newsletter video').paused === false);
    const playing = await page.locator('.home-tool video').evaluateAll(videos => videos.filter(v => !v.paused).length);
    if (playing !== 1) throw new Error('Multiple previews: ' + playing);
    await page.mouse.move(1, 1);
    await page.locator('.home-final').scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    if (await page.locator('.home-tool video').evaluateAll(v => v.some(e => !e.paused))) throw new Error('Preview offscreen still playing');
    await page.locator('#demo').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => !document.querySelector('.home-master-video').paused, null, { timeout: 10000 }).catch(async error => {
      console.error('Master state', width, await page.locator('.home-master-video').evaluate(v => ({paused:v.paused,ready:v.readyState,error:v.error?.message,time:v.currentTime,rect:v.getBoundingClientRect().toJSON()})));
      throw error;
    });
    await page.getByRole('button', { name: 'Mettre la démonstration en pause', exact: true }).click();
    if (!await page.locator('.home-master-video').evaluate(v => v.paused)) throw new Error('Master pause failed');
    await page.getByRole('button', { name: 'Reprendre la démonstration', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('.home-master-video').paused);
    await page.setViewportSize({ width, height: 650 });
    await page.locator('.home-final').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('.home-master-video').paused);
    report.push({ layout, errors, previewActiveMaximum: playing, modalHref: href, interactions: 'menu, FAQ, modal, focus, previews, master pause/replay/offscreen' });
    await context.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
})().catch(async e => { console.error(e); await browser?.close(); process.exitCode = 1; });
