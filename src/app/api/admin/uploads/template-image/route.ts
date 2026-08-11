import { canAccessAdmin } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { classifyTemplateAdminError } from "@/lib/templates/admin-errors";
import { NextResponse } from "next/server";

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

    const publicUrl = context.admin.storage.from("templates").getPublicUrl(storagePath).data.publicUrl;
    const update = kind === "original"
      ? { originalUrl: publicUrl, previewUrl: publicUrl, thumbnailUrl: publicUrl, updatedAt: new Date().toISOString() }
      : { [kind === "thumbnail" ? "thumbnailUrl" : "previewUrl"]: publicUrl, updatedAt: new Date().toISOString() };
    const { error } = await context.admin.from("Template").update(update).eq("id", templateId);
    if (error) throw error;

    return kind === "original"
      ? NextResponse.json({ originalUrl: publicUrl, previewUrl: publicUrl, thumbnailUrl: publicUrl, path: storagePath })
      : NextResponse.json({ url: publicUrl, path: storagePath });
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
      const previewUrl = originalUrl;
      const thumbnailUrl = originalUrl;

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
      });
    }

    if (kind !== "thumbnail" && kind !== "preview") {
      return NextResponse.json({ error: "Type d'image invalide" }, { status: 400 });
    }

    const storagePath = `admin/${safeTemplateId}/${kind}-${uploadId}.${extensionForFile(file)}`;
    const publicUrl = await uploadBuffer({
      admin,
      storagePath,
      buffer: input,
      contentType: file.type,
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

    return NextResponse.json({ url: publicUrl, path: storagePath, contentType: file.type });
  } catch (error) {
    console.error("[Admin Templates] Upload impossible:", error);
    const apiError = classifyTemplateAdminError(
      error,
      "TEMPLATE_UPLOAD_FAILED",
    );
    return NextResponse.json({ error: apiError.error, code: apiError.code }, { status: apiError.status });
  }
}
