const COMMUNITY_ASSETS_PUBLIC_PREFIX = "/storage/v1/object/public/community-assets/";

export function newsletterStoragePathFromPublicUrl(
  value: string,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
) {
  try {
    const source = new URL(value);
    const supabase = new URL(supabaseUrl);
    if (source.protocol !== supabase.protocol || source.host !== supabase.host) return null;
    const rawPathname = decodeURIComponent(value.slice(source.origin.length).split(/[?#]/, 1)[0]);
    if (rawPathname.split("/").some((part) => part === "." || part === "..")) return null;
    if (!source.pathname.startsWith(COMMUNITY_ASSETS_PUBLIC_PREFIX)) return null;

    const path = decodeURIComponent(source.pathname.slice(COMMUNITY_ASSETS_PUBLIC_PREFIX.length));
    if (!path || path.startsWith("/") || path.split("/").some((part) => !part || part === "." || part === "..")) return null;
    return path;
  } catch {
    return null;
  }
}

export function newsletterExportImageUrl(value: string, supabaseUrl?: string) {
  const path = newsletterStoragePathFromPublicUrl(value, supabaseUrl);
  return path ? `/api/newsletter/image?path=${encodeURIComponent(path)}` : value;
}

export function isNewsletterStoragePathOwnedBy(path: string, ownerId: string) {
  if (!path || !ownerId || path.startsWith("/") || path.split("/").some((part) => !part || part === "." || part === "..")) return false;
  return path.startsWith(`${ownerId}/`) || path.startsWith(`chat-attachments/${ownerId}/`) || path.startsWith(`newsletter/${ownerId}/`);
}
