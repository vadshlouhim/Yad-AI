/* global document, location, DOMParser */
import { composeNewsletter } from '../../src/lib/newsletter/document-layout';
import { newsletterLayoutCases, baseNewsletter } from './newsletter-layout-cases';
import { formatKiddushSponsor } from '../../src/lib/newsletter/kiddush';
const check = (condition, message) => { if (!condition) throw new Error(message); };
const cases = newsletterLayoutCases();
const params = new URLSearchParams(location.search);
const selected = params.get('preview') || params.get('pdf');
const expectedOverflow = new Set(['provided-b', 'extreme-proportions', 'ai-reordered']);
const sources = data => [...(data.enabled.photos ? data.photos : []), ...(data.enabled.posters ? data.posters : []), ...(data.enabled.restaurantAd ? data.partnerAds : [])];
function validate(data, pages, name) {
  check(pages.length === 2, name + ': the print contract must be exactly two A4 pages');
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
  for (const fixture of cases.filter(c => (!selected || c.name === selected) && !expectedOverflow.has(c.name))) {
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
  for (const fixture of cases.filter(c => expectedOverflow.has(c.name))) {
    let overflowRejected = false;
    try { await composeNewsletter(fixture.data); } catch { overflowRejected = true; }
    check(overflowRejected, fixture.name + ': oversized content must show a warning instead of creating a third page');
  }
  const continued = structuredClone(cases.find(c => c.name === 'provided-b').data);
  continued.layout = { ...(continued.layout || {}), density: 'tight', pageLimit: 3 };
  const continuedPages = await composeNewsletter(continued);
  check(continuedPages.length >= 2 && continuedPages.length <= 3, 'continue anyway must produce at most three pages');
  const continuedRoot = document.createElement('div'); continuedRoot.innerHTML = continuedPages.join('');
  check(continuedRoot.querySelectorAll('img:not([data-newsletter-decoration])').length === sources(continued).length, 'third-page preview must preserve every visual');
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
  document.body.textContent = 'PASS: ' + total + ' browser layouts';
})().catch(error => { document.body.textContent = 'FAIL: ' + (error?.stack || error?.message || String(error)); });
