import { FALLBACK_MAIN_VIDEO, MAIN_VIDEO_URL } from "@/components/home/home-media";

// A fresh URL on every page request also bypasses old CDN/browser copies when
// the owner replaces the file at the same Storage path.
export async function resolveHomeMainVideo() {
  const url = `${MAIN_VIDEO_URL}?v=${Date.now()}`;
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Range: "bytes=0-31" },
      signal: AbortSignal.timeout(5000),
    });
    if (response.status !== 206 || !response.headers.get("content-type")?.startsWith("video/mp4")) {
      await response.body?.cancel();
      return FALLBACK_MAIN_VIDEO;
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!new TextDecoder().decode(bytes).includes("ftyp")) return FALLBACK_MAIN_VIDEO;
    return url;
  } catch {
    return FALLBACK_MAIN_VIDEO;
  }
}
