/**
 * Shared by the editor, AI routes and the measured print layout.
 * The text lengths below are recommendations: the editor shows a hint past them and the AI
 * keeps the texts it writes within them, but a client's own text is never cut or refused.
 */
export const NEWSLETTER_PHOTO_LIMIT = 6;
export const NEWSLETTER_POSTER_LIMIT = 3;
export const NEWSLETTER_RAV_WORD_LIMIT = 700;
export const NEWSLETTER_INTRO_LIMIT = 360;
export const NEWSLETTER_PARASHA_LIMIT = 700;
export const NEWSLETTER_SEFER_LIMIT = 1000;
export const NEWSLETTER_EVENT_INTRO_LIMIT = 300;
export const NEWSLETTER_SPECIFIC_EVENT_LIMIT = 800;
export const NEWSLETTER_IMAGES_PER_ROW = 4;
/** Technical ceiling only (a pasted document), far above any real newsletter section. */
export const NEWSLETTER_TEXT_HARD_LIMIT = 20000;
/** A newsletter grows page by page as needed; past this it is a pasted document, not a newsletter. */
export const NEWSLETTER_MAX_PAGES = 20;

export function limitNewsletterText(text: string, maxLength: number) {
  const clean = text.trim();
  if (clean.length <= maxLength) return clean;
  const candidate = clean.slice(0, maxLength + 1);
  const boundary = Math.max(candidate.lastIndexOf(" "), candidate.lastIndexOf("\n"));
  return clean.slice(0, boundary >= Math.floor(maxLength * 0.75) ? boundary : maxLength).trimEnd();
}

export function newsletterImagesPerRow(count: number): number {
  // Balance the final two rows (5 => 3 + 2, 8 => 4 + 4).
  return Math.max(1, Math.ceil(count / Math.max(1, Math.ceil(count / NEWSLETTER_IMAGES_PER_ROW))));
}
