/* global document, location, DOMParser */
import { composeNewsletter, composeNewsletterWithReport } from '../../src/lib/newsletter/document-layout';
import { newsletterLayoutCases, baseNewsletter } from './newsletter-layout-cases';
import { formatKiddushSponsor } from '../../src/lib/newsletter/kiddush';
const check = (condition, message) => { if (!condition) throw new Error(message); };
const cases = newsletterLayoutCases();
const params = new URLSearchParams(location.search);
const selected = params.get('preview') || params.get('pdf');
const expectedOverflow = new Set(['provided-b', 'extreme-proportions', 'ai-reordered']);
const sources = data => [...(data.enabled.photos ? data.photos : []), ...(data.enabled.posters ? data.posters : []), ...(data.enabled.restaurantAd ? data.partnerAds : [])];
function validate(data, pages, name) {
  const pageLimit = data.layout?.pageLimit || 2;
  check(pageLimit === 2 ? pages.length === 2 : pages.length >= 2 && pages.length <= pageLimit, name + ': the print contract is two A4 pages, or the extra pages the user added');
  const root = document.createElement('div'); root.innerHTML = pages.join(''); document.body.append(root);
  const textIds = [...root.querySelectorAll('[data-newsletter-text]')].map(node => node.dataset.newsletterText);
  check(new Set(textIds).size === textIds.length, name + ': article split between zones or pages');
  check(![...root.querySelectorAll('h2')].some(node => node.textContent.includes('— suite')), name + ': continuation label');
  for (const photo of data.photos) if (photo.caption) check(root.querySelector('[data-photo-caption="' + photo.id + '"]')?.textContent === photo.caption, name + ': missing caption');
  for (const group of new Set(data.photos.map(photo => photo.captionGroup).filter(Boolean))) {
    const nodes = root.querySelectorAll('[data-photo-group-caption="' + group + '"]');
    check(nodes.length === 1 && nodes[0].textContent === data.photos.find(photo => photo.captionGroup === group).groupCaption, name + ': group caption repeated/missing');
  }
  const text = id => [...root.querySelectorAll('[data-newsletter-text="' + id + '"]')].map(node => node.textContent).join('');
  check(text('intro') === data.generated.intro, name + ': introduction changed');
  if (data.enabled.ravWord) check(text('rav') === data.generated.ravWord, name + ': Rav text changed');
  if (data.enabled.shabbat) {
    check(text('parasha') === data.generated.shabbatNote, name + ': Paracha text changed or omitted');
  }
  if (data.enabled.seferHamitsvot) {
    check(text('sefer-hamitsvot') === data.seferHamitsvot.dateLabel + (data.shabbat?.hebrewDate ? ' · ' + data.shabbat.hebrewDate : '') + '\n\n' + data.seferHamitsvot.text + '\n\n' + data.seferHamitsvot.sourceLabel, name + ': study text changed');
    if (data.outputLocale === 'he') check(data.seferHamitsvot.text.length <= 1000, name + ': Hebrew study exceeds 1,000 characters');
  }
  if (data.enabled.parness) check(text('dedications').includes(data.parnessText), name + ': missing dedication');
  if (data.enabled.kiddush) {
    check(text('dedications').includes(formatKiddushSponsor(data.kiddushText)), name + ': missing kiddush');
    check(root.querySelector('[data-newsletter-decoration="challot"]'), name + ': missing challot illustration');
  }
  if (data.enabled.support) {
    check(text('support').includes(data.community.donationUrl), name + ': missing support');
    const articles = [...root.querySelectorAll('article')];
    const support = root.querySelector('[data-newsletter-text="support"]');
    const supportZone = support?.closest('[data-newsletter-zone]');
    const content = articles.at(-1)?.querySelector('[data-newsletter-content]');
    check(support?.closest('article') === articles.at(-1), name + ': support is not on the last page');
    const bottomGap = supportZone && content ? content.getBoundingClientRect().bottom - supportZone.getBoundingClientRect().bottom : Infinity;
    check(Math.abs(bottomGap) <= 1, name + ': support is not anchored at the bottom (' + bottomGap + 'px)');
  }
  if (data.enabled.events) for (const event of data.events) {
    const date = new Intl.DateTimeFormat(data.outputLocale === 'he' ? 'he-IL' : 'fr-FR', { dateStyle: 'full', timeStyle: 'short', timeZone: data.community.timezone }).format(new Date(event.startDate));
    check(text('event-' + event.id) === [date, event.location, event.description].filter(Boolean).join('\n'), name + ': event text changed');
  }
  for (const [id, items] of [['photos', data.photos], ['posters', data.posters], ['partners', data.partnerAds]]) {
    const rendered = [...root.querySelectorAll('[data-gallery="' + id + '"] img')].map(img => img.alt);
    check(JSON.stringify(rendered) === JSON.stringify(items.map(item => item.name)), name + ': reordered or duplicated images');
  }
  const originals = sources(data);
  const images = [...root.querySelectorAll('[data-newsletter-content] img:not([data-newsletter-decoration])')];
  check(images.length === originals.length, name + ': missing image');
  for (const img of images) {
    const source = originals.find(item => item.name === img.alt);
    check(source && source.url === img.getAttribute('src'), name + ': changed image');
    check(img.style.objectFit === 'contain', name + ': cropped image');
    const rowLimit = img.closest('[data-gallery="posters"]') ? 2 : 4;
    check(img.closest('[data-image-row]').querySelectorAll('img').length <= rowLimit, name + ': too many images per row');
    const svg = new DOMParser().parseFromString(decodeURIComponent(source.url.split(',')[1]), 'image/svg+xml').documentElement;
    const ratio = Number(svg.getAttribute('width')) / Number(svg.getAttribute('height'));
    check(Math.abs(parseFloat(img.style.width) / parseFloat(img.style.height) - ratio) < 0.001, name + ': deformed image');
  }
  for (const page of root.querySelectorAll('article')) {
    const content = page.querySelector('[data-newsletter-content]');
    const bounds = content.getBoundingClientRect();
    const zones = [...content.querySelectorAll('[data-newsletter-zone]')];
    const rects = zones.map(node => node.getBoundingClientRect());
    for (const [i, rect] of rects.entries()) {
      check(rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1 && rect.bottom <= bounds.bottom + 1, name + ': zone overflow');
      for (const other of rects.slice(i + 1)) check(
        Math.min(rect.right, other.right) - Math.max(rect.left, other.left) <= 1 ||
        Math.min(rect.bottom, other.bottom) - Math.max(rect.top, other.top) <= 1, name + ': overlapping zones');
    }
    if (zones.length) {
      const firstY = Math.min(...rects.map(r => r.top));
      check(rects.some(r => Math.abs(r.left - bounds.left) < 1 && Math.abs(r.top - firstY) < 1), name + ': empty left column');
    }
    const sizes = [...content.querySelectorAll('[data-newsletter-text]')].map(n => parseFloat(n.style.fontSize) * 3 / 4);
    check(sizes.every(size => size >= 8 && size <= 12), name + ': body font outside range');
    check(Math.max(...sizes) - Math.min(...sizes) <= 1 || !sizes.length, name + ': inconsistent body type');
  }
  for (const frame of root.querySelectorAll('[data-gallery-frame]')) {
    check(!frame.style.background.includes('gradient'), name + ': gallery gradient must not be used');
    check(frame.querySelectorAll(':scope > span').length >= 2, name + ': modern gallery decorations missing');
  }
  check([...root.querySelectorAll('[data-gallery="posters"] img')].every(img =>
    Math.min(img.getBoundingClientRect().width, img.getBoundingClientRect().height) >= 179), name + ': poster below hard readability size');
  if (name === 'single-article') {
    const article = root.querySelector('[data-block-id="rav"]');
    check(article.getBoundingClientRect().width > 600, 'Single article must use full width');
  }
  if (name === 'provided-a' || name === 'provided-b') {
    const front = root.querySelector('article');
    check(front.querySelector('[data-block-id="rav"]') && front.querySelector('[data-block-id="parasha"]'), name + ': editorial priority');
    const notice = root.querySelector('[data-newsletter-text="support"]').closest('[data-newsletter-notice]');
    check(notice && notice.getBoundingClientRect().height < 200, name + ': oversized support');
    check([...root.querySelectorAll('article')].every(page => Number(page.dataset.bodyFont) >= 10), name + ': unnecessarily small body type');
    const posterArea = Math.max(...[...root.querySelectorAll('[data-gallery="posters"] img')].map(img => img.getBoundingClientRect().width * img.getBoundingClientRect().height));
    const photoArea = Math.max(...[...root.querySelectorAll('[data-gallery="photos"] img')].map(img => img.getBoundingClientRect().width * img.getBoundingClientRect().height));
    check(posterArea >= photoArea, name + ': poster is not prioritized over photos');
  }
  root.remove();
}
(async () => {
  let total = 0;
  // ?preview=<case>&pages=3 renders a case with extra pages for visual review.
  const previewPages = Number(params.get('pages')) || 0;
  for (const fixture of cases.filter(c => (!selected || c.name === selected) && (previewPages || !expectedOverflow.has(c.name)))) {
    if (previewPages) fixture.data.layout = { ...(fixture.data.layout || {}), pageLimit: previewPages };
    const pages = await composeNewsletter(fixture.data).catch(error => { throw new Error(fixture.name + ': ' + error.message); });
    validate(fixture.data, pages, fixture.name);
    total++;
    if (selected) {
      document.body.innerHTML = pages.join('');
      await Promise.all([...document.images].map(img => img.decode()));
      if (params.has('pdf')) {
        const [{ toPng }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')]);
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
        let snapshot = document.createElement('div');
        const markup = [...document.querySelectorAll('article')].map(article => article.outerHTML);
        for (const [i, html] of markup.entries()) {
          snapshot.remove();
          snapshot = document.createElement('div');
          Object.assign(snapshot.style, { position: 'fixed', left: '-30000px', top: '0', width: '794px', pointerEvents: 'none' });
          snapshot.innerHTML = html;
          document.body.append(snapshot);
          window.scrollTo(0, 0);
          const page = snapshot.firstElementChild;
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const png = await toPng(page, {
            pixelRatio: 2,
            width: 794,
            height: 1123,
            backgroundColor: '#faf7f0',
            style: { boxSizing: 'border-box', width: '794px', minWidth: '794px', maxWidth: '794px', height: '1123px', minHeight: '1123px', margin: '0' },
          });
          if (i) pdf.addPage('a4', 'portrait');
          pdf.addImage(png, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), undefined, 'FAST');
        }
        const response = await fetch('/artifact/' + selected, { method: 'POST', body: pdf.output('arraybuffer') });
        check(response.ok, 'PDF artifact write failed');
        document.body.textContent = 'PDF PASS: ' + selected;
      } else {
        document.body.style.display = 'flex'; document.body.style.gap = '12px';
      }
      return;
    }
  }
  // Overflowing sheets: automatic tightening may keep them on 2 pages; otherwise the
  // single extra page offered to the user keeps the full composed layout.
  const extendedSummary = [];
  for (const fixture of cases.filter(c => expectedOverflow.has(c.name))) {
    const tightened = await composeNewsletterWithReport(fixture.data).catch(() => null);
    if (tightened) {
      check(tightened.pages.length === 2 && !tightened.omittedMediaIds.length, fixture.name + ': automatic tightening must keep every visual on one recto-verso sheet');
      validate(fixture.data, tightened.pages, fixture.name + ' (tightened, 2 pages)');
      extendedSummary.push(fixture.name + '=2p');
      total++;
      continue;
    }
    const extended = structuredClone(fixture.data);
    extended.layout = { ...(fixture.data.layout || {}), pageLimit: 3 };
    const report = await composeNewsletterWithReport(extended).catch(() => null);
    check(report, fixture.name + ': adding a 3rd page must resolve the overflow');
    check(report.pages.length === 3, fixture.name + ': extra page requested but not used');
    check(report.omittedMediaIds.length === 0, fixture.name + ': the 3rd page must hold every visual');
    check(report.pages.every(html => !html.includes('data-composition="overflow-page"')), fixture.name + ': extra pages must use the composed layout');
    validate(extended, report.pages, fixture.name + ' (3 pages)');
    extendedSummary.push(fixture.name + '=3p');
    total++;
  }
  // Grow provided-b one visual at a time beyond 3 pages: composition never fails, the last visuals are set aside.
  const heavy = structuredClone(cases.find(c => c.name === 'provided-b').data);
  const pool = [...heavy.posters, ...heavy.photos];
  heavy.layout = { ...(heavy.layout || {}), pageLimit: 3 };
  let heavyReport = await composeNewsletterWithReport(heavy);
  for (let i = 0; !heavyReport.omittedMediaIds.length; i++) {
    check(i < 24, 'heavy fixture never exceeded 3 pages');
    const source = pool[i % pool.length];
    const copy = { ...source, id: source.id + '-copy' + i, name: source.name + ' copy ' + i };
    if (heavy.posters.includes(source) || source.poster) heavy.posters.push(copy); else heavy.photos.push(copy);
    heavyReport = await composeNewsletterWithReport(heavy).catch(error => { throw new Error('heavy (3 pages): ' + error.message); });
  }
  check(heavyReport.pages.length === 3, 'heavy fixture must stay on 3 pages');
  const heavyOnTwo = { ...heavy, layout: { ...heavy.layout, pageLimit: 2 } };
  check(!(await composeNewsletterWithReport(heavyOnTwo).catch(() => null)), 'heavy content on 2 pages must offer a 3rd page instead of dropping visuals');
  check(heavyReport.omittedMediaIds[0] === heavy.posters.at(-1).id, 'the last poster must be the first visual set aside');
  const kept = { ...heavy, posters: heavy.posters.filter(item => !heavyReport.omittedMediaIds.includes(item.id)), photos: heavy.photos.filter(item => !heavyReport.omittedMediaIds.includes(item.id)), partnerAds: heavy.partnerAds.filter(item => !heavyReport.omittedMediaIds.includes(item.id)) };
  validate(kept, heavyReport.pages, 'heavy (3 pages, ' + heavyReport.omittedMediaIds.length + ' visual(s) set aside)');
  extendedSummary.push('heavy=3p/-' + heavyReport.omittedMediaIds.length + 'visual');
  total++;
  // A single article taller than a page cannot be laid out whole: on 3 pages the flowing
  // safety net takes over instead of failing, without cutting a word or dropping a visual.
  for (const locale of ['fr', 'he']) {
    const oversized = baseNewsletter();
    oversized.outputLocale = locale;
    oversized.generated.ravWord = locale === 'he' ? 'דבר תורה ארוך מאוד לשבת. '.repeat(320) : 'Un très long mot du Rav pour Chabbat. '.repeat(160);
    check(!(await composeNewsletterWithReport(oversized).catch(() => null)), locale + ': an oversized article on 2 pages must offer a 3rd page');
    oversized.layout = { ...(oversized.layout || {}), pageLimit: 3 };
    const flow = await composeNewsletterWithReport(oversized).catch(error => { throw new Error(locale + ' oversized (3 pages): ' + error.message); });
    check(flow.flowFallback && flow.oversizedBlocks.includes('rav'), locale + ': the flowing safety net must report the oversized article');
    check(flow.pages.length >= 3 && !flow.omittedMediaIds.length, locale + ': the safety net keeps every visual');
    const flowRoot = document.createElement('div'); flowRoot.innerHTML = flow.pages.join(''); document.body.append(flowRoot);
    const ravText = [...flowRoot.querySelectorAll('[data-newsletter-text="rav"]')].map(node => node.textContent).join('');
    check(ravText === oversized.generated.ravWord, locale + ': the safety net must keep every word of the article');
    const continuation = [...flowRoot.querySelectorAll('h2')].map(node => node.textContent).filter(text => /— (suite|המשך)$/.test(text));
    check(continuation.length && continuation.every(text => text.endsWith(locale === 'he' ? '— המשך' : '— suite')), locale + ': continuation label must be localized');
    check([...flowRoot.querySelectorAll('article')].every(page => {
      const content = page.querySelector('[data-newsletter-content]').getBoundingClientRect();
      return [...page.querySelectorAll('[data-newsletter-content] section')].every(section => section.getBoundingClientRect().bottom <= content.bottom + 1);
    }), locale + ': the safety net must not overflow the printable area');
    flowRoot.remove();
    extendedSummary.push(locale + '-oversized=' + flow.pages.length + 'p/flow');
    total++;
  }
  const legacy = baseNewsletter(); legacy.layout = { pageLimit: 4 };
  check((await composeNewsletter(legacy)).length === 2, 'short content must stay on one recto-verso sheet even when a legacy 4-page draft allows more');
  const wrong = baseNewsletter(); wrong.seferHamitsvot.date = '2026-10-16';
  let rejected = false;
  try { await composeNewsletter(wrong); } catch { rejected = true; }
  check(rejected, 'Friday study must not be printed as Saturday study');
  const wrongHebrew = baseNewsletter();
  wrongHebrew.outputLocale = 'he';
  wrongHebrew.seferHamitsvot.date = '2026-10-16';
  wrongHebrew.studyUnavailableMessage = 'לא ניתן היה לטעון את לימוד השבת.';
  let hebrewError = '';
  try { await composeNewsletter(wrongHebrew); } catch (error) { hebrewError = error?.message || String(error); }
  check(hebrewError === wrongHebrew.studyUnavailableMessage, 'Hebrew study error must not surface in French');
  const impossible = baseNewsletter(); impossible.generated.ravWord = 'Contenu démesurément long. '.repeat(3000);
  rejected = false;
  try { await composeNewsletter(impossible); } catch { rejected = true; }
  check(rejected, 'Impossible content must not be silently truncated');
  document.body.textContent = 'PASS: ' + total + ' browser layouts (' + extendedSummary.join(', ') + ')';
})().catch(error => { document.body.textContent = 'FAIL: ' + (error?.stack || error?.message || String(error)); });
