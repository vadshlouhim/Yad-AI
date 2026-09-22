import { canAccessAdmin } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { classifyTemplateAdminError } from "@/lib/templates/admin-errors";
import { optimizeTemplateImage, optimizeTemplateImages } from "@/lib/templates/image-optimization";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 180;

const MAX_FILE_SIZE = 24 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/tiff",
  "image/x-tiff",
];

async function getAdminUploadContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("email, role").eq("id", user.id).single();
  if (!canAccessAdmin(profile)) return null;
  return { admin };
}

async function ensureTemplatesBucket(admin: ReturnType<typeof createAdminClient>) {
  const { data: bucket, error: bucketError } = await admin.storage.getBucket("templates");
  if (!bucket) {
    const { error } = await admin.storage.createBucket("templates", {
      public: true,
      fileSizeLimit: MAX_FILE_SIZE,
      allowedMimeTypes: ALLOWED_IMAGE_TYPES,
    });
    if (error) throw error;
    return;
  }

  if (bucketError) throw bucketError;
  const { error } = await admin.storage.updateBucket("templates", {
    public: true,
    fileSizeLimit: MAX_FILE_SIZE,
    allowedMimeTypes: ALLOWED_IMAGE_TYPES,
  });
  if (error) throw error;
}

async function assertTemplateExists(admin: ReturnType<typeof createAdminClient>, templateId: string) {
  const { data: template, error } = await admin
    .from("Template")
    .select("id, originalUrl")
    .eq("id", templateId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(template);
}

function extensionForFile(file: Pick<File, "name" | "type">) {
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
  await ensureTemplatesBucket(admin);
  let { error } = await admin.storage.from("templates").upload(storagePath, buffer, {
    contentType,
    cacheControl: "31536000",
    upsert: true,
  });

  if (error?.message.toLowerCase().includes("bucket")) {
    await admin.storage.createBucket("templates", { public: true });
    error = (await admin.storage.from("templates").upload(storagePath, buffer, {
      contentType,
      cacheControl: "31536000",
      upsert: true,
    })).error;
  }

  if (error) throw error;
  return admin.storage.from("templates").getPublicUrl(storagePath).data.publicUrl;
}

export async function PUT(request: Request) {
  try {
    const context = await getAdminUploadContext();
    if (!context) return NextResponse.json({ error: "Accès administrateur requis", code: "FORBIDDEN" }, { status: 403 });

    const body = await request.json();
    const templateId = String(body.templateId ?? "").trim();
    const kind = String(body.kind ?? "original");
    const fileName = String(body.fileName ?? "image");
    const contentType = String(body.contentType ?? "").toLowerCase();
    const fileSize = Number(body.fileSize ?? 0);

    if (!templateId) return NextResponse.json({ error: "Affiche manquante", code: "INVALID_REQUEST" }, { status: 400 });
    if (!["original", "thumbnail", "preview"].includes(kind)) {
      return NextResponse.json({ error: "Type d'image invalide", code: "INVALID_REQUEST" }, { status: 400 });
    }
    if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
      return NextResponse.json({ error: "Format non accepté. Utilisez PNG, JPG, WEBP, AVIF, GIF ou TIFF.", code: "INVALID_FILE_TYPE" }, { status: 400 });
    }
    if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Image trop lourde, maximum 24 Mo", code: "FILE_TOO_LARGE" }, { status: 400 });
    }
    if (!(await assertTemplateExists(context.admin, templateId))) {
      return NextResponse.json({ error: "Affiche introuvable", code: "TEMPLATE_NOT_FOUND" }, { status: 404 });
    }

    await ensureTemplatesBucket(context.admin);
    const storagePath = `admin/${templateId}/${kind}-${crypto.randomUUID()}.${extensionForFile({ name: fileName, type: contentType })}`;
    const { data, error } = await context.admin.storage
      .from("templates")
      .createSignedUploadUrl(storagePath, { upsert: true });
    if (error || !data?.token) throw error ?? new Error("Jeton de téléversement manquant");

    return NextResponse.json({ path: storagePath, token: data.token });
  } catch (error) {
    console.error("[Admin Templates] Préparation upload impossible:", error);
    const apiError = classifyTemplateAdminError(error, "TEMPLATE_UPLOAD_FAILED");
    return NextResponse.json({ error: apiError.error, code: apiError.code }, { status: apiError.status });
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await getAdminUploadContext();
    if (!context) return NextResponse.json({ error: "Accès administrateur requis", code: "FORBIDDEN" }, { status: 403 });

    const body = await request.json();
    const templateId = String(body.templateId ?? "").trim();
    const kind = String(body.kind ?? "original");
    const storagePath = String(body.path ?? "").trim();
    if (!templateId || !["original", "thumbnail", "preview"].includes(kind)) {
      return NextResponse.json({ error: "Données de téléversement invalides", code: "INVALID_REQUEST" }, { status: 400 });
    }
    if (!storagePath.startsWith(`admin/${templateId}/${kind}-`)) {
      return NextResponse.json({ error: "Chemin de fichier invalide", code: "INVALID_REQUEST" }, { status: 400 });
    }
    if (!(await assertTemplateExists(context.admin, templateId))) {
      return NextResponse.json({ error: "Affiche introuvable", code: "TEMPLATE_NOT_FOUND" }, { status: 404 });
    }

    const { data: sourceFile, error: downloadError } = await context.admin.storage.from("templates").download(storagePath);
    if (downloadError || !sourceFile) throw downloadError ?? new Error("Fichier téléversé introuvable");
    const input = Buffer.from(await sourceFile.arrayBuffer());
    const originalUrl = context.admin.storage.from("templates").getPublicUrl(storagePath).data.publicUrl;

    if (kind === "original") {
      const variants = await optimizeTemplateImages(input);
      const variantId = crypto.randomUUID();
      const thumbnailPath = `admin/${templateId}/thumbnail-${variantId}.webp`;
      const previewPath = `admin/${templateId}/preview-${variantId}.webp`;
      const [thumbnailUrl, previewUrl] = await Promise.all([
        uploadBuffer({ admin: context.admin, storagePath: thumbnailPath, buffer: variants.thumbnail.buffer, contentType: variants.thumbnail.contentType }),
        uploadBuffer({ admin: context.admin, storagePath: previewPath, buffer: variants.preview.buffer, contentType: variants.preview.contentType }),
      ]);
      const { error } = await context.admin.from("Template").update({
        originalUrl,
        previewUrl,
        thumbnailUrl,
        updatedAt: new Date().toISOString(),
      }).eq("id", templateId);
      if (error) throw error;
      return NextResponse.json({
        originalUrl,
        previewUrl,
        thumbnailUrl,
        path: storagePath,
        optimization: {
          thumbnail: { size: variants.thumbnail.size, width: variants.thumbnail.width, height: variants.thumbnail.height },
          preview: { size: variants.preview.size, width: variants.preview.width, height: variants.preview.height },
        },
      });
    }

    const variantKind = kind as "thumbnail" | "preview";
    const variant = await optimizeTemplateImage(input, variantKind);
    const variantPath = `admin/${templateId}/${variantKind}-${crypto.randomUUID()}.webp`;
    const publicUrl = await uploadBuffer({ admin: context.admin, storagePath: variantPath, buffer: variant.buffer, contentType: variant.contentType });
    const update = { [variantKind === "thumbnail" ? "thumbnailUrl" : "previewUrl"]: publicUrl, updatedAt: new Date().toISOString() };
    const { error } = await context.admin.from("Template").update(update).eq("id", templateId);
    if (error) throw error;
    return NextResponse.json({ url: publicUrl, path: variantPath, optimization: { size: variant.size, width: variant.width, height: variant.height } });
  } catch (error) {
    console.error("[Admin Templates] Finalisation upload impossible:", error);
    const apiError = classifyTemplateAdminError(error, "TEMPLATE_UPLOAD_FAILED");
    return NextResponse.json({ error: apiError.error, code: apiError.code }, { status: apiError.status });
  }
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
    if (kind === "original") {
      const originalPath = `admin/${safeTemplateId}/original-${uploadId}.${extensionForFile(file)}`;
      const originalUrl = await uploadBuffer({
        admin,
        storagePath: originalPath,
        buffer: input,
        contentType: file.type,
      });
      const variants = await optimizeTemplateImages(input);
      const [thumbnailUrl, previewUrl] = await Promise.all([
        uploadBuffer({ admin, storagePath: `admin/${safeTemplateId}/thumbnail-${uploadId}.webp`, buffer: variants.thumbnail.buffer, contentType: variants.thumbnail.contentType }),
        uploadBuffer({ admin, storagePath: `admin/${safeTemplateId}/preview-${uploadId}.webp`, buffer: variants.preview.buffer, contentType: variants.preview.contentType }),
      ]);

      if (templateId) {
        const { error } = await admin
          .from("Template")
          .update({
            originalUrl,
            previewUrl,
            thumbnailUrl,
            updatedAt: new Date().toISOString(),
          })
          .eq("id", templateId);
        if (error) throw error;
      }

      return NextResponse.json({
        originalUrl,
        previewUrl,
        thumbnailUrl,
        path: originalPath,
        contentType: file.type,
        optimization: {
          thumbnail: { size: variants.thumbnail.size, width: variants.thumbnail.width, height: variants.thumbnail.height },
          preview: { size: variants.preview.size, width: variants.preview.width, height: variants.preview.height },
        },
      });
    }

    if (kind !== "thumbnail" && kind !== "preview") {
      return NextResponse.json({ error: "Type d'image invalide" }, { status: 400 });
    }

    const variant = await optimizeTemplateImage(input, kind);
    const storagePath = `admin/${safeTemplateId}/${kind}-${uploadId}.webp`;
    const publicUrl = await uploadBuffer({
      admin,
      storagePath,
      buffer: variant.buffer,
      contentType: variant.contentType,
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

    return NextResponse.json({ url: publicUrl, path: storagePath, contentType: variant.contentType, optimization: { size: variant.size, width: variant.width, height: variant.height } });
  } catch (error) {
    console.error("[Admin Templates] Upload impossible:", error);
    const apiError = classifyTemplateAdminError(
      error,
      "TEMPLATE_UPLOAD_FAILED",
    );
    return NextResponse.json({ error: apiError.error, code: apiError.code }, { status: apiError.status });
  }
}
