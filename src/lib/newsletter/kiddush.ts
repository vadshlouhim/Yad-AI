export const NEWSLETTER_CHALLOT_ICON_URL = "/newsletter/challot-icon.png";

/** Add the French article expected before a collective sponsor name. */
export function formatKiddushSponsor(value: string) {
  const sponsor = value.trim();
  if (!sponsor) return "";
  if (/^(?:la|le|les|un|une|des|du|de\s+la)(?:\s|$)|^(?:l|de\s+l)[’']/i.test(sponsor)) return sponsor;
  if (/^(?:famille|communauté|synagogue|association|maison)(?:\s|$)/i.test(sponsor)) {
    return `la ${sponsor.charAt(0).toLocaleLowerCase("fr-FR")}${sponsor.slice(1)}`;
  }
  return sponsor;
}
