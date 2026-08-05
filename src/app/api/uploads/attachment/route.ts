import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const BUCKET = "community-assets";
const MAX_FILE_SIZE = 20 * 1024 * 1024;

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

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Fichier trop lourd, maximum 20 Mo" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("communityId")
    .eq("id", user.id)
    .single();

  const ownerId = profile?.communityId ?? user.id;
  const input = Buffer.from(await file.arrayBuffer());

  const body = input;
  const contentType = file.type || "application/octet-stream";
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "bin";

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
