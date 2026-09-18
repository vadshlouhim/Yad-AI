const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const { compile } = require('@tailwindcss/node');
const { Scanner } = require('@tailwindcss/oxide');
const { chromium } = require('C:/Users/chlom/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright');

(async () => {
  const compiled = await compile(fs.readFileSync('src/app/globals.css', 'utf8'), { base: path.resolve('src/app'), onDependency() {} });
  const scanner = new Scanner({ sources: [{ base: process.cwd(), pattern: 'src/**/*.{ts,tsx,css}', negated: false }] });
  const css = compiled.build(scanner.scan()) + fs.readFileSync('src/components/presentation/home-tool-colors.css', 'utf8');
  const legacy = ['publish','newsletter-paper','contacts','visuals'];
  const fixtures = ['publish','newsletter-paper','automations','visuals'];
  let savedModules = legacy;
  const entry = `import React from 'react';import {createRoot} from 'react-dom/client';
    import {MobileMainMenuDialog} from './src/components/layout/mobile-main-menu-dialog';
    import {MobileDashboardHome} from './src/components/dashboard/mobile-dashboard-home';
    import {getOfficialDashboardMenuSections} from './src/components/layout/dashboard-nav';
    const close=()=>{window.qaClosed=true;};
    createRoot(document.getElementById('root')).render(location.pathname==='/menu'
      ? <MobileMainMenuDialog communityName="Communaut\u00e9 QA" sections={getOfficialDashboardMenuSections('synagogue')} onClose={close}/>
      : <MobileDashboardHome firstName="QA" userName="QA" communityName="QA" unreadNotifications={0}/>);`;
  const plugin = { name: 'isolated-router', setup(b) {
    b.onResolve({ filter: /^next\/(navigation|link|image)$/ }, args => ({ path: args.path, namespace: 'qa' }));
    b.onLoad({ filter: /.*/, namespace: 'qa' }, args => ({ loader: 'js', resolveDir: process.cwd(), contents: args.path === 'next/navigation'
      ? `export const useRouter=()=>({push:u=>window.qaNavigation=u,replace:u=>window.qaNavigation=u});export const usePathname=()=>'/dashboard/overview';export const useSearchParams=()=>new URLSearchParams(location.search);`
      : args.path === 'next/link'
        ? `import React from 'react';export default function Link({href,onClick,prefetch,children,...rest}){return React.createElement('a',{...rest,href,onClick:e=>{onClick?.(e);if(!e.defaultPrevented)window.qaNavigation=href;e.preventDefault();}},children);}`
        : `import React from 'react';export default function Image({fill,sizes,priority,preload,unoptimized,...props}){return React.createElement('img',props);}` }));
  }};
  const bundle = await build({ stdin: { contents: entry, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, platform: 'browser', jsx: 'automatic', alias: { '@': path.resolve('src') }, plugins: [plugin], define: { 'process.env.NODE_ENV': '"development"' } });
  const writes = [];
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/api/dashboard/mobile-home')) {
      res.setHeader('Content-Type', 'application/json');
      if (req.method === 'PUT') { let body = ''; req.on('data', c => body += c); req.on('end', () => { writes.push(JSON.parse(body)); res.end('{}'); }); }
      else res.end(JSON.stringify({ modules: savedModules }));
      return;
    }
    if (req.url.startsWith('/agents/')) { res.statusCode = 404; res.end(); return; }
    res.setHeader('Content-Type', 'text/html');
    res.end(`<html><head><style>${css}</style></head><body><div id="root"></div><script>${bundle.outputFiles[0].text}</script></body></html>`);
  });
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const results = [];
  try {
    for (const width of [320, 390, 767, 768]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(base + '/menu');
      const dialog = page.getByRole('dialog');
      if (width >= 768) {
        assert.equal(await dialog.isVisible(), false);
        await page.goto(base + '/home');
        await page.waitForSelector('[data-home-module]', { state: 'attached' });
        assert.equal(await page.locator('[data-home-module]').first().isVisible(), false);
      } else {
        await dialog.waitFor();
        assert.equal(await page.getByText('Maintenez un module', { exact: false }).count(), 0);
        for (const href of ['/dashboard/social-networks','/dashboard/newsletter','/dashboard/templates']) assert.equal(await dialog.locator(`a[href="${href}"]`).count(), 0);
        assert.equal(await dialog.locator('a[href="/dashboard/contacts"]').count(), 1);
        const shop = page.getByRole('button', { name: 'Boutique en ligne', exact: true });
        const assistance = page.getByRole('link', { name: 'Assistance indemnisation', exact: true });
        const a = await shop.boundingBox(), b = await assistance.boundingBox();
        assert(Math.abs(a.y - b.y) < 1 && a.x + a.width <= b.x && a.height >= 88 && a.height < 110 && b.height < 110);
        assert.equal(await shop.locator('svg').evaluate(e => getComputedStyle(e).width), '24px');
        assert.equal(await assistance.getAttribute('href'), '/dashboard/assistance-indemnisation-aerienne');
        const cards = await dialog.locator('button, a').evaluateAll(es => es.filter(e => /home-tool-/.test(e.className) && e.closest('.grid')).map(e => ({ background: getComputedStyle(e).backgroundImage, color: getComputedStyle(e).color })));
        assert(cards.length >= 11 && cards.every(c => c.background.startsWith('linear-gradient(130deg,')));
        assert.equal(await shop.evaluate(e => getComputedStyle(e).color), 'rgb(36, 17, 79)');
        await dialog.screenshot({ path: `tmp/home-qa/dashboard-menu-${width}.png` });
        await shop.click();
        const submenu = await dialog.locator('a').count();
        assert(submenu > 0);
        await page.getByRole('button', { name: 'Retour aux autres outils', exact: true }).click();
        await assistance.click();
        assert.equal(await page.evaluate(() => window.qaNavigation), '/dashboard/assistance-indemnisation-aerienne');
        assert.equal(await page.evaluate(() => window.qaClosed), true);
        await page.goto(base + '/home');
        await page.waitForSelector('[data-home-module]');
        assert.deepEqual(await page.locator('[data-home-module]').evaluateAll(es => es.map(e => e.dataset.homeModule)), fixtures);
        const palette = await page.locator('[data-home-module]').evaluateAll(es => es.map(e => ({ key: e.dataset.homeModule, bg: getComputedStyle(e).backgroundColor, gradient: getComputedStyle(e).backgroundImage })));
        assert.deepEqual(palette.map(c => c.gradient), [
          'linear-gradient(130deg, rgb(34, 103, 223), rgb(7, 87, 204))',
          'linear-gradient(130deg, rgb(137, 64, 232), rgb(99, 23, 207))',
          'linear-gradient(130deg, rgb(199, 69, 56), rgb(185, 48, 42))',
          'linear-gradient(130deg, rgb(206, 40, 135), rgb(188, 21, 106))'
        ]);
        assert(await page.locator('[data-home-module]').evaluateAll(es => es.every(e => getComputedStyle(e).color === 'rgb(255, 255, 255)')));
        await page.locator('[data-home-module="automations"]').click();
        assert.equal(await page.evaluate(() => window.qaNavigation), '/dashboard/automations');
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.screenshot({ path: `tmp/home-qa/dashboard-home-${width}.png`, fullPage: true });
        assert.equal(writes.length, 0);
        await page.goto(base + '/home?addModule=shop&edit=1');
        await page.getByRole('button', { name: 'Terminé', exact: true }).waitFor();
        assert.deepEqual(writes.at(-1)?.modules, [...fixtures,'shop']);
        await page.getByRole('button', { name: 'Retirer Boutique & articles', exact: true }).click();
        assert.deepEqual(writes.at(-1)?.modules, fixtures);
        await page.getByRole('button', { name: 'Annuler', exact: true }).click();
        await page.waitForSelector('[data-home-module="shop"]');
        assert.deepEqual(writes.at(-1)?.modules, [...fixtures,'shop']);
        writes.length = 0;
        savedModules = ['contacts','torah','publish'];
        await page.goto(base + '/home');
        await page.waitForFunction(() => document.querySelector('[data-home-module]')?.dataset.homeModule === 'contacts');
        assert.deepEqual(await page.locator('[data-home-module]').evaluateAll(es => es.map(e => e.dataset.homeModule)), savedModules);
        assert.equal(writes.length, 0);
        savedModules = legacy;
      }
      assert.deepEqual(errors, []);
      results.push({ width, passed: true });
      console.log(JSON.stringify(results.at(-1)));
      await page.close();
    }
    fs.writeFileSync('tmp/home-qa/dashboard-colors-results.json', JSON.stringify(results, null, 2));
  } finally { await browser.close(); await new Promise(ok => server.close(ok)); }
})().catch(e => { console.error(e); process.exitCode = 1; });
