import type { CommunityInfo, GeneratedNewsletter, ModuleKey, NewsletterBirthday, NewsletterEvent, NewsletterManualBirthday, NewsletterShabbat, UploadedPhoto } from "@/components/newsletter/newsletter-paper-client";
import { newsletterShabbatDate, type NewsletterStudy } from "./shabbat-study";
import type { NewsletterLayoutPreferences } from "./revision";
import { resolveNewsletterLabels, type NewsletterLabels } from "./labels";

export const PAPER = { width: 794, height: 1123, margin: 42, gap: 18 };
const CONTENT_WIDTH = PAPER.width - PAPER.margin * 2;
const INK = "#234856";
const ACCENT = "#005572";
const GOLD = "#bb8a36";
const IVORY = "#faf7f0";

export type NewsletterDocumentData = {
  community: CommunityInfo;
  generated: GeneratedNewsletter;
  enabled: Record<ModuleKey, boolean>;
  parnessText: string;
  kiddushText: string;
  photos: UploadedPhoto[];
  posters: UploadedPhoto[];
  partnerAds: UploadedPhoto[];
  bannerPhotoUrl: string;
  events: NewsletterEvent[];
  birthdays: NewsletterBirthday[];
  manualBirthdays?: NewsletterManualBirthday[];
  specificEventText?: string;
  labels?: Partial<NewsletterLabels>;
  shabbat: NewsletterShabbat | null;
  seferHamitsvot?: NewsletterStudy | null;
  layout?: NewsletterLayoutPreferences;
};

export type DocumentImage = UploadedPhoto & { width: number; height: number };
export type DocumentBlock =
  | { kind: "text"; id: string; title: string; text: string; compact?: boolean; continuation?: boolean }
  | { kind: "images"; id: string; title: string; images: DocumentImage[]; height: number; maxHeight: number; poster?: boolean };
export type DocumentPage = { blocks: DocumentBlock[]; fontSize: number };
type Measure = (block: DocumentBlock, fontSize: number) => number;
const TEXT_SIZES = [13, 12.5, 12, 11.5, 11, 10.5, 10, 9.5, 9, 8.5, 8];
const blockGap = (fontSize: number) => Math.max(7, Math.min(PAPER.gap, PAPER.gap * fontSize / 11));

/** Pack real measured blocks, splitting text only at word boundaries, never truncating. */
export function paginateNewsletter(blocks: DocumentBlock[], capacity: (index: number) => number, measure: Measure, baseFont = 11): DocumentPage[] {
  const pages: DocumentPage[] = [{ blocks: [], fontSize: 11 }];
  let used = 0;
  const newPage = () => { pages.push({ blocks: [], fontSize: 11 }); used = 0; };
  const push = (block: DocumentBlock) => {
    const page = pages[pages.length - 1];
    used += (page.blocks.length ? blockGap(baseFont) : 0) + measure(block, baseFont);
    page.blocks.push(block);
  };
  for (const original of blocks) {
    let block = { ...original };
    for (;;) {
      const page = pages[pages.length - 1];
      const remaining = capacity(pages.length - 1) - used - (page.blocks.length ? blockGap(baseFont) : 0);
      if (measure(block, baseFont) <= remaining) { push(block); break; }
      if (block.kind === "images") {
        if (page.blocks.length) { newPage(); continue; }
        const overhead = measure({ ...block, height: 0 }, baseFont);
        const height = Math.min(block.height, remaining - overhead);
        if (height < 80) throw new Error("L’en-tête laisse trop peu de place aux images. Raccourcissez le titre ou les coordonnées.");
        push({ ...block, height, maxHeight: Math.min(block.maxHeight, height) });
        break;
      }
      // Prefer a paragraph boundary; fall back to whitespace only for a long paragraph.
      const boundaries = Array.from(block.text.matchAll(/\s+/g), (match) => match.index! + match[0].length);
      let low = 0, high = boundaries.length - 1, fit = 0;
      while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        const end = boundaries[middle];
        if (measure({ ...block, text: block.text.slice(0, end) }, baseFont) <= remaining) { fit = end; low = middle + 1; }
        else high = middle - 1;
      }
      const paragraphEnd = block.text.slice(0, fit).lastIndexOf("\n\n");
      if (paragraphEnd >= 80) fit = paragraphEnd + 2;
      if (fit < Math.min(80, block.text.length) && page.blocks.length) { newPage(); continue; }
      if (!fit) {
        // An unbroken URL/word still wraps visually; preserve every character.
        let left = 1, right = block.text.length;
        while (left <= right) {
          const end = Math.floor((left + right) / 2);
          if (measure({ ...block, text: block.text.slice(0, end) }, baseFont) <= remaining) { fit = end; left = end + 1; }
          else right = end - 1;
        }
      }
      if (!fit) throw new Error("Le titre ou l’en-tête est trop long pour une page A4.");
      push({ ...block, text: block.text.slice(0, fit) });
      block = { ...block, text: block.text.slice(fit), continuation: true };
      if (!block.text.length) break;
      newPage();
    }
  }
  for (const [index, page] of pages.entries()) {
    page.fontSize = baseFont;
    const total = (font: number) => page.blocks.reduce((sum, block) => sum + measure(block, font), Math.max(0, page.blocks.length - 1) * blockGap(font));
    for (const size of [11.5, 12, 12.5, 13].filter(size => size > baseFont)) {
      if (total(size) <= capacity(index)) page.fontSize = size;
      else break;
    }
    // Spend remaining space on images, not on the height of short text boxes.
    let spare = capacity(index) - total(page.fontSize);
    const images = page.blocks.filter((block): block is Extract<DocumentBlock, { kind: "images" }> => block.kind === "images");
    for (const [imageIndex, block] of images.entries()) {
      const extra = Math.max(0, Math.min(block.maxHeight - block.height, spare / (images.length - imageIndex)));
      block.height += extra;
      spare -= extra;
    }
  }
  return pages;
}

function element(tag: string, text?: string, styles: Partial<CSSStyleDeclaration> = {}) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  Object.assign(node.style, styles);
  return node;
}

function heading(text: string, compact = false, fontSize = 11) {
  const scale = Math.min(1, fontSize / 11);
  return element("h2", text, {
    margin: `0 0 ${Math.max(4, 10 * scale)}px`, paddingTop: `${Math.max(4, 9 * scale)}px`, borderTop: `1px solid ${GOLD}`, fontFamily: "Arial, sans-serif", fontSize: `${(compact ? 15 : 24) * scale}px`,
    lineHeight: "1.12", fontWeight: "700", letterSpacing: "-0.4px", color: ACCENT, overflowWrap: "anywhere",
  });
}

export function renderDocumentBlock(block: DocumentBlock, fontSize: number) {
  const section = element("section", undefined, { breakInside: "avoid", minWidth: "0" });
  section.dataset.blockId = block.id;
  if (block.title) section.append(heading(block.title + (block.kind === "text" && block.continuation ? " — suite" : ""), block.kind === "text" && block.compact));
  if (block.kind === "text") {
    const text = element("div", block.text, {
      whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontFamily: block.compact ? "Arial, sans-serif" : "Georgia, 'Times New Roman', serif",
      fontSize: `${fontSize * 4 / 3}px`, lineHeight: block.compact ? "1.32" : "1.38", color: INK,
    });
    text.dataset.newsletterText = block.id;
    section.append(text);
  } else {
    const row = element("div", undefined, { display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", height: `${block.height}px` });
    const ratios = block.images.map((image) => image.width / image.height);
    const height = Math.min(block.height, (CONTENT_WIDTH - (block.images.length - 1) * 12) / ratios.reduce((a, b) => a + b, 0));
    for (const [i, image] of block.images.entries()) {
      const img = element("img") as HTMLImageElement;
      img.src = image.url;
      img.alt = image.name;
      Object.assign(img.style, { display: "block", width: `${height * ratios[i]}px`, height: `${height}px`, objectFit: "contain", border: "0", borderRadius: "0", boxShadow: "none", flexShrink: "0" });
      row.append(img);
    }
    section.append(row);
  }
  return section;
}

async function imageDimensions(image: UploadedPhoto): Promise<DocumentImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => finish(false), 15_000);
    const finish = (ok: boolean) => {
      clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      if (ok && img.naturalWidth && img.naturalHeight) resolve({ ...image, width: img.naturalWidth, height: img.naturalHeight });
      else reject(new Error(`Image indisponible : ${image.name}. Réimportez-la avant l’export.`));
    };
    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    img.src = image.url;
  });
}

function textBlock(id: string, title: string, text: string, compact = false): DocumentBlock[] {
  return text.trim() ? [{ kind: "text", id, title, text, compact }] : [];
}

export function supportCommunityName(name: string) {
  const cleanName = name.trim();
  if (/^(?:le\s+)?beth[\s-]?habad\b/i.test(cleanName)) {
    return `du ${cleanName.replace(/^le\s+/i, "")}`;
  }
  if (/^la\s+/i.test(cleanName)) return `de ${cleanName}`;
  if (/^l['’]/i.test(cleanName)) return `de ${cleanName}`;
  if (/^(synagogue|communauté|association)\b/i.test(cleanName)) return `de la ${cleanName}`;
  return `de ${cleanName}`;
}

async function makeBlocks(data: NewsletterDocumentData): Promise<DocumentBlock[]> {
  const { generated: g, enabled: e } = data;
  const labels = resolveNewsletterLabels(undefined, data.labels);
  if (e.seferHamitsvot && (!data.shabbat || !data.seferHamitsvot || data.seferHamitsvot.date !== newsletterShabbatDate(data.shabbat.date))) {
    throw new Error("Le Sefer Hamitsvot de ce Chabbat n’est pas disponible. Rechargez la page ou désactivez cette rubrique ; aucune étude d’une autre date ne sera utilisée.");
  }
  const blocks: DocumentBlock[] = [
    ...textBlock("intro", "", g.intro),
    ...(e.ravWord ? textBlock("rav", labels.ravWord, g.ravWord) : []),
    ...(e.shabbat ? textBlock("parasha", labels.parasha, g.shabbatNote) : []),
    ...textBlock("dedications", labels.community, [e.parness && data.parnessText.trim() ? `${labels.parness} · ${data.parnessText}` : "", e.kiddush && data.kiddushText.trim() ? `${labels.kiddush} ${data.kiddushText}` : ""].filter(Boolean).join("\n"), true),
  ];
  if (e.seferHamitsvot && data.seferHamitsvot) {
    const study = data.seferHamitsvot;
    blocks.push(...textBlock("sefer-hamitsvot", labels.seferHamitsvot, `${study.dateLabel}${data.shabbat?.hebrewDate ? ` · ${data.shabbat.hebrewDate}` : ""}\n\n${study.text}\n\nSource : Beth Loubavitch — ${study.sourceUrl}`, true));
  }
  if (e.events) {
    blocks.push(...textBlock("events-intro", labels.agenda, g.eventIntro));
    for (const event of data.events) {
      const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short", timeZone: data.community.timezone }).format(new Date(event.startDate));
      blocks.push(...textBlock(`event-${event.id}`, event.title, [date, event.location, event.description].filter(Boolean).join("\n"), true));
    }
  }
  if (e.specificEvent) blocks.push(...textBlock("specific-event", labels.specificEvent, data.specificEventText ?? "", true));
  if (e.birthdays) {
    const automatic = data.birthdays.map((birthday) => `${birthday.name} · ${birthday.hebrewDate || birthday.gregorianDate}`);
    const manual = (data.manualBirthdays ?? []).filter((birthday) => birthday.name.trim()).map((birthday) => `${birthday.name.trim()}${birthday.dateLabel.trim() ? ` · ${birthday.dateLabel.trim()}` : ""}`);
    blocks.push(...textBlock("birthdays", labels.birthdays, [...automatic, ...manual].join("\n"), true));
  }
  if (e.support) blocks.push(...textBlock("support", labels.support, `Soutenez les actions ${supportCommunityName(data.community.name)}.\n${data.community.donationUrl || ""}`, true));
  if (e.photos) {
    const photos: DocumentImage[] = [];
    // Decode sequentially so large phone photos do not spike memory together.
    for (const photo of data.photos) photos.push(await imageDimensions(photo));
    for (let index = 0; index < photos.length;) {
      const count = photos.length - index === 3 ? 3 : Math.min(2, photos.length - index);
      const images = photos.slice(index, index + count);
      const maxHeight = (CONTENT_WIDTH - (count - 1) * 12) / images.reduce((sum, image) => sum + image.width / image.height, 0);
      blocks.push({ kind: "images", id: `photos-${index}`, title: index === 0 ? labels.photos : "", images, height: Math.min(230, maxHeight), maxHeight: Math.min(430, maxHeight) });
      index += count;
    }
  }
  for (const [kind, images, label] of [["partner", e.restaurantAd ? data.partnerAds : [], labels.partners], ["poster", e.posters ? data.posters : [], labels.posters]] as const) {
    for (const image of images) {
      const sized = await imageDimensions(image);
      const maxHeight = Math.min(850, CONTENT_WIDTH * sized.height / sized.width);
      blocks.push({ kind: "images", id: `${kind}-${image.id}`, title: label, images: [sized], height: kind === "poster" ? maxHeight : Math.min(280, maxHeight), maxHeight, poster: kind === "poster" });
    }
  }
  return blocks;
}

function header(data: NewsletterDocumentData, first: boolean) {
  const node = element("header", undefined, { paddingBottom: "18px", flexShrink: "0", position: "relative" });
  const line = element("div", undefined, { display: "flex", gap: "20px", justifyContent: "space-between", alignItems: "start" });
  const identity = element("div", undefined, { flex: "1", minWidth: "0" });
  identity.append(element("p", data.community.name, { margin: "0 0 12px", color: ACCENT, fontSize: "15px", fontWeight: "700", letterSpacing: "2px", textTransform: "uppercase", overflowWrap: "anywhere" }));
  identity.append(element(first ? "h1" : "p", data.generated.title, { margin: "0", color: ACCENT, fontSize: first ? "58px" : "28px", lineHeight: "1.04", letterSpacing: first ? "-2px" : "-0.8px", fontWeight: "700", overflowWrap: "anywhere" }));
  identity.append(element("p", first ? "Au cœur de notre communauté" : "La vie de notre communauté", { margin: "7px 0 0", color: GOLD, fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: first ? "25px" : "20px", lineHeight: "1.2", overflowWrap: "anywhere" }));
  const right = element("div", undefined, { textAlign: "right", flexShrink: "0" });
  right.append(element("span", 'ב״ה', { display: "block", marginBottom: "8px", fontSize: "14px" }));
  const logo = data.bannerPhotoUrl || data.community.logoUrl;
  if (first && logo) {
    const img = element("img") as HTMLImageElement;
    img.src = logo;
    img.alt = data.community.name;
    Object.assign(img.style, { width: "66px", height: "66px", objectFit: "contain", border: "0" });
    right.append(img);
  }
  line.append(identity, right);
  node.append(line);
  if (first && data.enabled.shabbat && data.shabbat) {
    const shabbat = data.shabbat;
    const details = element("div", undefined, { display: "grid", gridTemplateColumns: "1.4fr 1.4fr 1fr 1fr", gap: "14px", marginTop: "20px", background: ACCENT, color: IVORY, padding: "13px 16px", borderRadius: "0 18px 0 0" });
    for (const [label, value] of [["Paracha", shabbat.parasha], ["Date hébraïque", shabbat.hebrewDate], ["Entrée", shabbat.entry], ["Sortie", shabbat.exit]]) {
      const item = element("div", undefined, { minWidth: "0" });
      item.append(element("div", label || "", { fontSize: "10px", color: "#f3d79a", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.8px" }));
      item.append(element("div", value || "À vérifier", { fontWeight: "700", fontSize: "16px", lineHeight: "1.3", overflowWrap: "anywhere" }));
      details.append(item);
    }
    node.append(details);
  }
  return node;
}

function footer(data: NewsletterDocumentData, index: number, total: number) {
  const node = element("footer", undefined, { display: "flex", flexShrink: "0", gap: "14px", justifyContent: "space-between", alignItems: "end", borderTop: `1px solid ${GOLD}`, paddingTop: "10px", marginTop: "16px", fontSize: "10px", lineHeight: "1.4", color: ACCENT });
  const info = element("div", undefined, { minWidth: "0", overflowWrap: "anywhere" });
  info.append(element("strong", data.community.name));
  info.append(element("div", [data.community.address, data.community.city, data.community.phone, data.community.email, data.community.website].filter(Boolean).join(" · ")));
  info.append(element("div", "Contenu créé par EasyCom-AI — l’IA au service des communautés", { fontSize: "9px", marginTop: "4px", color: INK }));
  node.append(info, element("span", `${index + 1} / ${total}`, { whiteSpace: "nowrap" }));
  return node;
}

/** A column is not a sheet: the print contract is always at most two A4 pages. */
export function fitNewsletterColumns(blocks: DocumentBlock[], capacities: number[], measure: Measure): DocumentPage[] {
  if (!blocks.length) return [];
  for (const font of TEXT_SIZES) {
    // At a given size, keep articles whole when possible, then split their text if needed.
    if (capacities.length >= 2 && blocks.length > 1) {
      let best: DocumentPage[] | null = null;
      let imbalance = Infinity;
      for (let split = 1; split < blocks.length; split++) {
        const groups = [blocks.slice(0, split), blocks.slice(split)];
        const heights = groups.map(group => group.reduce((sum, block) => sum + measure(block, font), (group.length - 1) * blockGap(font)));
        if (heights.every((height, i) => height <= capacities[i]) && Math.abs(heights[0] - heights[1]) < imbalance) {
          imbalance = Math.abs(heights[0] - heights[1]);
          best = groups.map(group => ({ blocks: group, fontSize: font }));
        }
      }
      if (best) return best;
    }
    const columns = paginateNewsletter(blocks, index => capacities[index] ?? capacities.at(-1)!, measure, font);
    if (columns.length <= capacities.length) return columns;
  }
  const largest = blocks.filter(block => block.kind === "text").sort((a, b) =>
    (b.kind === "text" ? b.text.length : 0) - (a.kind === "text" ? a.text.length : 0)).slice(0, 3);
  throw new Error(`Même avec la police réduite à 8 points, le texte dépasse les deux faces A4. Les rubriques les plus longues sont ${largest.map(block => `« ${block.title || "Introduction"} »`).join(", ")}. Aucun texte n’a été supprimé.`);
}

/** Keep each editorial section whole; the print edition never creates a “suite” fragment. */
export function fitNewsletterWholeBlocks(blocks: DocumentBlock[], capacities: number[], measure: Measure, balanceAcrossSides = false): DocumentPage[] {
  if (!blocks.length) return [];
  for (const font of TEXT_SIZES) {
    const heights = blocks.map((block) => measure(block, font));
    const prefix = [0];
    heights.forEach((height) => prefix.push(prefix.at(-1)! + height));
    const rangeHeight = (start: number, end: number) => prefix[end] - prefix[start] + Math.max(0, end - start - 1) * blockGap(font);
    let best: { groups: Array<[number, number]>; score: number } | null = null;
    const search = (column: number, start: number, groups: Array<[number, number]>) => {
      if (start === blocks.length) {
        const filled = [...groups, ...Array.from({ length: capacities.length - groups.length }, () => [start, start] as [number, number])];
        const values = filled.map(([from, to]) => rangeHeight(from, to));
        const frontUsed = filled.slice(0, 2).some(([from, to]) => to > from);
        const backUsed = filled.slice(2).some(([from, to]) => to > from);
        const sideBalance = balanceAcrossSides && blocks.length > 1 && capacities.length >= 4
          ? (!frontUsed || !backUsed ? 10_000 : 0) + Math.abs(Math.max(values[0] ?? 0, values[1] ?? 0) / capacities[0] - Math.max(values[2] ?? 0, values[3] ?? 0) / capacities[2]) * 1_000
          : backUsed ? 100_000 : 0;
        const score = sideBalance + Math.abs((values[0] ?? 0) - (values[1] ?? 0)) + Math.abs((values[2] ?? 0) - (values[3] ?? 0)) * 0.5;
        if (!best || score < best.score) best = { groups: filled, score };
        return;
      }
      if (column >= capacities.length) return;
      for (let end = start; end <= blocks.length; end++) {
        // Never place content in the right column while the left one is empty.
        if (end === start && column % 2 === 0) continue;
        if (end > start && rangeHeight(start, end) > capacities[column]) break;
        if (end === start && column === capacities.length - 1) continue;
        search(column + 1, end, [...groups, [start, end]]);
      }
    };
    search(0, 0, []);
    if (best) {
      const solution = best as { groups: Array<[number, number]>; score: number };
      const last = solution.groups.findLastIndex(([from, to]) => to > from);
      return solution.groups.slice(0, last + 1).map(([from, to]) => ({ blocks: blocks.slice(from, to), fontSize: font }));
    }
  }
  const largest = blocks.filter((block) => block.kind === "text").sort((a, b) =>
    (b.kind === "text" ? b.text.length : 0) - (a.kind === "text" ? a.text.length : 0)).slice(0, 3);
  throw new Error(`Les rubriques ${largest.map((block) => `« ${block.title || "Introduction"} »`).join(", ")} ne tiennent pas entières sur une A4 recto verso à 8 points. Raccourcissez-les manuellement ou retirez un visuel ; aucun texte n’a été coupé.`);
}


function paper(data: NewsletterDocumentData, index: number) {
  const article = element("article", undefined, { boxSizing: "border-box", width: `${PAPER.width}px`, height: `${PAPER.height}px`, padding: `${PAPER.margin}px`, background: IVORY, color: INK, display: "flex", flexDirection: "column", fontFamily: "Arial, sans-serif", overflowWrap: "anywhere", position: "relative", isolation: "isolate" });
  article.dataset.newsletterPage = String(index + 1);
  article.style.direction = "ltr";
  article.style.textAlign = "left";
  // Decorative curves are confined to the print-safe margin; never mask content.
  const decor = element("div", undefined, { position: "absolute", inset: "14px", border: `1px solid #d4b778`, pointerEvents: "none", zIndex: "-1" });
  const curve = element("div", undefined, { position: "absolute", right: "14px", top: "14px", width: "150px", height: "24px", borderRadius: "0 0 0 100%", background: ACCENT, borderBottom: `3px solid ${GOLD}`, pointerEvents: "none", zIndex: "-1" });
  const lowerCurve = element("div", undefined, { position: "absolute", left: "14px", bottom: "14px", width: "140px", height: "18px", borderRadius: "0 100% 0 0", background: ACCENT, borderTop: `2px solid ${GOLD}`, pointerEvents: "none", zIndex: "-1" });
  article.append(decor, curve, lowerCurve, header(data, index === 0));
  return article;
}

type Gallery = { id: string; title: string; images: DocumentImage[] };
type GalleryPlan = { gallery: Gallery; rows: Array<{ images: DocumentImage[]; height: number; captionHeight?: number; groupCaption?: string }>; height: number; area: number };
type Zone = { x: number; y: number; width: number; height: number; blocks?: DocumentBlock[]; notice?: boolean; galleries?: GalleryPlan[] };
type SheetPlan = { zones: Zone[]; score: number; mode: string };
const ZONE_GAP = 16;
const COLUMN_GAP = 24;
const COLUMN_WIDTH = (CONTENT_WIDTH - COLUMN_GAP) / 2;
const NORMAL_FONTS = [11, 11.5, 12, 10.5, 10];
const DENSE_FONTS = [9.5, 9, 8.5, 8];

/** Contiguous row partitions retain upload order and at most four images. */
function rowPartitions(images: DocumentImage[]): DocumentImage[][][] {
  if (!images.length) return [[]];
  // Legacy drafts may exceed today's upload limits: preserve them without an
  // exponential search over an unbounded number of image partitions.
  if (images.length > 12) return [1, 2, 3, 4].map(count =>
    Array.from({ length: Math.ceil(images.length / count) }, (_, i) => images.slice(i * count, (i + 1) * count)));
  const result: DocumentImage[][][] = [];
  for (let count = 1; count <= Math.min(4, images.length); count++) {
    for (const rest of rowPartitions(images.slice(count))) result.push([images.slice(0, count), ...rest]);
  }
  return result;
}

function renderNotice(blocks: DocumentBlock[], font: number) {
  const node = element("aside", undefined, { padding: "10px 12px", background: "#edf1ec", borderLeft: "3px solid " + GOLD, boxSizing: "border-box" });
  node.dataset.newsletterNotice = "true";
  blocks.forEach((block, index) => {
    const section = renderDocumentBlock(block, font);
    if (index) section.style.marginTop = "10px";
    node.append(section);
  });
  return node;
}

function renderGallery(plan: GalleryPlan, width: number) {
  const node = element("section", undefined, { width: width + "px" });
  node.dataset.gallery = plan.gallery.id;
  node.append(heading(plan.gallery.title, width < CONTENT_WIDTH));
  plan.rows.forEach((row, index) => {
    const line = element("div", undefined, { display: "flex", justifyContent: "center", gap: "12px", height: (row.height + (row.captionHeight ?? 0)) + "px", marginTop: index ? "12px" : "0" });
    line.dataset.imageRow = "true";
    for (const source of row.images) {
      const img = element("img") as HTMLImageElement;
      img.src = source.url; img.alt = source.name;
      Object.assign(img.style, { display: "block", flexShrink: "0", width: (row.height * source.width / source.height) + "px", height: row.height + "px", objectFit: "contain" });
      const figure = element("figure", undefined, { margin: "0", width: img.style.width, flexShrink: "0" });
      figure.append(img);
      if (source.caption) {
        const caption = renderCaption(source.caption);
        caption.dataset.photoCaption = source.id;
        figure.append(caption);
      }
      line.append(figure);
    }
    node.append(line);
    if (row.groupCaption) {
      const caption = renderCaption(row.groupCaption);
      caption.dataset.photoGroupCaption = row.images.at(-1)?.captionGroup ?? "";
      node.append(caption);
    }
  });
  return node;
}

function renderCaption(text: string) {
  return element("figcaption", text, { margin: "6px 0 0", fontFamily: "Arial, sans-serif", fontSize: "12px", lineHeight: "1.3", color: INK, textAlign: "center", whiteSpace: "pre-wrap", overflowWrap: "anywhere" });
}

/** Measured zones shared unchanged by preview, browser print and PDF export. */
export async function composeNewsletter(data: NewsletterDocumentData): Promise<string[]> {
  await document.fonts.ready;
  const labels = resolveNewsletterLabels(undefined, data.labels);
  const blocks = await makeBlocks(data);
  const texts = blocks.filter(block => block.kind === "text");
  const intro = texts.filter(block => block.id === "intro");
  const notices = texts.filter(block => ["dedications", "support"].includes(block.id));
  const stories = texts.filter(block => !["intro", "dedications", "support"].includes(block.id));
  const gallery = (id: string, title: string, predicate: (block: DocumentBlock) => boolean): Gallery => ({
    id, title, images: blocks.flatMap(block => block.kind === "images" && predicate(block) ? block.images : []),
  });
  const photos = gallery("photos", labels.photos, block => block.id.startsWith("photos-"));
  const posters = gallery("posters", labels.posters, block => block.kind === "images" && Boolean(block.poster));
  const partners = gallery("partners", labels.partners, block => block.id.startsWith("partner-"));
  let frontMedia = [photos].filter(g => g.images.length);
  let backMedia = [posters, partners].filter(g => g.images.length);
  const partitionCache = new Map<Gallery, DocumentImage[][][]>();
  for (const g of [...frontMedia, ...backMedia]) partitionCache.set(g, rowPartitions(g.images).filter(rows => rows.every(row => new Set(row.map(image => image.captionGroup || "")).size <= 1)));
  const root = element("div", undefined, { position: "fixed", left: "-20000px", top: "0", width: CONTENT_WIDTH + "px", fontFamily: "Arial, sans-serif", color: INK, visibility: "hidden", direction: "ltr" });
  document.body.append(root);
  try {
    const heightOf = (node: HTMLElement, width = CONTENT_WIDTH) => {
      root.style.width = width + "px"; root.replaceChildren(node);
      return node.getBoundingClientRect().height;
    };
    const measureCache = new Map<string, number>();
    const measure = (block: DocumentBlock, font: number, width: number) => {
      const key = JSON.stringify([block, font, width]);
      if (!measureCache.has(key)) measureCache.set(key, heightOf(renderDocumentBlock(block, font), width));
      return measureCache.get(key)!;
    };
    const textHeight = (items: DocumentBlock[], font: number, width: number) =>
      items.reduce((sum, block) => sum + measure(block, font, width), Math.max(0, items.length - 1) * ZONE_GAP);
    const footHeight = heightOf(footer(data, 0, 2)) + 16;
    const capacities = [true, false].map(first => PAPER.height - PAPER.margin * 2 - heightOf(header(data, first)) - footHeight - 4);
    const titleHeights = new Map<string, number>();
    const galleryCache = new Map<string, GalleryPlan | null>();
    const fitGallery = (g: Gallery, width: number, room: number): GalleryPlan | null => {
      const key = g.id + ":" + width + ":" + Math.floor(room);
      if (galleryCache.has(key)) return galleryCache.get(key)!;
      const titleKey = g.id + ":" + width;
      if (!titleHeights.has(titleKey)) titleHeights.set(titleKey, heightOf(heading(g.title, width < CONTENT_WIDTH), width) + 10);
      const titleHeight = titleHeights.get(titleKey)!;
      let best: GalleryPlan | null = null;
      let bestScore = -Infinity;
      for (const partition of partitionCache.get(g)!) {
        const groupCaptions = partition.map(row => {
          const last = row.at(-1)!;
          const following = g.images[g.images.indexOf(last) + 1];
          return last.captionGroup && following?.captionGroup !== last.captionGroup ? last.groupCaption : undefined;
        });
        const captionMeasure = (text: string, w: number) => {
          const key = "caption:" + text + ":" + w.toFixed(2);
          if (!measureCache.has(key)) measureCache.set(key, heightOf(renderCaption(text), w) + 6);
          return measureCache.get(key)!;
        };
        const groupHeight = groupCaptions.reduce((sum, text) => sum + (text ? captionMeasure(text, width) : 0), 0);
        const available = room - titleHeight - (partition.length - 1) * 12 - groupHeight;
        if (available <= 0) continue;
        const maxHeight = g.id === "partners" ? 240 : g.id === "photos" ? 340 : 440;
        const rowWidths = partition.map(row => Math.min(maxHeight, (width - (row.length - 1) * 12) / row.reduce((sum, img) => sum + img.width / img.height, 0)));
        const comparable = Math.max(...rowWidths) <= Math.min(...rowWidths) * 3;
        const natural = rowWidths.map(height => comparable ? Math.min(height, Math.min(...rowWidths) * 1.25) : height);
        const naturalTotal = natural.reduce((a, b) => a + b, 0);
        let scale = Math.min(1, available / naturalTotal);
        let captionHeights = partition.map(() => 0);
        // Captions are measured at each image's actual width, never clipped.
        for (let attempt = 0; attempt < 12; attempt++) {
          captionHeights = partition.map((images, i) => Math.max(0, ...images.map(img => img.caption ? captionMeasure(img.caption, Math.max(1, natural[i] * scale * img.width / img.height)) : 0)));
          const total = naturalTotal * scale + captionHeights.reduce((a, b) => a + b, 0);
          if (total <= available + 0.1) break;
          scale = Math.max(0, scale - (total - available + 1) / naturalTotal);
        }
        if (scale <= 0 || naturalTotal * scale + captionHeights.reduce((a, b) => a + b, 0) > available + 0.1) continue;
        const rows = partition.map((images, i) => ({ images, height: natural[i] * scale, captionHeight: captionHeights[i], groupCaption: groupCaptions[i] }));
        if (rows.some(row => row.images.some(img => {
          const ratio = img.width / img.height;
          const shortest = Math.min(row.height, row.height * ratio);
          const minimum = g.id === "posters" && g.images.length <= 4 ? 110 : 65;
          return shortest < Math.min(minimum, width * Math.min(1, 1 / ratio), maxHeight * Math.min(1, ratio)) - 0.1;
        }))) continue;
        const areas = rows.flatMap(row => row.images.map(img => row.height ** 2 * img.width / img.height));
        const area = areas.reduce((a, b) => a + b, 0);
        const score = area + Math.min(...areas) * areas.length * 0.7
          - (Math.max(...areas) - Math.min(...areas)) * 0.35;
        if (score > bestScore) {
          bestScore = score;
          best = { gallery: g, rows, height: titleHeight + rows.reduce((sum, row) => sum + row.height + row.captionHeight, 0) + groupHeight + (rows.length - 1) * 12, area };
        }
      }
      galleryCache.set(key, best);
      return best;
    };
    const fitGalleries = (items: Gallery[], width: number, room: number): GalleryPlan[] | null => {
      if (!items.length) return [];
      if (items.length === 1) { const result = fitGallery(items[0], width, room); return result ? [result] : null; }
      let best: GalleryPlan[] | null = null, score = -Infinity;
      for (const share of [0.35, 0.5, 0.65, 0.75, 0.85]) {
        const first = fitGallery(items[0], width, (room - ZONE_GAP) * share);
        if (!first) continue;
        const rest = fitGalleries(items.slice(1), width, room - ZONE_GAP - first.height);
        if (!rest) continue;
        // Detailed event posters get priority over enlarging a partner mark.
        const area = first.area * 2 + rest.reduce((sum, item) => sum + item.area, 0) * 0.5;
        if (area > score) { best = [first, ...rest]; score = area; }
      }
      return best;
    };
    const buildPage = (items: DocumentBlock[], pageNotices: DocumentBlock[], media: Gallery[], capacity: number, font: number): SheetPlan | null => {
      let best: SheetPlan | null = null;
      const consider = (zones: Zone[], mode: string) => {
        if (zones.some(z => z.y + z.height > capacity + 0.5 || z.height < 0)) return;
        if (zones.some((a, i) => zones.slice(i + 1).some(b =>
          Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 0.5 &&
          Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 0.5))) return;
        const occupied = zones.reduce((sum, z) => sum + (z.galleries
          ? z.galleries.reduce((a, g) => a + g.area, 0)
          : z.width * z.height), 0);
        const bottoms = [0, COLUMN_WIDTH + COLUMN_GAP].map(x => Math.max(0, ...zones.filter(z => z.x <= x && z.x + z.width > x).map(z => z.y + z.height)));
        const hole = Math.max(...bottoms) - Math.min(...bottoms);
        const bottomGap = Math.max(0, capacity - Math.max(...bottoms));
        const continuations = zones.flatMap(z => z.blocks ?? []).filter(b => b.kind === "text" && b.continuation).length;
        const preferencePenalty = data.layout?.composition && data.layout.composition !== "auto" && mode !== data.layout.composition ? 250_000 : 0;
        const score = capacity * CONTENT_WIDTH - occupied + hole * COLUMN_WIDTH * 0.6 + bottomGap ** 2 * 5 + continuations * 30000 + preferencePenalty;
        if (!best || score < best.score) best = { zones, score, mode };
      };
      const noticeHeight = (width: number) => pageNotices.length ? heightOf(renderNotice(pageNotices, font), width) : 0;
      const appendTail = (base: Zone[], width: number, x: number, top: number, withNotices: boolean) => {
        const zones = [...base];
        let y = top;
        if (withNotices && pageNotices.length) {
          if (y) y += ZONE_GAP;
          const h = noticeHeight(width);
          zones.push({ x, y, width, height: h, blocks: pageNotices, notice: true }); y += h;
        }
        if (media.length) {
          if (y) y += ZONE_GAP;
          const fitted = fitGalleries(media, width, capacity - y);
          if (!fitted) return null;
          const h = fitted.reduce((sum, g) => sum + g.height, (fitted.length - 1) * ZONE_GAP);
          zones.push({ x, y, width, height: h, galleries: fitted });
        }
        return zones;
      };
      const fullHeight = textHeight(items, font, CONTENT_WIDTH);
      const full = appendTail(items.length ? [{ x: 0, y: 0, width: CONTENT_WIDTH, height: fullHeight, blocks: items }] : [], CONTENT_WIDTH, 0, fullHeight, true);
      if (full) consider(full, "full");
      const partitions: DocumentBlock[][][] = [];
      for (let split = 1; split < items.length; split++) partitions.push([items.slice(0, split), items.slice(split)]);
      for (const pair of partitions) {
        const heights = pair.map(group => textHeight(group, font, COLUMN_WIDTH));
        if (heights.some(h => h > capacity)) continue;
        const zones = pair.map((group, i) => ({ x: i * (COLUMN_WIDTH + COLUMN_GAP), y: 0, width: COLUMN_WIDTH, height: heights[i], blocks: group }));
        const tail = appendTail(zones, CONTENT_WIDTH, 0, Math.max(...heights), true);
        if (tail) consider(tail, "columns");
        for (const side of [0, 1]) {
          // A small notice can use the short column while the gallery below
          // both columns still benefits from the entire page width.
          if (pageNotices.length) {
            const h = noticeHeight(COLUMN_WIDTH);
            const notice: Zone = { x: side * (COLUMN_WIDTH + COLUMN_GAP), y: heights[side] + ZONE_GAP, width: COLUMN_WIDTH, height: h, blocks: pageNotices, notice: true };
            const below = appendTail([...zones, notice], CONTENT_WIDTH, 0, Math.max(heights[1 - side], notice.y + h), false);
            if (below) consider(below, "columns");
          }
          const mixed = appendTail(zones, COLUMN_WIDTH, side * (COLUMN_WIDTH + COLUMN_GAP), heights[side], true);
          if (mixed) consider(mixed, "mixed");
        }
      }
      if (items.length && (media.length || pageNotices.length)) {
        const h = textHeight(items, font, COLUMN_WIDTH);
        const mixed = appendTail([{ x: 0, y: 0, width: COLUMN_WIDTH, height: h, blocks: items }], COLUMN_WIDTH, COLUMN_WIDTH + COLUMN_GAP, 0, true);
        if (mixed) consider(mixed, "mixed");
      }
      return best;
    };
    let selected: { pages: SheetPlan[]; font: number; introHeight: number; score: number } | null = null;
    // Try different whole-article orders and page allocations, never continuations.
    const preferred = data.layout?.order ?? [];
    const ranked = [...stories].sort((a, b) => {
      const ai = preferred.indexOf(a.id), bi = preferred.indexOf(b.id);
      return (ai < 0 ? 1000 : ai) - (bi < 0 ? 1000 : bi);
    });
    const orders = [ranked, stories, [...ranked].reverse(),
      ...ranked.map((block, i) => [block, ...ranked.filter((_, j) => i !== j)])]
      .filter((order, index, all) => all.findIndex(other => other.map(b => b.id).join("|") === order.map(b => b.id).join("|")) === index);
    const pageCache = new Map<string, SheetPlan | null>();
    const cachedPage = (items: DocumentBlock[], notes: DocumentBlock[], media: Gallery[], capacity: number, font: number) => {
      const key = JSON.stringify([items.map(b => b.id), notes.map(b => b.id), media.map(g => g.id), capacity, font]);
      if (!pageCache.has(key)) pageCache.set(key, buildPage(items, notes, media, capacity, font));
      return pageCache.get(key)!;
    };
    const search = (fonts: number[]) => {
      for (const font of fonts) {
        const introHeight = intro.length ? textHeight(intro, font, CONTENT_WIDTH) + ZONE_GAP : 0;
        for (const editorial of orders) for (let split = 0; split <= editorial.length; split++) {
          const front = editorial.slice(0, split), back = editorial.slice(split);
          const hasBack = back.length > 0 || backMedia.length > 0;
          const frontNotices = hasBack ? notices.filter(b => b.id === "dedications") : notices;
          const backNotices = hasBack ? notices.filter(b => b.id === "support") : [];
          const a = cachedPage(front, frontNotices, frontMedia, capacities[0] - introHeight, font);
          if (!a) continue;
          const b = hasBack ? cachedPage(back, backNotices, backMedia, capacities[1], font) : null;
          if (hasBack && !b) continue;
          if (!front.length && back.length && !frontMedia.length) continue;
          const editorialPenalty = front.filter(block => !["rav", "parasha"].includes(block.id)).length * 100_000
            + back.filter(block => ["rav", "parasha"].includes(block.id)).length * 250_000;
          const orderPenalty = editorial.reduce((sum, block, index) => sum + (preferred.includes(block.id) ? Math.abs(index - preferred.indexOf(block.id)) * 400_000 : 0), 0);
          const fontRank = data.layout?.fontSize ? Math.abs(font - data.layout.fontSize) : [...NORMAL_FONTS, ...DENSE_FONTS].indexOf(font);
          const preferredSide = data.layout?.photoSide ?? "auto";
          const sidePenalty = preferredSide === "auto" ? (frontMedia.length ? 0 : 50_000) : (preferredSide === "front") !== Boolean(frontMedia.length) ? 1_000_000 : 0;
          const score = a.score + (b?.score ?? 0) + editorialPenalty + orderPenalty + sidePenalty + fontRank * 2_000_000;
          if (!selected || score < selected.score) selected = { pages: b ? [a, b] : [a], font, introHeight, score };
        }
      }
    };
    for (const fonts of [NORMAL_FONTS, DENSE_FONTS]) {
      frontMedia = [photos].filter(g => g.images.length);
      backMedia = [posters, partners].filter(g => g.images.length);
      search(fonts);
      if (photos.images.length) {
        frontMedia = [];
        backMedia = [photos, posters, partners].filter(g => g.images.length);
        search(fonts);
      }
      if (selected) break;
    }
    if (!selected) throw new Error("Les rubriques ne tiennent pas entières sur une A4 recto verso, même après réorganisation. Raccourcissez explicitement un texte ou retirez un visuel. Aucun texte n’a été coupé ni supprimé.");
    const choice = selected as { pages: SheetPlan[]; font: number; introHeight: number; score: number };
    return choice.pages.map((plan, index) => {
      const article = paper(data, index);
      article.dataset.composition = plan.mode;
      article.dataset.bodyFont = String(choice.font);
      const content = element("div", undefined, { position: "relative", flex: "1", minHeight: "0" });
      content.dataset.newsletterContent = "true";
      if (!index && intro.length) {
        const node = element("div", undefined, { fontStyle: "italic" });
        intro.forEach(block => node.append(renderDocumentBlock(block, choice.font)));
        content.append(node);
      }
      for (const zone of plan.zones) {
        const node = element("div", undefined, { position: "absolute", left: zone.x + "px", top: (zone.y + (index ? 0 : choice.introHeight)) + "px", width: zone.width + "px" });
        node.dataset.newsletterZone = "true";
        if (zone.notice) node.append(renderNotice(zone.blocks!, choice.font));
        else zone.blocks?.forEach((block, i) => {
          const section = renderDocumentBlock(block, choice.font);
          if (i) section.style.marginTop = ZONE_GAP + "px";
          node.append(section);
        });
        zone.galleries?.forEach((g, i) => {
          const section = renderGallery(g, zone.width);
          if (i) section.style.marginTop = ZONE_GAP + "px";
          node.append(section);
        });
        content.append(node);
      }
      article.append(content, footer(data, index, choice.pages.length));
      root.style.width = PAPER.width + "px"; root.replaceChildren(article);
      const bounds = content.getBoundingClientRect();
      const nodes = Array.from(content.querySelectorAll<HTMLElement>("[data-newsletter-zone], section, [data-newsletter-text], img, figcaption"));
      if (nodes.some(node => {
        const r = node.getBoundingClientRect();
        return r.bottom > bounds.bottom + 1 || r.right > bounds.right + 1 || r.left < bounds.left - 1;
      })) throw new Error("La composition dépasse la zone imprimable. Aucun contenu n’a été masqué.");
      return article.outerHTML;
    });
  } finally { root.remove(); }
}
