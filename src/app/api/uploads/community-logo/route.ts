import { NextResponse } from "next/server";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "community-assets";
const MAX_FILE_SIZE = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Le fichier doit être une image" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Image trop lourde, maximum 8 Mo" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("communityId")
    .eq("id", user.id)
    .single();

  const input = Buffer.from(await file.arrayBuffer());
  const output = await sharp(input)
    .rotate()
    .resize({ width: 512, height: 512, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 88 })
    .toBuffer();

  const ownerId = profile?.communityId ?? user.id;
  const storagePath = `${ownerId}/logo-${crypto.randomUUID()}.webp`;
  let { error: uploadError } = await admin.storage.from(BUCKET).upload(storagePath, output, {
    contentType: "image/webp",
    upsert: true,
  });

  if (uploadError?.message.toLowerCase().includes("bucket")) {
    await admin.storage.createBucket(BUCKET, { public: true });
    const retry = await admin.storage.from(BUCKET).upload(storagePath, output, {
      contentType: "image/webp",
      upsert: true,
    });
    uploadError = retry.error;
  }

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data } = admin.storage.from(BUCKET).getPublicUrl(storagePath);
  const logoUrl = data.publicUrl;

  if (profile?.communityId) {
    await admin
      .from("Community")
      .update({ logoUrl, updatedAt: new Date().toISOString() })
      .eq("id", profile.communityId);
  }

  return NextResponse.json({ logoUrl, path: storagePath, contentType: "image/webp" });
}
