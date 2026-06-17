import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { editPosterFromRequest } from "@/lib/templates/render";
import { FREE_LIMITS, getBillingGate, getBillingUsage, paywallResponse } from "@/lib/billing";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
    if (!profile?.communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

    const gate = await getBillingGate(admin, user.id);
    if (!gate.isPaid) {
      const usage = await getBillingUsage(admin, profile.communityId);
      if (usage.posterGenerations >= FREE_LIMITS.posterGenerations) {
        return paywallResponse(
          "poster_generations",
          "Le mode gratuit permet de modifier une seule affiche. Passez au mode payant pour personnaliser toutes les affiches.",
          { posterGenerations: usage.posterGenerations }
        );
      }
    }

    const body = await request.json();
    const templateId = typeof body.templateId === "string" ? body.templateId : "";
    const userRequest = typeof body.userRequest === "string" ? body.userRequest.trim() : "";

    if (!templateId) return NextResponse.json({ error: "Affiche non spécifiée." }, { status: 400 });
    if (!userRequest) {
      return NextResponse.json({ error: "Décrivez la modification souhaitée pour l'affiche." }, { status: 400 });
    }

    const [{ data: template }, { data: community }] = await Promise.all([
      admin
        .from("Template")
        .select("*")
        .eq("id", templateId)
        .or(`isGlobal.eq.true,communityId.eq.${profile.communityId}`)
        .single(),
      admin.from("Community").select("name, city").eq("id", profile.communityId).single(),
    ]);

    if (!template) return NextResponse.json({ error: "Affiche introuvable." }, { status: 404 });

    const result = await editPosterFromRequest({
      admin,
      template,
      communityId: profile.communityId,
      userRequest,
      community,
    });

    await admin.from("MediaFile").insert({
      id: crypto.randomUUID(),
      communityId: profile.communityId,
      userId: user.id,
      templateId: template.id,
      name: `Affiche générée - ${template.name}`,
      originalName: template.name,
      url: result.imageUrl,
      publicId: result.storagePath,
      source: "TEMPLATE_GENERATION",
      type: "IMAGE",
      mimeType: "image/png",
      size: 0,
      tags: ["generated", "template"],
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ imageUrl: result.imageUrl });
  } catch (error) {
    console.error("[Templates Generate Image]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur de génération de l'affiche." },
      { status: 500 }
    );
  }
}
