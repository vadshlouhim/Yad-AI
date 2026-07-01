import { canAccessAdmin } from "@/lib/admin-access";
import { slugifySeo } from "@/lib/blog/articles";
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
  if (!canAccessAdmin(profile)) return NextResponse.json({ error: "Acces reserve au Super Admin" }, { status: 403 });

  const form = await request.formData();
  const file = form.get("file");
  const articleId = String(form.get("articleId") ?? "");
  const title = String(form.get("title") ?? "article-blog");
  if (!(file instanceof File)) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    return NextResponse.json({ error: "Format accepte : PNG, JPG ou WEBP" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "Image trop lourde, maximum 12 Mo" }, { status: 400 });

  const safeName = slugifySeo(title) || "article-blog";
  const input = Buffer.from(await file.arrayBuffer());
  const output = await sharp(input)
    .rotate()
    .resize({ width: 1600, height: 900, fit: "cover", withoutEnlargement: true })
    .webp({ quality: 84 })
    .toBuffer();

  const storagePath = `blog/${articleId || "new"}/${safeName}-${crypto.randomUUID()}.webp`;
  let { error: uploadError } = await admin.storage.from("articles").upload(storagePath, output, {
    contentType: "image/webp",
    upsert: true,
  });

  if (uploadError?.message.toLowerCase().includes("bucket")) {
    await admin.storage.createBucket("articles", { public: true });
    const retry = await admin.storage.from("articles").upload(storagePath, output, {
      contentType: "image/webp",
      upsert: true,
    });
    uploadError = retry.error;
  }

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data } = admin.storage.from("articles").getPublicUrl(storagePath);
  const publicUrl = data.publicUrl;

  if (articleId) {
    await admin
      .from("BlogArticle")
      .update({
        coverImageUrl: publicUrl,
        coverImageAlt: title,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", articleId);
  }

  return NextResponse.json({ url: publicUrl, path: storagePath, contentType: "image/webp", alt: title });
}
