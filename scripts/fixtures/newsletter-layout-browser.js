/* global document, location, DOMParser */
import { composeNewsletter } from '../../src/lib/newsletter/document-layout';
import { newsletterLayoutCases, baseNewsletter } from './newsletter-layout-cases';
const check = (condition, message) => { if (!condition) throw new Error(message); };
const cases = newsletterLayoutCases();
const params = new URLSearchParams(location.search);
const selected = params.get('preview') || params.get('pdf');
const sources = data => [...(data.enabled.photos ? data.photos : []), ...(data.enabled.posters ? data.posters : []), ...(data.enabled.restaurantAd ? data.partnerAds : [])];
function validate(data, pages, name) {
  check(pages.length >= 1 && pages.length <= 2, name + ': page count');
  const root = document.createElement('div'); root.innerHTML = pages.join(''); document.body.append(root);
  const text = id => [...root.querySelectorAll('[data-newsletter-text="' + id + '"]')].map(node => node.textContent).join('');
  check(text('intro') === data.generated.intro, name + ': introduction changed');
  if (data.enabled.ravWord) check(text('rav') === data.generated.ravWord, name + ': Rav text changed');
  if (data.enabled.shabbat) check(text('parasha') === data.generated.shabbatNote, name + ': Paracha text changed');
  if (data.enabled.seferHamitsvot) {
    check(text('sefer-hamitsvot') === data.seferHamitsvot.dateLabel + (data.shabbat?.hebrewDate ? ' · ' + data.shabbat.hebrewDate : '') + '\n\n' + data.seferHamitsvot.text + '\n\nSource : Beth Loubavitch — ' + data.seferHamitsvot.sourceUrl, name + ': study text changed');
  }
  if (data.enabled.parness) check(text('dedications').includes(data.parnessText), name + ': missing dedication');
  if (data.enabled.kiddush) check(text('dedications').includes(data.kiddushText), name + ': missing kiddush');
  if (data.enabled.support) check(text('support').includes(data.community.donationUrl), name + ': missing support');
  if (data.enabled.events) for (const event of data.events) {
    const date = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'short', timeZone: data.community.timezone }).format(new Date(event.startDate));
    check(text('event-' + event.id) === [date, event.location, event.description].filter(Boolean).join('\n'), name + ': event text changed');
  }
  for (const [id, items] of [['photos', data.photos], ['posters', data.posters], ['partners', data.partnerAds]]) {
    const rendered = [...root.querySelectorAll('[data-gallery="' + id + '"] img')].map(img => img.alt);
    check(JSON.stringify(rendered) === JSON.stringify(items.map(item => item.name)), name + ': reordered or duplicated images');
  }
  const originals = sources(data);
  const images = [...root.querySelectorAll('[data-newsletter-content] img')];
  check(images.length === originals.length, name + ': missing image');
  for (const img of images) {
    const source = originals.find(item => item.name === img.alt);
    check(source && source.url === img.getAttribute('src'), name + ': changed image');
    check(img.style.objectFit === 'contain', name + ': cropped image');
    check(img.parentElement.querySelectorAll('img').length <= 4, name + ': more than four per row');
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
    check([...root.querySelectorAll('[data-gallery="posters"] img')].every(img => Math.min(img.getBoundingClientRect().width, img.getBoundingClientRect().height) >= 109), name + ': posters too small');
  }
  root.remove();
}
(async () => {
  let total = 0;
  for (const fixture of cases.filter(c => !selected || c.name === selected)) {
    const pages = await composeNewsletter(fixture.data).catch(error => { throw new Error(fixture.name + ': ' + error.message); });
    validate(fixture.data, pages, fixture.name);
    total++;
    if (selected) {
      document.body.innerHTML = pages.join('');
      await Promise.all([...document.images].map(img => img.decode()));
      if (params.has('pdf')) {
        const [{ toPng }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')]);
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
        for (const [i, article] of [...document.querySelectorAll('article')].entries()) {
          const png = await toPng(article, { pixelRatio: 2, width: 794, height: 1123, backgroundColor: '#faf7f0' });
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
  const wrong = baseNewsletter(); wrong.seferHamitsvot.date = '2026-10-16';
  let rejected = false;
  try { await composeNewsletter(wrong); } catch { rejected = true; }
  check(rejected, 'Friday study must not be printed as Saturday study');
  const impossible = baseNewsletter(); impossible.generated.ravWord = 'Contenu démesurément long. '.repeat(3000);
  rejected = false;
  try { await composeNewsletter(impossible); } catch { rejected = true; }
  check(rejected, 'Impossible content must not be silently truncated');
  document.body.textContent = 'PASS: ' + total + ' browser layouts';
})().catch(error => { document.body.textContent = 'FAIL: ' + error.message; });
