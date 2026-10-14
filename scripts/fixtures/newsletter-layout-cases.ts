import type { NewsletterDocumentData } from "../../src/lib/newsletter/document-layout";

export function sampleImage(id: string, width: number, height: number) {
  const color = id.startsWith("photo") ? "#2b7380" : id.startsWith("poster") ? "#ad7135" : "#57678d";
  return { id, name: id, url: "data:image/svg+xml," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${color}"/><rect x="4" y="4" width="${width - 8}" height="${height - 8}" fill="none" stroke="white" stroke-width="4"/><text x="12" y="35" font-size="22" fill="white">${id}</text><text x="12" y="${height - 20}" font-size="16" fill="white">Image entière ${width} × ${height}</text></svg>`), };
}

export function baseNewsletter(): NewsletterDocumentData {
  return {
    community: { id: "fixture", name: "Beth Habad de Vanves", city: "Vanves", timezone: "Europe/Paris", address: null, phone: null, email: "contact@example.org", website: null, logoUrl: null, coverUrl: null, isBethHabad: true, donationUrl: "https://www.allodons.fr/exemple" },
    generated: { title: "Le Chabaton", intro: "Chers amis de la communauté, un Chabbat rempli de sérénité et d’inspiration vous attend à Vanves. Venez partager ces moments précieux avec nous.", ravWord: "Un message de paix et de partage. ".repeat(15), shabbatNote: "Cette semaine, partageons un moment ensemble. ".repeat(8), eventIntro: "Retrouvons-nous dimanche.", restaurantAd: "", proofreadNote: "", warnings: [] },
    enabled: { ravWord: true, shabbat: true, photos: true, posters: true, parness: true, kiddush: true, events: true, birthdays: true, restaurantAd: true, seferHamitsvot: true, support: true },
    parnessText: "Famille Cohen", kiddushText: "Famille Levy", bannerPhotoUrl: "",
    events: [{ id: "1", title: "Rencontre communautaire", startDate: "2026-10-18T10:00:00Z", endDate: null, location: null, category: null, description: "Nous vous attendons nombreux." }],
    birthdays: [{ id: "1", name: "David", hebrewDate: "10 Tichri", gregorianDate: "2026-10-18" }],
    shabbat: { date: "2026-10-16", parasha: "Parachah Noah", hebrewDate: "6 Cheshvan 5787", entry: "18:41", exit: "20:01" },
    seferHamitsvot: { date: "2026-10-17", dateLabel: "samedi 17 octobre 2026", text: "Texte témoin de l’étude, conservé intégralement. ".repeat(30), sourceUrl: "https://www.loubavitch.fr/etude/etudes-quotidiennes/251702/sefer-hamitsvot" },
    photos: [], posters: [], partnerAds: [],
  };
}

export function newsletterLayoutCases() {
  const cases: Array<{ name: string; data: NewsletterDocumentData }> = [];
  for (let count = 0; count <= 8; count++) for (const portrait of [false, true]) {
    const data = baseNewsletter();
    data.photos = Array.from({ length: count }, (_, i) => sampleImage("photo-" + i, portrait ? 300 : 600, portrait ? 600 : 300));
    data.posters = Array.from({ length: count }, (_, i) => sampleImage("poster-" + i, i % 2 ? 600 : 300, i % 2 ? 300 : 600));
    data.partnerAds = [sampleImage("partner-0", 500, 200)];
    cases.push({ name: "gallery-" + count + (portrait ? "-portrait" : "-landscape"), data });
  }
  // Reproduce the structure, text lengths and image proportions of the two
  // supplied PDFs; illustrations are explicit test placeholders, not originals.
  const a = baseNewsletter();
  a.enabled.events = false; a.enabled.birthdays = false;
  a.generated.ravWord = "Chers membres de notre communauté,\n\nLe Chabbat prochain, nous aurons le privilège de lire la Paracha de Noa’h. Cette section de la Torah nous invite à réfléchir sur des thèmes intemporels de renouvellement et de persévérance face aux défis. L’histoire de Noa’h, sa famille et l’arche est une source d’inspiration pour chacun d’entre nous, nous rappelant la force de la foi et la capacité de l’humanité à surmonter les épreuves. Que cette Paracha nous éclaire et nous inspire à construire un monde meilleur, empreint de justice et de compassion.\n\nChabbat Chalom !";
  a.generated.shabbatNote = "La Paracha Noah débute après le déluge et le renouveau du monde. D.ieu établit l’alliance avec Noah et sa descendance, symbolisée par l’arc-en-ciel. Elle raconte ensuite l’épisode de la Tour de Babel, où les hommes, voulant atteindre le ciel, et la confusion des langues. La Paracha se conclut avec la généalogie menant à Avraham, jetant les bases du peuple juif.";
  a.photos = [[400, 400], [300, 400], [400, 400], [530, 400], [300, 400]].map(([w, h], i) => sampleImage("photo-" + i, w, h));
  a.posters = [sampleImage("poster-0", 420, 594), sampleImage("poster-1", 420, 594)];
  a.partnerAds = [sampleImage("partner-logo", 300, 300)];
  cases.push({ name: "provided-a", data: a });
  const b = structuredClone(a);
  b.enabled.seferHamitsvot = false;
  b.generated.ravWord += "\n\nCette semaine, réfléchissons à notre propre rôle. Sommes-nous prêts à construire notre arche personnelle, à nous isoler du tumulte pour nous rapprocher de l’essentiel, à nos valeurs ?";
  b.generated.shabbatNote += " La paracha se poursuit avec l’épisode de la Tour de Babel et la dispersion des peuples, se terminant par la généalogie d’Avram.";
  b.photos = [[400, 400], [300, 450], [400, 400]].map(([w, h], i) => sampleImage("photo-" + i, w, h));
  b.posters = Array.from({ length: 3 }, (_, i) => sampleImage("poster-" + i, 420, 594));
  b.partnerAds = [sampleImage("partner-affiche", 420, 594)];
  cases.push({ name: "provided-b", data: b });
  const single = baseNewsletter();
  single.enabled.seferHamitsvot = false; single.enabled.shabbat = false; single.enabled.events = false; single.enabled.birthdays = false;
  single.enabled.parness = false; single.enabled.kiddush = false; single.enabled.support = false;
  cases.push({ name: "single-article", data: single });
  const extreme = structuredClone(b);
  extreme.photos = [sampleImage("photo-panorama", 2000, 100), sampleImage("photo-tall", 100, 2000)];
  cases.push({ name: "extreme-proportions", data: extreme });
  const long = structuredClone(a);
  long.generated.ravWord = "TrèsLongMotSansEspace".repeat(65);
  cases.push({ name: "long-unbroken-text", data: long });
  return cases;
}
