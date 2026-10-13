/** Output length is handled by pagination, never by cutting an AI sentence. */
export function newsletterGeneratedText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}
