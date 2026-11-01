export type SocialComposerNetwork = "FACEBOOK" | "INSTAGRAM";

export type SocialComposerTexts = Record<SocialComposerNetwork, string>;

const SOCIAL_COMPOSER_TEXT_LIMITS: Record<SocialComposerNetwork, number> = {
  FACEBOOK: 63_206,
  INSTAGRAM: 2_200,
};

export function resolveSocialComposerTexts(
  idea: string,
  versions: SocialComposerTexts,
): SocialComposerTexts {
  const fallback = idea.trim() || versions.FACEBOOK.trim() || versions.INSTAGRAM.trim();

  return {
    FACEBOOK: versions.FACEBOOK.trim() || fallback,
    INSTAGRAM: versions.INSTAGRAM.trim() || fallback,
  };
}

export function hasSocialComposerContent(
  selectedNetworks: SocialComposerNetwork[],
  texts: SocialComposerTexts,
  mediaUrls: string[],
): boolean {
  return mediaUrls.length > 0 || selectedNetworks.some((network) => Boolean(texts[network].trim()));
}

export function selectSocialComposerTexts(
  selectedNetworks: SocialComposerNetwork[],
  texts: SocialComposerTexts,
): Partial<SocialComposerTexts> {
  return Object.fromEntries(
    selectedNetworks.map((network) => [network, texts[network]]),
  ) as Partial<SocialComposerTexts>;
}

export function getSelectedSocialTextLengthError(
  selectedNetworks: SocialComposerNetwork[],
  texts: Partial<SocialComposerTexts>,
): string | null {
  for (const network of selectedNetworks) {
    const length = texts[network]?.length ?? 0;
    const limit = SOCIAL_COMPOSER_TEXT_LIMITS[network];
    if (length > limit) return `${network} dépasse la limite de ${limit} caractères (${length} caractères saisis).`;
  }
  return null;
}

export function resolveManualPublishText(prompt: string, preparedText: string): string {
  return preparedText.trim() || prompt.trim();
}
