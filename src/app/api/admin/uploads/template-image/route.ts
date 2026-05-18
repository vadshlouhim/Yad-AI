import { canAccessAdmin } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import sharp from "sharp";

const MAX_FILE_SIZE = 12 * 1024 * 1024;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("email, role").eq("id", user.id).single();
  if (!canAccessAdmin(profile)) return NextResponse.json({ error: "Acces reserve a l'admin global" }, { status: 403 });

  const form = await request.formData();
  const file = form.get("file");
  const templateId = String(form.get("templateId") ?? "");
  const kind = String(form.get("kind") ?? "preview");
  if (!(file instanceof File)) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Le fichier doit etre une image" }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "Image trop lourde, maximum 12 Mo" }, { status: 400 });

  const input = Buffer.from(await file.arrayBuffer());
  const width = kind === "thumbnail" ? 640 : 1600;
  const output = await sharp(input)
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: kind === "thumbnail" ? 78 : 86 })
    .toBuffer();

  const safeTemplateId = templateId || "new";
  const storagePath = `admin/${safeTemplateId}/${kind}-${crypto.randomUUID()}.webp`;
  let { error: uploadError } = await admin.storage.from("templates").upload(storagePath, output, {
    contentType: "image/webp",
    upsert: true,
  });

  if (uploadError?.message.toLowerCase().includes("bucket")) {
    await admin.storage.createBucket("templates", { public: true });
    const retry = await admin.storage.from("templates").upload(storagePath, output, {
      contentType: "image/webp",
      upsert: true,
    });
    uploadError = retry.error;
  }

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data } = admin.storage.from("templates").getPublicUrl(storagePath);
  const publicUrl = data.publicUrl;

  if (templateId && (kind === "thumbnail" || kind === "preview")) {
    await admin
      .from("Template")
      .update({
        [kind === "thumbnail" ? "thumbnailUrl" : "previewUrl"]: publicUrl,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", templateId);
  }

  return NextResponse.json({ url: publicUrl, path: storagePath, contentType: "image/webp" });
}
