export type SocialComposerNetwork = "FACEBOOK" | "INSTAGRAM";

export type SocialComposerTexts = Record<SocialComposerNetwork, string>;

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

export function resolveManualPublishText(prompt: string, preparedText: string): string {
  return preparedText.trim() || prompt.trim();
}
