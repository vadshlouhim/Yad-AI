export const COMMUNITY_PROFILE_LABELS: Record<string, { singular: string; plural: string; display: string }> = {
  SYNAGOGUE: { singular: "synagogue / Beth Habad", plural: "Synagogues / Beth Habad", display: "Synagogue / Beth Habad" },
  RESTAURANT: { singular: "restaurateur", plural: "Restaurateurs", display: "Restaurateur" },
  CATERER: { singular: "traiteur", plural: "Traiteurs", display: "Traiteur" },
  SPORT_COACH: { singular: "coach sportif", plural: "Coachs sportifs", display: "Coach sportif" },
  ASSOCIATION: { singular: "association", plural: "Associations", display: "Association/ONG" },
  SCHOOL: { singular: "école", plural: "Écoles", display: "École/Formation" },
  CENTER: { singular: "centre communautaire", plural: "Centres communautaires", display: "Centre communautaire" },
  COMMERCE: { singular: "commerce", plural: "Commerces", display: "Commerce" },
  BUSINESS: { singular: "entreprise", plural: "Entreprises", display: "Entreprise" },
  CONTENT_CREATOR: { singular: "créateur de contenu", plural: "Créateurs de contenu", display: "Créateur de contenu" },
  RELIGIOUS: { singular: "lieu de culte", plural: "Lieux de culte", display: "Lieu de culte" },
  SPORT: { singular: "structure sport et loisirs", plural: "Structures sport et loisirs", display: "Sport & Loisirs" },
  CULTURE: { singular: "structure culture et arts", plural: "Structures culture et arts", display: "Culture & Arts" },
  PROFESSIONAL: { singular: "réseau professionnel", plural: "Réseaux professionnels", display: "Réseau professionnel" },
  LOCAL: { singular: "structure locale", plural: "Structures locales", display: "Quartier/Local" },
  STUDENT: { singular: "campus étudiants", plural: "Campus étudiants", display: "Étudiants/Campus" },
  ONLINE: { singular: "communauté en ligne", plural: "Communautés en ligne", display: "Communauté en ligne" },
  OTHER: { singular: "profil", plural: "Profils", display: "" },
};

function normalizeCommunityTypeLabel(type: string | null | undefined) {
  if (!type) return "OTHER";

  const normalized = type
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (normalized === "ASSOCIATION/ONG" || normalized === "ASSOCIATION ONG") return "ASSOCIATION";
  if (normalized === "ASSOSATION" || normalized === "ASSOSATION/ONG" || normalized === "ASSOSATION ONG") return "ASSOCIATION";
  if (normalized === "BETH_HABAD" || normalized === "BETH HABAD") return "SYNAGOGUE";

  return normalized;
}

export function getCommunityProfileLabel(
  type: string | null | undefined,
  form: "singular" | "plural" = "singular",
) {
  const key = normalizeCommunityTypeLabel(type);
  return COMMUNITY_PROFILE_LABELS[key]?.[form] ?? COMMUNITY_PROFILE_LABELS.OTHER[form];
}

export function getCommunityProfileDisplayLabel(type: string | null | undefined) {
  const key = normalizeCommunityTypeLabel(type);
  if (COMMUNITY_PROFILE_LABELS[key]?.display) return COMMUNITY_PROFILE_LABELS[key].display;
  if (key && key !== "OTHER") {
    return key
      .split("_")
      .map((part) => `${part.charAt(0)}${part.slice(1).toLowerCase()}`)
      .join(" ");
  }
  return "";
}
