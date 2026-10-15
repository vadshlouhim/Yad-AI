import { NextResponse } from "next/server";
import { isNewsletterStoragePathOwnedBy } from "@/lib/newsletter/media-path";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const BUCKET = "community-assets";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const path = new URL(request.url).searchParams.get("path") ?? "";
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("communityId")
    .eq("id", user.id)
    .single();
  const ownerId = profile?.communityId ?? user.id;
  if (!isNewsletterStoragePathOwnedBy(path, ownerId)) {
    return NextResponse.json({ error: "Image inaccessible" }, { status: 403 });
  }

  const { data, error } = await admin.storage.from(BUCKET).download(path);
  if (error || !data) return NextResponse.json({ error: "Image introuvable" }, { status: 404 });
  if (!data.type.startsWith("image/")) return NextResponse.json({ error: "Fichier image invalide" }, { status: 415 });
  if (data.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "Image trop volumineuse" }, { status: 413 });

  return new Response(await data.arrayBuffer(), {
    headers: {
      "Cache-Control": "private, max-age=300",
      "Content-Type": data.type,
      "Content-Length": String(data.size),
      "X-Content-Type-Options": "nosniff",
    },
  });
}
