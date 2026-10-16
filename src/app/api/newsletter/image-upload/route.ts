import { NextResponse } from "next/server";
import { MAX_SOURCE_BYTES } from "@/lib/newsletter/media";
import { normalizeNewsletterImage } from "@/lib/newsletter/server-image";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET = "community-assets";

function uploadError(message: string, code: string, status = 400) {
  return NextResponse.json({ error: message, code }, { status });
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return uploadError("Non authentifié", "UNAUTHENTICATED", 401);

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return uploadError("Fichier manquant", "FILE_MISSING");
    if (!file.size) return uploadError("Ce fichier est vide.", "EMPTY_FILE");
    if (file.size > MAX_SOURCE_BYTES) return uploadError("Image trop lourde, maximum 20 Mo.", "SOURCE_TOO_LARGE", 413);

    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
    if (!profile?.communityId) return uploadError("Communauté introuvable", "COMMUNITY_MISSING", 403);

    let body: Buffer;
    try {
      body = await normalizeNewsletterImage(Buffer.from(await file.arrayBuffer()));
    } catch (error) {
      const tooLarge = error instanceof Error && error.message === "output_too_large";
      console.warn("[Newsletter Image]", { requestId, stage: "convert", status: "failed", inputBytes: file.size, mime: file.type || "unknown" });
      return uploadError(
        tooLarge ? "Cette image reste trop lourde après optimisation. Réduisez sa résolution puis réessayez." : "Image illisible ou format non reconnu. Essayez une autre photo.",
        tooLarge ? "OUTPUT_TOO_LARGE" : "INVALID_IMAGE",
      );
    }

    const safeBase = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 45) || "photo";
    const storagePath = `newsletter/${profile.communityId}/${crypto.randomUUID()}-${safeBase}.jpg`;
    let { error: storageError } = await admin.storage.from(BUCKET).upload(storagePath, body, {
      contentType: "image/jpeg",
      cacheControl: "31536000",
      upsert: false,
    });
    if (storageError?.message.toLowerCase().includes("bucket")) {
      await admin.storage.createBucket(BUCKET, { public: true });
      storageError = (await admin.storage.from(BUCKET).upload(storagePath, body, {
        contentType: "image/jpeg",
        cacheControl: "31536000",
        upsert: false,
      })).error;
    }
    if (storageError) {
      console.error("[Newsletter Image]", { requestId, stage: "storage", status: "failed", code: storageError.message });
      return uploadError("Stockage de l’image indisponible. Réessayez.", "STORAGE_FAILED", 500);
    }

    const { data } = admin.storage.from(BUCKET).getPublicUrl(storagePath);
    console.info("[Newsletter Image]", { requestId, stage: "complete", status: "ok", inputBytes: file.size, outputBytes: body.length, mime: file.type || "unknown" });
    return NextResponse.json({ url: data.publicUrl, path: storagePath, type: "image/jpeg", name: file.name, requestId });
  } catch (error) {
    console.error("[Newsletter Image]", { requestId, stage: "request", status: "failed", error });
    return uploadError("Importation impossible. Réessayez.", "UPLOAD_FAILED", 500);
  }
}

