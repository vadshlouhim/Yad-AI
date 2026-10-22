import type { NewsletterDocumentData } from "./document-layout";

export type NewsletterFillSection = { key: string; percent: number };
export type NewsletterFillEstimate = { percent: number; sections: NewsletterFillSection[] };

const textShare = (value: string | undefined, fullAt: number, weight: number) =>
  value?.trim() ? Math.max(2, Math.min(weight, value.trim().length / fullAt * weight)) : 0;

/** Fast, deterministic estimate used by the editor; the measured compositor remains authoritative. */
export function estimateNewsletterFill(data: NewsletterDocumentData): NewsletterFillEstimate {
  const e = data.enabled;
  const sections: NewsletterFillSection[] = [
    { key: "intro", percent: textShare(data.generated.intro, 700, 8) },
    { key: "ravWord", percent: e.ravWord ? textShare(data.generated.ravWord, 700, 16) : 0 },
    { key: "parasha", percent: e.shabbat ? textShare(data.generated.shabbatNote, 700, 12) : 0 },
    { key: "seferHamitsvot", percent: e.seferHamitsvot ? textShare(data.seferHamitsvot?.text, 950, 14) : 0 },
    { key: "agenda", percent: e.events ? Math.min(22, data.events.length * 4 + textShare(data.generated.eventIntro, 300, 5)) : 0 },
    { key: "birthdays", percent: e.birthdays ? Math.min(8, (data.birthdays.length + (data.manualBirthdays?.length ?? 0)) * 1.2) : 0 },
    { key: "community", percent: (e.parness ? 3 : 0) + (e.kiddush ? 3 : 0) },
    { key: "support", percent: e.support ? 4 : 0 },
    { key: "photos", percent: e.photos ? data.photos.length * 6 : 0 },
    { key: "posters", percent: e.posters ? data.posters.length * 15 : 0 },
    { key: "partners", percent: e.restaurantAd ? data.partnerAds.length * 10 : 0 },
    { key: "specificEvent", percent: e.specificEvent ? textShare(data.specificEventText, 900, 12) : 0 },
  ];
  // Shares are calibrated on one recto-verso sheet (2 pages); extra pages add capacity.
  const scale = 2 / (data.layout?.pageLimit ?? 2);
  const fixed = 13;
  const total = fixed + sections.reduce((sum, section) => sum + section.percent, 0);
  return {
    percent: Math.round(total * scale),
    sections: sections.filter(section => section.percent > 0).map(section => ({ ...section, percent: Math.round(section.percent * scale) })),
  };
}
