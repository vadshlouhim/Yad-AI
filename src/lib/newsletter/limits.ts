/** Shared by the editor and the measured print layout. */
export const NEWSLETTER_MEDIA_LIMIT = 8;
export const NEWSLETTER_IMAGES_PER_ROW = 4;

export function newsletterImagesPerRow(count: number): number {
  // Balance the final two rows (5 => 3 + 2, 8 => 4 + 4).
  return Math.max(1, Math.ceil(count / Math.max(1, Math.ceil(count / NEWSLETTER_IMAGES_PER_ROW))));
}
