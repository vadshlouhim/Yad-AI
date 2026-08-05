import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "community-assets";
const MAX_FILE_SIZE = 8 * 1024 * 1024;

function slugifyLogoName(value: string | null | undefined) {
  const normalized = (value ?? "structure")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  return normalized || "structure";
}

function extensionForFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension && ["png", "jpg", "jpeg", "webp", "gif", "avif"].includes(extension)
    ? extension
    : file.type.split("/")[1]?.replace("jpeg", "jpg") || "img";
}

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

  const { data: community } = profile?.communityId
    ? await admin
        .from("Community")
        .select("name, slug")
        .eq("id", profile.communityId)
        .single()
    : { data: null };

  const input = Buffer.from(await file.arrayBuffer());

  const ownerId = profile?.communityId ?? user.id;
  const structureName = community?.slug ?? community?.name ?? user.email ?? ownerId;
  const storagePath = `${ownerId}/${slugifyLogoName(structureName)}-logo.${extensionForFile(file)}`;
  let { error: uploadError } = await admin.storage.from(BUCKET).upload(storagePath, input, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: true,
  });

  if (uploadError?.message.toLowerCase().includes("bucket")) {
    await admin.storage.createBucket(BUCKET, { public: true });
    const retry = await admin.storage.from(BUCKET).upload(storagePath, input, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: true,
    });
    uploadError = retry.error;
  }

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data } = admin.storage.from(BUCKET).getPublicUrl(storagePath);
  const logoUrl = `${data.publicUrl}?v=${Date.now()}`;

  if (profile?.communityId) {
    await admin
      .from("Community")
      .update({ logoUrl, updatedAt: new Date().toISOString() })
      .eq("id", profile.communityId);
  }

  return NextResponse.json({ logoUrl, path: storagePath, contentType: file.type });
}
