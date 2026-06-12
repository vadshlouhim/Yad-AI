import { NextResponse } from "next/server";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const BUCKET = "community-assets";
const MAX_FILE_SIZE = 15 * 1024 * 1024;

// Types acceptés pour analyse / insertion dans la communication.
const ACCEPTED_DOC_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

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

  const isImage = file.type.startsWith("image/");
  if (!isImage && !ACCEPTED_DOC_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Format non pris en charge (images, PDF, Word, Excel, texte)" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Fichier trop lourd, maximum 15 Mo" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("communityId")
    .eq("id", user.id)
    .single();

  const ownerId = profile?.communityId ?? user.id;
  const input = Buffer.from(await file.arrayBuffer());

  let body: Buffer = input;
  let contentType = file.type;
  let extension = file.name.includes(".") ? file.name.split(".").pop() : "bin";

  // Les images sont normalisées en webp (taille raisonnable pour l'analyse IA).
  if (isImage) {
    body = await sharp(input)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
    contentType = "image/webp";
    extension = "webp";
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60) || "fichier";
  const storagePath = `chat-attachments/${ownerId}/${crypto.randomUUID()}-${safeName}.${extension}`;

  let { error: uploadError } = await admin.storage.from(BUCKET).upload(storagePath, body, {
    contentType,
    upsert: true,
  });

  if (uploadError?.message.toLowerCase().includes("bucket")) {
    await admin.storage.createBucket(BUCKET, { public: true });
    const retry = await admin.storage.from(BUCKET).upload(storagePath, body, {
      contentType,
      upsert: true,
    });
    uploadError = retry.error;
  }

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data } = admin.storage.from(BUCKET).getPublicUrl(storagePath);

  return NextResponse.json({
    url: data.publicUrl,
    path: storagePath,
    type: contentType,
    name: file.name,
    isImage,
  });
}
