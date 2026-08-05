import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { validatePosterChanges } from "@/lib/templates/fal-edit";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await request.json() as Record<string, unknown>;
    const storagePath = typeof body.storagePath === "string" ? body.storagePath.trim() : "";
    const templateId = typeof body.templateId === "string" ? body.templateId : "";
    const changes = validatePosterChanges(body.changes);
    const size = typeof body.size === "number" && Number.isFinite(body.size) ? Math.max(0, Math.round(body.size)) : 0;
    const width = typeof body.width === "number" && Number.isFinite(body.width) ? Math.max(1, Math.round(body.width)) : null;
    const height = typeof body.height === "number" && Number.isFinite(body.height) ? Math.max(1, Math.round(body.height)) : null;

    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
    if (!profile?.communityId) return NextResponse.json({ error: "Communauté non configurée" }, { status: 400 });
    if (!storagePath.startsWith(`generated-ai/${profile.communityId}/`) || !storagePath.endsWith(".png")) {
      return NextResponse.json({ error: "Image invalide" }, { status: 400 });
    }

    const [{ data: existing }, { data: template }] = await Promise.all([
      admin.from("MediaFile").select("id, url").eq("communityId", profile.communityId).eq("publicId", storagePath).maybeSingle(),
      admin.from("Template").select("id, name").eq("id", templateId).or(`isGlobal.eq.true,communityId.eq.${profile.communityId}`).maybeSingle(),
    ]);
    if (existing) return NextResponse.json({ mediaId: existing.id, imageUrl: existing.url, alreadySaved: true });
    if (!template) return NextResponse.json({ error: "Template introuvable" }, { status: 404 });

    const { data: publicData } = admin.storage.from("templates").getPublicUrl(storagePath);
    const mediaId = crypto.randomUUID();
    const { error } = await admin.from("MediaFile").insert({
      id: mediaId,
      communityId: profile.communityId,
      userId: user.id,
      templateId: template.id,
      name: `Affiche personnalisée - ${template.name}`,
      originalName: `${template.name}.png`,
      url: publicData.publicUrl,
      publicId: storagePath,
      source: "TEMPLATE_GENERATION",
      type: "IMAGE",
      mimeType: "image/png",
      size,
      width,
      height,
      tags: ["generated", "personal-library"],
      altText: changes.map((change) => `${change.label}: ${change.newText}`).join("; ").slice(0, 500),
      updatedAt: new Date().toISOString(),
    } as never);
    if (error) throw new Error(error.message);

    return NextResponse.json({ mediaId, imageUrl: publicData.publicUrl, alreadySaved: false });
  } catch (error) {
    console.error("[Save Personal Image]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Enregistrement impossible" }, { status: 500 });
  }
}

export const runtime = "nodejs";
