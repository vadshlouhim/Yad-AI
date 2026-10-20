import { NextResponse } from "next/server";
import { isNewsletterStoragePathOwnedBy } from "@/lib/newsletter/media-path";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { normalizeNewsletterLogo } from "@/lib/newsletter/server-image";

export const runtime = "nodejs";

const BUCKET = "community-assets";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ code: "UNAUTHENTICATED" }, { status: 401 });

  const searchParams = new URL(request.url).searchParams;
  const path = searchParams.get("path") ?? "";
  const logoVariant = searchParams.get("variant") === "logo";
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("communityId")
    .eq("id", user.id)
    .single();
  const ownerId = profile?.communityId ?? user.id;
  if (!isNewsletterStoragePathOwnedBy(path, ownerId)) {
    return NextResponse.json({ code: "IMAGE_FORBIDDEN" }, { status: 403 });
  }

  const { data, error } = await admin.storage.from(BUCKET).download(path);
  if (error || !data) return NextResponse.json({ code: "IMAGE_NOT_FOUND" }, { status: 404 });
  if (!data.type.startsWith("image/")) return NextResponse.json({ code: "INVALID_IMAGE" }, { status: 415 });
  if (data.size > MAX_IMAGE_BYTES) return NextResponse.json({ code: "SOURCE_TOO_LARGE" }, { status: 413 });

  let body: Buffer = Buffer.from(await data.arrayBuffer());
  let contentType = data.type;
  if (logoVariant) {
    try {
      body = await normalizeNewsletterLogo(body);
      contentType = "image/png";
    } catch {
      return NextResponse.json({ code: "INVALID_IMAGE" }, { status: 422 });
    }
  }

  const responseBody = Uint8Array.from(body);
  return new Response(responseBody, {
    headers: {
      "Cache-Control": "private, max-age=300",
      "Content-Type": contentType,
      "Content-Length": String(body.length),
      "X-Content-Type-Options": "nosniff",
    },
  });
}
