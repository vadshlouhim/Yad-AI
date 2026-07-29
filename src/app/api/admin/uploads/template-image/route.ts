import { canAccessAdmin } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { classifyTemplateAdminError } from "@/lib/templates/admin-errors";
import { NextResponse } from "next/server";
import sharp from "sharp";

const MAX_FILE_SIZE = 24 * 1024 * 1024;

function extensionForFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension && ["png", "jpg", "jpeg", "webp", "avif", "gif", "tif", "tiff"].includes(extension)) {
    return extension;
  }
  return file.type.split("/")[1]?.replace("jpeg", "jpg") || "img";
}

async function uploadBuffer(params: {
  admin: ReturnType<typeof createAdminClient>;
  storagePath: string;
  buffer: Buffer;
  contentType: string;
}) {
  const { admin, storagePath, buffer, contentType } = params;
  let { error } = await admin.storage.from("templates").upload(storagePath, buffer, {
    contentType,
    upsert: true,
  });

  if (error?.message.toLowerCase().includes("bucket")) {
    await admin.storage.createBucket("templates", { public: true });
    error = (await admin.storage.from("templates").upload(storagePath, buffer, {
      contentType,
      upsert: true,
    })).error;
  }

  if (error) throw error;
  return admin.storage.from("templates").getPublicUrl(storagePath).data.publicUrl;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé", code: "UNAUTHORIZED" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("email, role").eq("id", user.id).single();
  if (!canAccessAdmin(profile)) {
    return NextResponse.json({ error: "Accès réservé à l'admin global", code: "FORBIDDEN" }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const templateId = String(form.get("templateId") ?? "");
  const kind = String(form.get("kind") ?? "original");
  if (!(file instanceof File)) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Le fichier doit etre une image" }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "Image trop lourde, maximum 24 Mo" }, { status: 400 });

  if (templateId) {
    const { data: template, error } = await admin
      .from("Template")
      .select("id, originalUrl")
      .eq("id", templateId)
      .maybeSingle();
    if (error) {
      const apiError = classifyTemplateAdminError(error, "TEMPLATE_UPLOAD_FAILED");
      return NextResponse.json({ error: apiError.error, code: apiError.code }, { status: apiError.status });
    }
    if (!template) {
      return NextResponse.json(
        { error: "Affiche introuvable", code: "TEMPLATE_NOT_FOUND" },
        { status: 404 },
      );
    }
  }

  const input = Buffer.from(await file.arrayBuffer());
  const safeTemplateId = templateId || "new";
  const uploadId = crypto.randomUUID();

  try {
    await sharp(input, { failOn: "error" }).metadata();

    if (kind === "original") {
      const originalPath = `admin/${safeTemplateId}/original-${uploadId}.${extensionForFile(file)}`;
      const previewPath = `admin/${safeTemplateId}/preview-${uploadId}.webp`;
      const thumbnailPath = `admin/${safeTemplateId}/thumbnail-${uploadId}.webp`;
      const [preview, thumbnail] = await Promise.all([
        sharp(input).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 86 }).toBuffer(),
        sharp(input).rotate().resize({ width: 640, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer(),
      ]);
      const originalUrl = await uploadBuffer({
        admin,
        storagePath: originalPath,
        buffer: input,
        contentType: file.type,
      });
      const [previewUrl, thumbnailUrl] = await Promise.all([
        uploadBuffer({ admin, storagePath: previewPath, buffer: preview, contentType: "image/webp" }),
        uploadBuffer({ admin, storagePath: thumbnailPath, buffer: thumbnail, contentType: "image/webp" }),
      ]);

      if (templateId) {
        const { error } = await admin
          .from("Template")
          .update({ originalUrl, previewUrl, thumbnailUrl, updatedAt: new Date().toISOString() })
          .eq("id", templateId);
        if (error) throw error;
      }

      return NextResponse.json({
        originalUrl,
        previewUrl,
        thumbnailUrl,
        path: originalPath,
        contentType: file.type,
      });
    }

    if (kind !== "thumbnail" && kind !== "preview") {
      return NextResponse.json({ error: "Type d'image invalide" }, { status: 400 });
    }

    const width = kind === "thumbnail" ? 640 : 1600;
    const output = await sharp(input)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: kind === "thumbnail" ? 78 : 86 })
      .toBuffer();
    const storagePath = `admin/${safeTemplateId}/${kind}-${uploadId}.webp`;
    const publicUrl = await uploadBuffer({
      admin,
      storagePath,
      buffer: output,
      contentType: "image/webp",
    });

    if (templateId) {
      const { error } = await admin
        .from("Template")
        .update({
          [kind === "thumbnail" ? "thumbnailUrl" : "previewUrl"]: publicUrl,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", templateId);
      if (error) throw error;
    }

    return NextResponse.json({ url: publicUrl, path: storagePath, contentType: "image/webp" });
  } catch (error) {
    console.error("[Admin Templates] Upload impossible:", error);
    const apiError = classifyTemplateAdminError(
      error,
      "TEMPLATE_UPLOAD_FAILED",
    );
    return NextResponse.json({ error: apiError.error, code: apiError.code }, { status: apiError.status });
  }
}
