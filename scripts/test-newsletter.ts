import assert from "node:assert/strict";
import sharp from "sharp";
import { createDraftSaveQueue } from "../src/lib/newsletter/save-queue";
import { MAX_SOURCE_BYTES, prepareNewsletterImage, resolveNewsletterBanner, uploadNewsletterBatch } from "../src/lib/newsletter/media";
import { paginateNewsletter, fitNewsletterColumns, fitNewsletterWholeBlocks, supportCommunityName, type DocumentBlock } from "../src/lib/newsletter/document-layout";
import { newsletterGeneratedText } from "../src/lib/newsletter/generated-text";
import { limitNewsletterText, NEWSLETTER_PHOTO_LIMIT, NEWSLETTER_POSTER_LIMIT, NEWSLETTER_RAV_WORD_LIMIT, newsletterImagesPerRow } from "../src/lib/newsletter/limits";
import { isNewsletterStoragePathOwnedBy, newsletterExportImageUrl, newsletterLogoImageUrl, newsletterStoragePathFromPublicUrl } from "../src/lib/newsletter/media-path";
import { newsletterShabbatDate, newsletterStudyDateLabel } from "../src/lib/newsletter/shabbat-study";
import { DEFAULT_NEWSLETTER_LABELS, parseNewsletterLabels, resolveNewsletterLabels } from "../src/lib/newsletter/labels";
import { parseNewsletterDraft } from "../src/components/newsletter/newsletter-paper-client";
import { NEWSLETTER_OUTPUT_BYTES, normalizeNewsletterImage, normalizeNewsletterLogo } from "../src/lib/newsletter/server-image";
import { formatKiddushSponsor, NEWSLETTER_CHALLOT_ICON_URL } from "../src/lib/newsletter/kiddush";

async function main() {
  const supabaseUrl = "https://project.supabase.co";
  const storedImage = `${supabaseUrl}/storage/v1/object/public/community-assets/chat-attachments/community-1/photo.jpg?v=123`;
  assert.equal(newsletterStoragePathFromPublicUrl(storedImage, supabaseUrl), "chat-attachments/community-1/photo.jpg");
  assert.equal(newsletterExportImageUrl(storedImage, supabaseUrl), "/api/newsletter/image?path=chat-attachments%2Fcommunity-1%2Fphoto.jpg");
  assert.equal(newsletterLogoImageUrl(storedImage, supabaseUrl), "/api/newsletter/image?path=chat-attachments%2Fcommunity-1%2Fphoto.jpg&variant=logo");
  assert.equal(newsletterExportImageUrl("https://example.com/photo.jpg", supabaseUrl), "https://example.com/photo.jpg");
  assert.equal(newsletterStoragePathFromPublicUrl(`${supabaseUrl}/storage/v1/object/public/community-assets/community-1/../secret.jpg`, supabaseUrl), null);
  assert.equal(isNewsletterStoragePathOwnedBy("community-1/logo.png", "community-1"), true);
  assert.equal(isNewsletterStoragePathOwnedBy("chat-attachments/community-1/photo.jpg", "community-1"), true);
  assert.equal(isNewsletterStoragePathOwnedBy("newsletter/community-1/photo.jpg", "community-1"), true);
  assert.equal(isNewsletterStoragePathOwnedBy("chat-attachments/community-2/photo.jpg", "community-1"), false);
  assert.equal(isNewsletterStoragePathOwnedBy("community-1/../community-2/photo.jpg", "community-1"), false);
  assert.deepEqual(parseNewsletterLabels({ parness: "  Pour l’élévation de l’âme  ", unknown: "interdit", agenda: "" }), { parness: "Pour l’élévation de l’âme" });
  assert.equal(resolveNewsletterLabels({ agenda: "Nos rendez-vous" }, { parness: "Dédicace du jour" }).agenda, "Nos rendez-vous");
  assert.equal(resolveNewsletterLabels({ agenda: "Nos rendez-vous" }, { parness: "Dédicace du jour" }).parness, "Dédicace du jour");
  assert.equal(resolveNewsletterLabels({}, {}).photos, DEFAULT_NEWSLETTER_LABELS.photos);
  const migratedDraft = parseNewsletterDraft({ version: 1, title: "Ancien feuillet", enabled: {}, generated: { title: "Ancien feuillet" } }, "", "");
  assert.equal(migratedDraft?.version, 2);
  assert.deepEqual(migratedDraft?.manualBirthdays, []);
  assert.equal(migratedDraft?.specificEventText, "");
  assert.deepEqual(migratedDraft?.labelOverrides, {});
  const configurableDraft = parseNewsletterDraft({ version: 2, enabled: { shabbat: false }, generated: { ravWord: "x".repeat(900) } }, "", "");
  assert.equal(configurableDraft?.enabled.shabbat, false, "Le RÃ©sumÃ© de la Paracha doit pouvoir Ãªtre retirÃ© dans Composer");
  assert.equal(configurableDraft?.generated.ravWord.length, NEWSLETTER_RAV_WORD_LIMIT, "Les anciens Mots du Rav sont ramenÃ©s Ã  la limite de 700 caractÃ¨res");
  assert.equal(resolveNewsletterBanner(undefined, "https://cdn.test/logo.png"), "https://cdn.test/logo.png");
  assert.equal(resolveNewsletterBanner("", "https://cdn.test/logo.png"), "https://cdn.test/logo.png");
  assert.equal(resolveNewsletterBanner("https://cdn.test/custom.png", "https://cdn.test/logo.png"), "https://cdn.test/custom.png");
  assert.equal(newsletterShabbatDate("2026-10-16"), "2026-10-17");
  assert.equal(newsletterShabbatDate("2027-12-31"), "2028-01-01");
  assert.equal(newsletterShabbatDate("2024-03-29"), "2024-03-30");
  assert.match(newsletterStudyDateLabel("2026-10-17"), /samedi 17 octobre 2026/);
  assert.throws(() => newsletterShabbatDate("2026-10-17"));
  assert.throws(() => newsletterShabbatDate("2026-02-31"));
  assert.equal(NEWSLETTER_PHOTO_LIMIT, 6);
  assert.equal(NEWSLETTER_POSTER_LIMIT, 3);
  assert.equal(NEWSLETTER_RAV_WORD_LIMIT, 700);
  assert.ok(limitNewsletterText("mot ".repeat(300), NEWSLETTER_RAV_WORD_LIMIT).length <= NEWSLETTER_RAV_WORD_LIMIT);
  assert.equal(newsletterImagesPerRow(8), 4);
  assert.equal(newsletterImagesPerRow(5), 3);
  for (let count = 0; count <= 40; count++) {
    assert.ok(newsletterImagesPerRow(count) >= 1 && newsletterImagesPerRow(count) <= 4,
      "Even legacy galleries must never exceed four whole images per row");
  }
  assert.equal(supportCommunityName("Beth Habad Vanves"), "du Beth Habad Vanves");
  assert.equal(supportCommunityName("Le Beth Habad Vanves"), "du Beth Habad Vanves");
  assert.equal(supportCommunityName("Synagogue Vanves"), "de la Synagogue Vanves");
  assert.equal(formatKiddushSponsor("Famille Cohen"), "la famille Cohen");
  assert.equal(formatKiddushSponsor("la famille Cohen"), "la famille Cohen");
  assert.equal(formatKiddushSponsor("David Cohen"), "David Cohen");
  assert.equal(formatKiddushSponsor("Communauté séfarade"), "la communauté séfarade");
  assert.equal(NEWSLETTER_CHALLOT_ICON_URL, "/newsletter/challot-icon.png");
  const files = ["a.jpg", "broken.jpg", "b.jpg"].map((name) => new File(["image"], name));
  const uploaded: string[] = [];
  const progress: number[] = [];
  let active = 0;
  const errors = await uploadNewsletterBatch(files, async (file) => {
    assert.equal(++active, 1, "Uploads must be sequential to bound memory");
    await Promise.resolve();
    active--;
    if (file.name === "broken.jpg") throw new Error("Corrupt image");
    return file.name;
  }, (name) => uploaded.push(name), (completed) => progress.push(completed));
  assert.deepEqual(uploaded, ["a.jpg", "b.jpg"], "Partial successes must survive a failed file");
  assert.deepEqual(errors, ["broken.jpg : Corrupt image"]);
  assert.equal(progress.at(-1), 3);

  await assert.rejects(prepareNewsletterImage(new File([], "empty.png")), /vide/);
  await assert.rejects(prepareNewsletterImage(new File(["pdf"], "poster.pdf")), /PDF/);
  assert.equal((await prepareNewsletterImage(new File(["heic"], "iphone.heic", { type: "image/heic" }))).name, "iphone.heic");
  await assert.rejects(prepareNewsletterImage(new File([new Uint8Array(MAX_SOURCE_BYTES + 1)], "huge.jpg")), /20 Mo/);
  const sourceImage = await sharp({ create: { width: 3200, height: 1800, channels: 3, background: "#336699" } }).png().toBuffer();
  const normalizedImage = await normalizeNewsletterImage(sourceImage);
  const normalizedMetadata = await sharp(normalizedImage).metadata();
  assert.equal(normalizedMetadata.format, "jpeg");
  assert.equal(Math.max(normalizedMetadata.width ?? 0, normalizedMetadata.height ?? 0), 2400);
  assert.ok(normalizedImage.length <= NEWSLETTER_OUTPUT_BYTES);
  const logoSource = await sharp(Buffer.from('<svg width="200" height="120"><rect width="200" height="120" fill="white"/><circle cx="100" cy="60" r="50" fill="#123f34"/><circle cx="100" cy="60" r="18" fill="white"/></svg>')).png().toBuffer();
  const normalizedLogo = await normalizeNewsletterLogo(logoSource);
  const { data: logoPixels, info: logoInfo } = await sharp(normalizedLogo).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal((await sharp(normalizedLogo).metadata()).format, "png");
  assert.ok(logoInfo.width < 200 && logoInfo.height < 120, "Le fond blanc du logo doit être rogné.");
  assert.equal(logoPixels[3], 0, "Le fond relié aux bords doit devenir transparent.");
  const logoCenter = (Math.floor(logoInfo.height / 2) * logoInfo.width + Math.floor(logoInfo.width / 2)) * 4;
  assert.equal(logoPixels[logoCenter + 3], 255, "Les détails blancs enfermés dans le logo doivent rester opaques.");
  const invalidHeic = Buffer.alloc(32);
  invalidHeic.write("ftyp", 4, "ascii");
  invalidHeic.write("heic", 8, "ascii");
  await assert.rejects(normalizeNewsletterImage(invalidHeic), /HEIC|decode|failed|Image/i);

  const saved: number[] = [];
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  const queue = createDraftSaveQueue<number>(async (draft) => {
    if (draft === 1) await held;
    saved.push(draft);
  });
  const first = queue.push(1);
  await Promise.resolve();
  queue.push(2);
  const last = queue.push(3);
  assert.deepEqual(saved, [], "A later save must not overtake an in-flight save");
  release();
  await Promise.all([first, last]);
  assert.deepEqual(saved, [1, 3], "Only the newest pending snapshot should be saved");
  await queue.push(4);
  assert.deepEqual(saved, [1, 3, 4], "The queue must accept new writes after draining");

  const fullText = ("La communauté se retrouve pour partager un moment de Torah.\n\n").repeat(80);
  assert.equal(newsletterGeneratedText(fullText),fullText.trim(),"Generated text must not be cut at legacy character limits");
  assert.equal(newsletterGeneratedText({unexpected:true},"Texte de secours"),"Texte de secours");
  const blocks: DocumentBlock[] = [
    { kind: "text", id: "rav", title: "Mot du Rav", text: fullText },
    { kind: "text", id: "kidouch", title: "Kidouch", text: "Famille Cohen", compact: true },
    { kind: "images", id: "poster", title: "Affiche", images: [{id:"p",url:"/p.jpg",name:"Affiche",width:600,height:1200}], height:850,maxHeight:850,poster:true },
  ];
  const measure = (block: DocumentBlock, font: number) => block.kind === "images" ? block.height + 40 : 30 + Math.ceil(block.text.length / 60) * font * 1.5;
  const pages = paginateNewsletter(blocks, () => 780, measure);
  assert.ok(pages.length > 2, "Internal text column packing can span several columns, not printed sheets");
  assert.throws(() => fitNewsletterColumns([{kind:"text",id:"long",title:"Mot du Rav",text:fullText.repeat(4)}], [780,780], measure), /8 points/, "Only physically impossible content should block export");
  const denseText="Torah ".repeat(800);
  const condensed=fitNewsletterColumns([{kind:"text",id:"dense",title:"Mot du Rav",text:denseText}], [600,600], measure);
  assert.ok(condensed.length <= 2 && condensed.some(column=>column.fontSize < 11),"Dense text should shrink automatically to fit both faces");
  assert.equal(condensed.flatMap(column=>column.blocks).map(block=>block.kind==="text"?block.text:"").join(""),denseText);
  const fitted = fitNewsletterColumns([{kind:"text",id:"short",title:"Mot du Rav",text:"Chabbat Chalom."}], [780,780], measure);
  assert.ok(fitted.length <= 2);
  assert.equal(fitted[0].fontSize,13);
  const articles: DocumentBlock[] = [{kind:"text",id:"one",title:"Rav",text:"Torah ".repeat(40)},{kind:"text",id:"two",title:"Paracha",text:"Chabbat ".repeat(20)}];
  const balanced = fitNewsletterColumns(articles,[780,780,780,780],measure);
  assert.equal(balanced.length,2,"Short editions should balance whole articles across the first two columns");
  assert.ok(balanced.every(column=>column.blocks.every(block=>block.kind!=="text" || !block.continuation)));
  assert.equal(balanced.flatMap(column=>column.blocks).map(block=>block.kind==="text"?block.text:"").join(""), articles.map(block=>block.kind==="text"?block.text:"").join(""));
  const wholeArticles: DocumentBlock[] = [
    { kind: "text", id: "rav", title: "Mot du Rav", text: "Texte du Rav ".repeat(45) },
    { kind: "text", id: "agenda", title: "Agenda", text: "Rendez-vous ".repeat(35) },
    { kind: "text", id: "support", title: "Soutien", text: "Merci à tous." },
  ];
  const whole = fitNewsletterWholeBlocks(wholeArticles, [440, 440, 440, 440], measure);
  assert.deepEqual(whole.flatMap(column => column.blocks.map(block => block.id)), wholeArticles.map(block => block.id), "Each section must stay whole and in order");
  assert.ok(whole.every(column => column.blocks.every(block => block.kind !== "text" || !block.continuation)), "No section may carry a suite marker");
  const spread = fitNewsletterWholeBlocks(wholeArticles, [440, 440, 440, 440], measure, true);
  assert.ok(spread.slice(2).some(column => column.blocks.length > 0), "Whole articles can fill available verso space beside the visuals");
  assert.throws(() => fitNewsletterWholeBlocks([{ kind: "text", id: "too-long", title: "Mot du Rav", text: "Torah ".repeat(2500) }], [600, 600], measure), /entière/, "Oversized articles need a clear adjustment message, not splitting");
  assert.equal(pages.flatMap(p=>p.blocks).filter(b=>b.kind === "text" && b.id === "rav").map(b=>b.kind === "text" ? b.text : "").join(""), fullText, "Pagination must preserve every character, including paragraph breaks");
  for (const page of pages) {
    assert.ok(page.fontSize >= 11 && page.fontSize <= 13);
    assert.ok(page.blocks.reduce((sum,b)=>sum+measure(b,page.fontSize),Math.max(0,page.blocks.length-1)*18)<=780.1, "No page may overflow");
  }
  assert.equal(pages.flatMap(p=>p.blocks).filter(b=>b.id === "poster").length,1,"Posters must remain whole");
  const shortPages = paginateNewsletter([{kind:"text",id:"short",title:"Mot du Rav",text:"Chabbat Chalom."}],()=>780,measure);
  assert.equal(shortPages.length,1);
  assert.equal(shortPages[0].fontSize,13,"Sparse pages should use the largest readable font");
  const unbroken="x".repeat(5000);
  assert.equal(paginateNewsletter([{kind:"text",id:"url",title:"Lien",text:unbroken}],()=>780,measure).flatMap(p=>p.blocks).map(b=>b.kind === "text"?b.text:"").join(""),unbroken);
  console.log("Newsletter: partial uploads, validation, progress and ordered autosave passed.");
  console.log("Newsletter: strict recto-verso capacity, complete text, long words, whole posters and adaptive font sizes passed.");
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });
