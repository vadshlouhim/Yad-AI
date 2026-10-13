import type { CommunityInfo, GeneratedNewsletter, ModuleKey, NewsletterBirthday, NewsletterEvent, NewsletterShabbat, UploadedPhoto } from "@/components/newsletter/newsletter-paper-client";

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
  shabbat: NewsletterShabbat | null;
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
  if (block.title) section.append(heading(block.title, block.kind === "text" && block.compact, fontSize));
  if (block.kind === "text") {
    const text = element("div", block.text, {
      whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontFamily: block.compact ? "Arial, sans-serif" : "Georgia, 'Times New Roman', serif",
      fontSize: `${(block.compact ? Math.min(11, fontSize) : fontSize) * 4 / 3}px`, lineHeight: block.compact ? "1.32" : "1.38", color: INK,
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
  const blocks: DocumentBlock[] = [
    ...textBlock("intro", "", g.intro),
    ...(e.ravWord ? textBlock("rav", "Mot du Rav", g.ravWord) : []),
    ...(e.shabbat ? textBlock("parasha", "La Paracha de la semaine", g.shabbatNote) : []),
    ...textBlock("dedications", "Dans notre communauté", [e.parness && data.parnessText.trim() ? `Parness Hayom · ${data.parnessText}` : "", e.kiddush && data.kiddushText.trim() ? `Kidouch offert par ${data.kiddushText}` : ""].filter(Boolean).join("\n"), true),
  ];
  if (e.events) {
    blocks.push(...textBlock("events-intro", "À l’agenda", g.eventIntro));
    for (const event of data.events) {
      const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short", timeZone: data.community.timezone }).format(new Date(event.startDate));
      blocks.push(...textBlock(`event-${event.id}`, event.title, [date, event.location, event.description].filter(Boolean).join("\n"), true));
    }
  }
  if (e.birthdays) {
    blocks.push(...textBlock("birthdays", "Les anniversaires de la semaine", data.birthdays.map((b) => `${b.name} · ${b.hebrewDate || b.gregorianDate}`).join("\n"), true));
  }
  if (e.support) blocks.push(...textBlock("support", "Nous soutenir", `Soutenez les actions ${supportCommunityName(data.community.name)}.\n${data.community.donationUrl || ""}`, true));
  if (e.photos) {
    const photos: DocumentImage[] = [];
    // Decode sequentially so large phone photos do not spike memory together.
    for (const photo of data.photos) photos.push(await imageDimensions(photo));
    for (let index = 0; index < photos.length;) {
      const count = photos.length - index === 3 ? 3 : Math.min(2, photos.length - index);
      const images = photos.slice(index, index + count);
      const maxHeight = (CONTENT_WIDTH - (count - 1) * 12) / images.reduce((sum, image) => sum + image.width / image.height, 0);
      blocks.push({ kind: "images", id: `photos-${index}`, title: index === 0 ? "La semaine en images" : "", images, height: Math.min(230, maxHeight), maxHeight: Math.min(430, maxHeight) });
      index += count;
    }
  }
  for (const [kind, images, label] of [["partner", e.restaurantAd ? data.partnerAds : [], "Nos partenaires"], ["poster", e.posters ? data.posters : [], "Affiches & événements à venir..."]] as const) {
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

type MediaRow = { images: DocumentImage[]; height: number; minimum: number };
function mediaRows(images: DocumentImage[], perRow: number, minimum: number, maximum: number): MediaRow[] {
  const rows: MediaRow[] = [];
  for (let i = 0; i < images.length; i += perRow) {
    const group = images.slice(i, i + perRow);
    const natural = (CONTENT_WIDTH - (group.length - 1) * 16) / group.reduce((sum, img) => sum + img.width / img.height, 0);
    rows.push({ images: group, height: Math.min(maximum, natural), minimum: Math.min(minimum, natural) });
  }
  return rows;
}

function renderMedia(rows: MediaRow[], title: string, available?: number, maxImageWidth = CONTENT_WIDTH) {
  const section = element("section", undefined, { flexShrink: "0", minWidth: "0" });
  if (title) section.append(heading(title));
  const natural = rows.reduce((sum, row) => sum + row.height, 0);
  const minimum = rows.reduce((sum, row) => sum + row.minimum, 0);
  const room = available === undefined ? natural : available - (title ? 48 : 0) - Math.max(0, rows.length - 1) * 16;
  if (room < minimum - 1) throw new Error("Les visuels sont trop nombreux pour une A4 recto verso lisible. Retirez une affiche, une publicité ou des photos dans « Composer ». Aucun visuel n’a été supprimé.");
  const fraction = Math.min(1, Math.max(0, (room - minimum) / Math.max(1, natural - minimum)));
  for (const [index, row] of rows.entries()) {
    const height = row.minimum + (row.height - row.minimum) * fraction;
    const ratios = row.images.map(img => img.width / img.height);
    const actual = Math.min(height, (CONTENT_WIDTH - (row.images.length - 1) * 16) / ratios.reduce((a, b) => a + b, 0), row.images.length === 1 ? maxImageWidth / ratios[0] : height);
    const line = element("div", undefined, { display: "flex", justifyContent: "center", alignItems: "center", gap: "16px", height: `${actual}px`, marginTop: index ? "16px" : "0" });
    row.images.forEach((source, i) => {
      const img = element("img") as HTMLImageElement;
      img.src = source.url; img.alt = source.name;
      Object.assign(img.style, { width: `${actual * ratios[i]}px`, height: `${actual}px`, objectFit: "contain", border: "0", borderRadius: "0", boxShadow: "none", flexShrink: "0", display: "block" });
      line.append(img);
    });
    section.append(line);
  }
  return section;
}

function paper(data: NewsletterDocumentData, index: number) {
  const article = element("article", undefined, { boxSizing: "border-box", width: `${PAPER.width}px`, height: `${PAPER.height}px`, padding: `${PAPER.margin}px`, background: IVORY, color: INK, display: "flex", flexDirection: "column", fontFamily: "Arial, sans-serif", overflowWrap: "anywhere", position: "relative", isolation: "isolate" });
  article.dataset.newsletterPage = String(index + 1);
  // Decorative curves are confined to the print-safe margin; never mask content.
  const decor = element("div", undefined, { position: "absolute", inset: "14px", border: `1px solid #d4b778`, pointerEvents: "none", zIndex: "-1" });
  const curve = element("div", undefined, { position: "absolute", right: "14px", top: "14px", width: "150px", height: "24px", borderRadius: "0 0 0 100%", background: ACCENT, borderBottom: `3px solid ${GOLD}`, pointerEvents: "none", zIndex: "-1" });
  const lowerCurve = element("div", undefined, { position: "absolute", left: "14px", bottom: "14px", width: "140px", height: "18px", borderRadius: "0 100% 0 0", background: ACCENT, borderTop: `2px solid ${GOLD}`, pointerEvents: "none", zIndex: "-1" });
  article.append(decor, curve, lowerCurve, header(data, index === 0));
  return article;
}

/** One measured composition shared by preview, print and PDF; never add a third page. */
export async function composeNewsletter(data: NewsletterDocumentData): Promise<string[]> {
  await document.fonts.ready;
  const blocks = await makeBlocks(data);
  const text = blocks.filter(block => block.kind === "text");
  const introduction = text.filter(block => block.id === "intro");
  const stories = text.filter(block => block.id !== "intro");
  const photos = blocks.flatMap(block => block.kind === "images" && block.id.startsWith("photos-") ? block.images : []);
  const visuals = blocks.flatMap(block => block.kind === "images" && block.poster ? block.images : []);
  const partners = blocks.flatMap(block => block.kind === "images" && block.id.startsWith("partner-") ? block.images : []);
  const photosPerRow = photos.length <= 4 ? Math.min(2, Math.max(1, photos.length)) : 3;
  const photoRows = mediaRows(photos, photosPerRow, 110, photos.length <= 4 ? 255 : photos.length <= 6 ? 225 : 190);
  const root = element("div", undefined, { position: "fixed", left: "-20000px", top: "0", width: `${CONTENT_WIDTH}px`, fontFamily: "Arial, sans-serif", color: INK, visibility: "hidden" });
  document.body.append(root);
  try {
    const heightOf = (node: HTMLElement, width = CONTENT_WIDTH) => { root.style.width = `${width}px`; root.replaceChildren(node); return node.getBoundingClientRect().height; };
    const footHeight = heightOf(footer(data, 0, 2)) + 16;
    const capacities = [true, false].map(first => PAPER.height - PAPER.margin * 2 - heightOf(header(data, first)) - footHeight - 3);
    if (Math.min(...capacities) < 180) throw new Error("Le titre ou les coordonnées sont trop longs pour une A4 recto verso. Raccourcissez-les avant l’export.");
    const intro = element("div", undefined, { padding: "0 0 14px", fontStyle: "italic" });
    introduction.forEach(block => intro.append(renderDocumentBlock(block, 12)));
    const measuredIntro = introduction.length ? heightOf(intro) : 0;
    const introInColumns = measuredIntro > Math.min(110, capacities[0] * 0.15);
    if (introInColumns) stories.unshift(...introduction);
    const introHeight = introInColumns ? 0 : measuredIntro;
    const photosNode = photos.length ? renderMedia(photoRows, "Photos de la semaine") : null;
    const photosHeight = photosNode ? heightOf(photosNode) + 18 : 0;
    const frontSpace = capacities[0] - introHeight - photosHeight;
    if (frontSpace < 100 && stories.length) throw new Error("Trop de photos ou de mentions pour le recto. Retirez des photos ou raccourcissez l’introduction et les dédicaces.");
    const columnWidth = (CONTENT_WIDTH - 28) / 2;
    const measure: Measure = (block, font) => heightOf(renderDocumentBlock(block, font), columnWidth);
    const hasBackSections = visuals.length > 0 || partners.length > 0;
    let selected: { columns: DocumentPage[]; posters: HTMLElement | null; partners: HTMLElement | null } | null = null;
    for (const imageScale of [1, 0.85, 0.7, 0.6]) {
        const hasWidePoster = visuals.some((image) => image.width / image.height > 1.3);
        const postersPerRow = hasWidePoster && visuals.length <= 4 ? Math.min(2, visuals.length) : visuals.length <= 3 ? Math.max(1, visuals.length) : visuals.length === 4 ? 2 : 3;
        const posterMaxHeight = visuals.length <= 2 ? 315 : visuals.length === 3 ? 275 : visuals.length === 4 ? 245 : 220;
        const posterRows = visuals.length ? mediaRows(visuals, postersPerRow, 110 * imageScale, posterMaxHeight * imageScale) : [];
        const partnerRows = partners.length ? mediaRows(partners, partners.length, 65 * imageScale, 115 * imageScale) : [];
        const posterSection = posterRows.length ? renderMedia(posterRows, "Affiches & événements à venir...", undefined, 400) : null;
        const partnerSection = partnerRows.length ? renderMedia(partnerRows, "Nos partenaires", undefined, 220) : null;
        const sections = [posterSection, partnerSection].filter((section): section is HTMLElement => Boolean(section));
        const reserved = sections.reduce((sum, section) => sum + heightOf(section), 0) + Math.max(0, sections.length - 1) * 12;
        const backSpace = capacities[1] - reserved;
        if (backSpace < 0) continue;
        const available = backSpace >= 100 ? [frontSpace, frontSpace, backSpace, backSpace] : [frontSpace, frontSpace];
        try {
          const candidate = fitNewsletterWholeBlocks(stories, available, measure, hasBackSections && backSpace >= 200);
          if (candidate.length <= available.length) {
            selected = { columns: candidate, posters: posterSection, partners: partnerSection };
            break;
          }
        } catch { /* Try a smaller, still readable composition. */ }
    }
    if (!selected) throw new Error("Le contenu dépasse une A4 recto verso même à 8 points. Réduisez manuellement une rubrique ou retirez un visuel ; aucun texte ni image n’a été supprimé.");
    const { columns } = selected;
    const total = hasBackSections || columns.length > 2 ? 2 : 1;
    const result: string[] = [];
    for (let index = 0; index < total; index++) {
      const article = paper(data, index);
      const content = element("div", undefined, { display: "flex", flexDirection: "column", flex: "1", minHeight: "0", gap: index ? "12px" : "0", justifyContent: index ? "space-between" : "start" });
      content.dataset.newsletterContent = "true";
      if (!index && introduction.length && !introInColumns) content.append(intro);
      const pageColumns = columns.slice(index * 2, index * 2 + 2);
      if (pageColumns.length) {
        const grid = element("div", undefined, { display: "grid", gridTemplateColumns: pageColumns.length === 1 ? "1fr" : "1fr 1fr", gap: "28px", minHeight: "0", alignContent: "start" });
        for (const column of pageColumns) {
          const node = element("div", undefined, { display: "flex", flexDirection: "column", gap: `${blockGap(column.fontSize)}px`, minWidth: "0" });
          column.blocks.forEach(block => node.append(renderDocumentBlock(block, column.fontSize)));
          grid.append(node);
        }
        content.append(grid);
      }
      if (!index && photosNode) { photosNode.style.marginTop = "18px"; content.append(photosNode); }
      if (index && selected.posters) content.append(selected.posters);
      if (index && selected.partners) content.append(selected.partners);
      article.append(content, footer(data, index, total));
      root.style.width = `${PAPER.width}px`; root.replaceChildren(article);
      const bounds = content.getBoundingClientRect();
      const overflow = Array.from(content.querySelectorAll<HTMLElement>("section, [data-newsletter-text], img")).some(node => {
        const r = node.getBoundingClientRect();
        return r.bottom > bounds.bottom + 1 || r.right > bounds.right + 1 || r.left < bounds.left - 1;
      });
      if (overflow || content.scrollHeight > content.clientHeight + 1) throw new Error(`Le ${index ? "verso" : "recto"} est trop chargé. Raccourcissez une rubrique ou retirez un visuel. Aucun contenu n’a été masqué.`);
      result.push(article.outerHTML);
    }
    return result;
  } finally { root.remove(); }
}
