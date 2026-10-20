import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function decodeHtml(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function metaContent(html: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1]);
  }
  return "";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ code: "UNAUTHENTICATED" }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { url?: unknown };
  const rawUrl = typeof body.url === "string" ? body.url.trim() : "";
  let source: URL;
  try {
    source = new URL(rawUrl);
  } catch {
    return NextResponse.json({ code: "INVALID_SOURCE_URL" }, { status: 400 });
  }

  if (source.protocol !== "https:" || source.hostname !== "fr.chabad.org") {
    return NextResponse.json({ code: "INVALID_SOURCE_HOST" }, { status: 400 });
  }

  try {
    const response = await fetch(source, {
      headers: { "Accept-Language": "fr-FR,fr;q=0.9", "User-Agent": "EasyCom-IA newsletter source reader" },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    const html = await response.text();
    if (!response.ok || /just a moment|cf-chl|challenge-platform/i.test(html)) {
      return NextResponse.json({ code: "SOURCE_BLOCKED" }, { status: 424 });
    }

    const title = metaContent(html, "og:title") || metaContent(html, "twitter:title");
    const excerpt = metaContent(html, "og:description") || metaContent(html, "description");
    if (!title || !excerpt || excerpt.length > 950) {
      return NextResponse.json({ code: "SOURCE_CONTENT_MISSING" }, { status: 422 });
    }

    return NextResponse.json({ title, excerpt, url: source.toString() });
  } catch {
    return NextResponse.json({ code: "SOURCE_UNAVAILABLE" }, { status: 502 });
  }
}
