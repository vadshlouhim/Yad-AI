export type NewsletterStudy = { date: string; dateLabel: string; text: string; sourceUrl: string };

/** The newsletter stores Friday's candle-lighting date, not Saturday. */
export function newsletterShabbatDate(friday: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(friday)) throw new Error("Date du Chabbat invalide.");
  const date = new Date(`${friday}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== friday || date.getUTCDay() !== 5) {
    throw new Error("La date des horaires doit correspondre au vendredi.");
  }
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function newsletterStudyDateLabel(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}
