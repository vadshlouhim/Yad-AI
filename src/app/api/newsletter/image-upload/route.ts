import { NextResponse } from "next/server";
import { MAX_SOURCE_BYTES } from "@/lib/newsletter/media";
import { normalizeNewsletterImage, normalizeNewsletterLogo } from "@/lib/newsletter/server-image";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET = "community-assets";

function uploadError(code: string, status = 400) {
  return NextResponse.json({ code }, { status });
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return uploadError("UNAUTHENTICATED", 401);

    const form = await request.formData();
    const file = form.get("file");
    const target = form.get("target") === "logo" ? "logo" : "image";
    if (!(file instanceof File)) return uploadError("FILE_MISSING");
    if (!file.size) return uploadError("EMPTY_FILE");
    if (file.size > MAX_SOURCE_BYTES) return uploadError("SOURCE_TOO_LARGE", 413);

    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
    if (!profile?.communityId) return uploadError("COMMUNITY_UNAVAILABLE", 403);

    let body: Buffer;
    try {
      const input = Buffer.from(await file.arrayBuffer());
      body = target === "logo" ? await normalizeNewsletterLogo(input) : await normalizeNewsletterImage(input);
    } catch (error) {
      const tooLarge = error instanceof Error && error.message === "output_too_large";
      console.warn("[Newsletter Image]", { requestId, stage: "convert", status: "failed", inputBytes: file.size, mime: file.type || "unknown" });
      return uploadError(tooLarge ? "OUTPUT_TOO_LARGE" : "INVALID_IMAGE");
    }

    const safeBase = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 45) || "photo";
    const extension = target === "logo" ? "png" : "jpg";
    const contentType = target === "logo" ? "image/png" : "image/jpeg";
    const storagePath = `newsletter/${profile.communityId}/${crypto.randomUUID()}-${safeBase}.${extension}`;
    let { error: storageError } = await admin.storage.from(BUCKET).upload(storagePath, body, {
      contentType,
      cacheControl: "31536000",
      upsert: false,
    });
    if (storageError?.message.toLowerCase().includes("bucket")) {
      await admin.storage.createBucket(BUCKET, { public: true });
      storageError = (await admin.storage.from(BUCKET).upload(storagePath, body, {
        contentType,
        cacheControl: "31536000",
        upsert: false,
      })).error;
    }
    if (storageError) {
      console.error("[Newsletter Image]", { requestId, stage: "storage", status: "failed", code: storageError.message });
      return uploadError("STORAGE_FAILED", 500);
    }

    const { data } = admin.storage.from(BUCKET).getPublicUrl(storagePath);
    console.info("[Newsletter Image]", { requestId, stage: "complete", status: "ok", inputBytes: file.size, outputBytes: body.length, mime: file.type || "unknown" });
    return NextResponse.json({ url: data.publicUrl, path: storagePath, type: contentType, name: file.name, requestId });
  } catch (error) {
    console.error("[Newsletter Image]", { requestId, stage: "request", status: "failed", error });
    return uploadError("UPLOAD_FAILED", 500);
  }
}

