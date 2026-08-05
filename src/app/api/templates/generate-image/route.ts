export const runtime = "nodejs";
export const maxDuration = 180;

import { NextResponse } from "next/server";
import { FREE_POSTER_LIMIT, getBillingGate, getBillingUsage, paywallResponse } from "@/lib/billing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  editTemplatePosterWithFal,
  FAL_POSTER_EDIT_MODEL,
  validatePosterChanges,
  validatePosterEditInstructions,
  validatePosterTextsToRemove,
} from "@/lib/templates/fal-edit";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await request.json() as {
      templateId?: unknown;
      changes?: unknown;
      textsToRemove?: unknown;
      editPrompt?: unknown;
      resolution?: unknown;
    };
    const templateId = typeof body.templateId === "string" ? body.templateId : "";
    const changes = validatePosterChanges(body.changes);
    const textsToRemove = validatePosterTextsToRemove(body.textsToRemove);
    const editInstructions = validatePosterEditInstructions(body.editPrompt);
    const resolution = body.resolution === "2k" ? "2k" : "1k";
    if (!templateId || changes.length === 0) {
      return NextResponse.json({ error: "Confirmez au moins une modification." }, { status: 400 });
    }

    const admin = createAdminClient();
    const gate = await getBillingGate(admin, user.id);
    if (!gate.communityId) return NextResponse.json({ error: "Communauté non configurée" }, { status: 400 });
    if (!gate.isPaid) {
      const usage = await getBillingUsage(admin, gate.communityId, gate.tier);
      if (usage.posterGenerations >= FREE_POSTER_LIMIT) {
        return paywallResponse(
          "poster_generations",
          "Le mode gratuit permet de modifier une seule affiche. Passez au mode payant pour continuer.",
          { posterGenerations: usage.posterGenerations },
        );
      }
    }

    const { data: template } = await admin
      .from("Template")
      .select("*")
      .eq("id", templateId)
      .eq("isActive", true)
      .or(`isGlobal.eq.true,communityId.eq.${gate.communityId}`)
      .single();
    if (!template) return NextResponse.json({ error: "Template introuvable" }, { status: 404 });

    const edited = await editTemplatePosterWithFal({
      admin,
      template,
      communityId: gate.communityId,
      userId: user.id,
      changes,
      textsToRemove,
      editInstructions,
      recordMedia: false,
      resolution,
    });
    await admin.from("Template").update({
      usageCount: (template.usageCount ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    }).eq("id", template.id);

    return NextResponse.json({
      imageUrl: edited.imageUrl,
      mediaId: edited.mediaId,
      storagePath: edited.storagePath,
      size: edited.size,
      model: FAL_POSTER_EDIT_MODEL,
      width: edited.width,
      height: edited.height,
    });
  } catch (error) {
    console.error("[Fal Poster Edit]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Modification impossible." }, { status: 500 });
  }
}
