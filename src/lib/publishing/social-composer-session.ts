const SOCIAL_COMPOSER_SESSION_KEY = "easycom-social-composer-draft";
const MAX_DRAFT_AGE_MS = 6 * 60 * 60 * 1000;

export type SocialComposerNetwork = "FACEBOOK" | "INSTAGRAM" | "WHATSAPP";

export type SocialComposerDraft = {
  version: 1;
  savedAt: number;
  message: string;
  mediaUrls: string[];
  mediaNames: string[];
  selectedNetworks: SocialComposerNetwork[];
  selectedContacts: string[];
  generatedImageAdded?: boolean;
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function clearDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SOCIAL_COMPOSER_SESSION_KEY);
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

function readDraft(): SocialComposerDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(SOCIAL_COMPOSER_SESSION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<SocialComposerDraft>;
    const networks = value.selectedNetworks;
    const validNetworks = Array.isArray(networks) && networks.every(
      (network) => network === "FACEBOOK" || network === "INSTAGRAM" || network === "WHATSAPP"
    );
    const valid = value.version === 1
      && typeof value.savedAt === "number"
      && typeof value.message === "string"
      && isStringArray(value.mediaUrls)
      && isStringArray(value.mediaNames)
      && validNetworks
      && isStringArray(value.selectedContacts);

    if (!valid || Date.now() - value.savedAt! > MAX_DRAFT_AGE_MS) {
      clearDraft();
      return null;
    }

    return value as SocialComposerDraft;
  } catch {
    clearDraft();
    return null;
  }
}

export function rememberSocialComposerDraft(
  draft: Omit<SocialComposerDraft, "version" | "savedAt" | "generatedImageAdded">
): boolean {
  if (typeof window === "undefined") return false;

  try {
    window.sessionStorage.setItem(SOCIAL_COMPOSER_SESSION_KEY, JSON.stringify({
      ...draft,
      version: 1,
      savedAt: Date.now(),
    } satisfies SocialComposerDraft));
    return true;
  } catch {
    return false;
  }
}

export function attachGeneratedImageToSocialComposer(imageUrl: string, imageName: string): boolean {
  if (typeof window === "undefined") return false;
  const draft = readDraft();
  if (!draft) return false;

  try {
    const existingIndex = draft.mediaUrls.indexOf(imageUrl);
    const mediaUrls = existingIndex >= 0 ? draft.mediaUrls : [...draft.mediaUrls, imageUrl];
    const mediaNames = existingIndex >= 0 ? draft.mediaNames : [...draft.mediaNames, imageName];
    window.sessionStorage.setItem(SOCIAL_COMPOSER_SESSION_KEY, JSON.stringify({
      ...draft,
      savedAt: Date.now(),
      mediaUrls,
      mediaNames,
      generatedImageAdded: true,
    } satisfies SocialComposerDraft));
    return true;
  } catch {
    return false;
  }
}

export function takeSocialComposerDraft(): SocialComposerDraft | null {
  const draft = readDraft();
  clearDraft();
  return draft;
}
