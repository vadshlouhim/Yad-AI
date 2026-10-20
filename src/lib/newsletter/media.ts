import { newsletterExportImageUrl } from "./media-path";
import { NEWSLETTER_ERROR_CODES, NewsletterError } from "./errors";

export const NEWSLETTER_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif,image/bmp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.gif,.avif,.bmp,.heic,.heif";
export const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

export function resolveNewsletterBanner(
  customBannerUrl: unknown,
  communityLogoUrl: string | null,
) {
  return typeof customBannerUrl === "string" && customBannerUrl.trim()
    ? customBannerUrl.trim()
    : communityLogoUrl ?? "";
}

/** Decode before uploading: unsupported/corrupt files must never become broken images. */
export async function prepareNewsletterImage(file: File): Promise<File> {
  if (!file.size) throw new NewsletterError(NEWSLETTER_ERROR_CODES.emptyFile);
  if (file.size > MAX_SOURCE_BYTES) throw new NewsletterError(NEWSLETTER_ERROR_CODES.sourceTooLarge);
  if (!/\.(jpe?g|png|webp|gif|avif|bmp|heic|heif)$/i.test(file.name) && !/^image\/(jpeg|png|webp|gif|avif|bmp|heic|heif)$/.test(file.type)) {
    throw new NewsletterError(NEWSLETTER_ERROR_CODES.invalidImage);
  }
  return file;
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

export async function uploadNewsletterImage(file: File, target: "image" | "logo" = "image") {
  const prepared = await prepareNewsletterImage(file);
  const form = new FormData();
  form.append("file", prepared);
  form.append("target", target);
  const response = await fetchWithTimeout("/api/newsletter/image-upload", {
    method: "POST", body: form,
  }, 90_000);
  const data = await response.json().catch(() => ({})) as { url?: string; name?: string; error?: string; code?: string };
  if (response.status === 401) throw new NewsletterError(NEWSLETTER_ERROR_CODES.unauthenticated);
  if (response.status === 413) throw new NewsletterError(NEWSLETTER_ERROR_CODES.sourceTooLarge);
  if (!response.ok || !data.url) throw new NewsletterError(data.code === "INVALID_IMAGE" ? NEWSLETTER_ERROR_CODES.invalidImage : NEWSLETTER_ERROR_CODES.uploadFailed);
  return { id: crypto.randomUUID(), url: data.url, name: data.name || file.name };
}

/** Sequential uploads bound memory usage and preserve partial successes. */
export async function uploadNewsletterBatch<T>(
  files: File[],
  upload: (file: File) => Promise<T>,
  onSuccess: (result: T) => void,
  onProgress: (completed: number, total: number) => void,
) {
  const errors: string[] = [];
  for (const [index, file] of files.entries()) {
    onProgress(index, files.length);
    try {
      onSuccess(await upload(file));
    } catch (error) {
      errors.push(`${file.name} : ${error instanceof Error ? error.message : NEWSLETTER_ERROR_CODES.uploadFailed}`);
    }
    onProgress(index + 1, files.length);
  }
  return errors;
}

function blobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new NewsletterError(NEWSLETTER_ERROR_CODES.imageUnavailable));
    reader.onload = () => typeof reader.result === "string"
      ? resolve(reader.result)
      : reject(new NewsletterError(NEWSLETTER_ERROR_CODES.imageUnavailable));
    reader.readAsDataURL(blob);
  });
}

/** Embed every exported image so html-to-image cannot silently drop remote media. */
export async function inlineNewsletterExportImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll<HTMLImageElement>("img"));
  const cache = new Map<string, string>();

  // Sequential conversion keeps peak memory predictable with several phone photos.
  for (const image of images) {
    const source = image.currentSrc || image.src;
    if (!source || source.startsWith("data:")) continue;

    let dataUrl = cache.get(source);
    if (!dataUrl) {
      const response = await fetchWithTimeout(newsletterExportImageUrl(source), {
        cache: "no-store",
        credentials: "same-origin",
      }, 30_000);
      if (!response.ok) throw new NewsletterError(NEWSLETTER_ERROR_CODES.imageUnavailable);
      const blob = await response.blob();
      if (!blob.type.startsWith("image/") || !blob.size) throw new NewsletterError(NEWSLETTER_ERROR_CODES.invalidImage);
      dataUrl = await blobAsDataUrl(blob);
      cache.set(source, dataUrl);
    }

    image.removeAttribute("srcset");
    image.src = dataUrl;
    if (typeof image.decode === "function") await image.decode();
    if (!image.complete || !image.naturalWidth) throw new NewsletterError(NEWSLETTER_ERROR_CODES.imageUnavailable);
  }
}
