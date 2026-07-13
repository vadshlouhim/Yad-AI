// Allowlist des champs Community modifiables — partagée entre la route API
// /api/community/settings (PATCH) et l'exécuteur de l'assistant IA.

export const COMMUNITY_SETTINGS_FIELDS = [
  "name", "description", "city", "country", "timezone",
  "phone", "email", "website", "address", "postalCode",
  "tone", "language", "signature", "hashtags", "mentions",
  "editorialRules", "logoUrl", "coverUrl", "vocabulary",
] as const;

/**
 * Sous-ensemble accessible à l'assistant IA :
 * - sans `vocabulary` : contient automationValidationMode — l'assistant ne doit pas
 *   pouvoir se faire passer lui-même en mode automatique (anti-auto-escalade) ;
 * - sans `logoUrl`/`coverUrl` : pas d'upload d'images possible en chat.
 */
export const ASSISTANT_SETTINGS_FIELDS = COMMUNITY_SETTINGS_FIELDS.filter(
  (field) => field !== "vocabulary" && field !== "logoUrl" && field !== "coverUrl"
);

export const TONE_VALUES = ["MODERN", "TRADITIONAL", "FORMAL", "FRIENDLY", "RELIGIOUS"] as const;
