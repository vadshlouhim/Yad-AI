export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderTemplatePoster } from "@/lib/templates/render";
import { FREE_LIMITS, getBillingGate, getBillingUsage, paywallResponse } from "@/lib/billing";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { templateId, generatedTexts } = body as {
      templateId?: string;
      generatedTexts?: Record<string, string>;
    };

    if (!templateId || !generatedTexts || typeof generatedTexts !== "object") {
      return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("communityId")
      .eq("id", user.id)
      .single();

    if (!profile?.communityId) {
      return NextResponse.json(
        { error: "Communauté non configurée" },
        { status: 400 }
      );
    }

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

    const { data: template } = await admin
      .from("Template")
      .select("*")
      .eq("id", templateId)
      .or(`isGlobal.eq.true,communityId.eq.${profile.communityId}`)
      .single();

    if (!template) {
      return NextResponse.json({ error: "Template introuvable" }, { status: 404 });
    }

    const rendered = await renderTemplatePoster({
      admin,
      template,
      communityId: profile.communityId,
      generatedTexts,
    });

    await admin
      .from("Template")
      .update({
        usageCount: (template.usageCount ?? 0) + 1,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", template.id);

    await admin.from("MediaFile").insert({
      id: crypto.randomUUID(),
      communityId: profile.communityId,
      userId: user.id,
      templateId: template.id,
      name: `Affiche générée - ${template.name}`,
      originalName: template.name,
      url: rendered.imageUrl,
      publicId: rendered.storagePath,
      source: "TEMPLATE_GENERATION",
      type: "IMAGE",
      mimeType: "image/png",
      size: 0,
      tags: ["generated", "template"],
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      imageUrl: rendered.imageUrl,
      promptUsed: rendered.promptUsed,
    });
  } catch (error) {
    console.error("[Templates Render] Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
