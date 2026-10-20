export const NEWSLETTER_ERROR_CODES = {
  layoutOverflow: "LAYOUT_OVERFLOW",
  printableOverflow: "PRINTABLE_OVERFLOW",
  imageUnavailable: "IMAGE_UNAVAILABLE",
  studyUnavailable: "STUDY_UNAVAILABLE",
  invalidRequest: "INVALID_REQUEST",
  unauthenticated: "UNAUTHENTICATED",
  communityUnavailable: "COMMUNITY_UNAVAILABLE",
  aiUnavailable: "AI_UNAVAILABLE",
  sourceUnavailable: "SOURCE_UNAVAILABLE",
  draftConflict: "DRAFT_CONFLICT",
  payloadTooLarge: "PAYLOAD_TOO_LARGE",
  saveUnavailable: "SAVE_UNAVAILABLE",
  headerTooLarge: "HEADER_TOO_LARGE",
  invalidDate: "INVALID_DATE",
  invalidAiResponse: "AI_INVALID_RESPONSE",
  invalidImage: "INVALID_IMAGE",
  emptyFile: "EMPTY_FILE",
  sourceTooLarge: "SOURCE_TOO_LARGE",
  uploadFailed: "UPLOAD_FAILED",
} as const;

export type NewsletterErrorCode = typeof NEWSLETTER_ERROR_CODES[keyof typeof NEWSLETTER_ERROR_CODES];

export class NewsletterError extends Error {
  constructor(
    public readonly code: NewsletterErrorCode,
    public readonly details?: Record<string, unknown>,
  ) {
    super(code);
    this.name = "NewsletterError";
  }
}

export function newsletterErrorCode(error: unknown): NewsletterErrorCode | null {
  if (error instanceof NewsletterError) return error.code;
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code?: unknown }).code);
    return Object.values(NEWSLETTER_ERROR_CODES).includes(code as NewsletterErrorCode) ? code as NewsletterErrorCode : null;
  }
  return null;
}
