export const runtime = "nodejs";
export const maxDuration = 180;

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  PosterCompositionError,
  hashTextBlocks,
  renderTemplatePoster,
  validateCompositionPlanInput,
  validateTextBlocks,
  type PosterCompositionPlan,
} from "@/lib/templates/render";
import {
  buildAdaptivePosterTextVariants,
  curatePosterTextBlocks,
} from "@/lib/templates/curation";
import { FREE_POSTER_LIMIT, getBillingGate, getBillingUsage, paywallResponse } from "@/lib/billing";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await request.json() as {
      templateId?: unknown;
      textBlocks?: unknown;
      previousPlan?: PosterCompositionPlan;
    };
    const templateId = typeof body.templateId === "string" ? body.templateId : "";
    if (!templateId) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
    const textBlocks = validateTextBlocks(body.textBlocks);
    const curatedTextBlocks = await curatePosterTextBlocks(textBlocks);
    const textVariants = buildAdaptivePosterTextVariants(curatedTextBlocks);
    const previousPlan = body.previousPlan ? validateCompositionPlanInput(body.previousPlan) : undefined;
    const requestedTextHashes = [...new Set([
      hashTextBlocks(curatedTextBlocks),
      ...textVariants.map((variant) => hashTextBlocks(variant)),
    ])];

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("communityId")
      .eq("id", user.id)
      .single();
    if (!profile?.communityId) {
      return NextResponse.json({ error: "Communauté non configurée" }, { status: 400 });
    }

    const gate = await getBillingGate(admin, user.id);
    if (!gate.isPaid) {
      const usage = await getBillingUsage(admin, profile.communityId, gate.tier);
      let isRecentRelayout = false;
      if (previousPlan) {
        const recentThreshold = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const { data: recentRender } = await admin
          .from("MediaFile")
          .select("id")
          .eq("userId", user.id)
          .eq("templateId", templateId)
          .eq("source", "TEMPLATE_GENERATION")
          .overlaps("tags", requestedTextHashes.map((hash) => `text-hash:${hash}`))
          .gte("createdAt", recentThreshold)
          .limit(1)
          .maybeSingle();
        isRecentRelayout = Boolean(recentRender);
      }
      if (usage.posterGenerations >= FREE_POSTER_LIMIT && !isRecentRelayout) {
        return paywallResponse(
          "poster_generations",
          "Le mode gratuit permet de modifier une seule affiche. Passez au mode payant pour personnaliser toutes les affiches.",
          { posterGenerations: usage.posterGenerations },
        );
      }
    }

    const { data: template } = await admin
      .from("Template")
      .select("*")
      .eq("id", templateId)
      .or(`isGlobal.eq.true,communityId.eq.${profile.communityId}`)
      .single();
    if (!template) return NextResponse.json({ error: "Template introuvable" }, { status: 404 });

    let rendered: Awaited<ReturnType<typeof renderTemplatePoster>> | undefined;
    let usedTextBlocks = textVariants[0];
    let lastLayoutError: PosterCompositionError | undefined;
    for (const variant of textVariants) {
      try {
        rendered = await renderTemplatePoster({
          admin,
          template,
          communityId: profile.communityId,
          textBlocks: variant,
          previousPlan,
        });
        usedTextBlocks = variant;
        break;
      } catch (error) {
        if (!(error instanceof PosterCompositionError)
          || (error.code !== "LAYOUT_VALIDATION_FAILED" && error.code !== "TEXT_TOO_LONG")) {
          throw error;
        }
        lastLayoutError = error;
      }
    }
    if (!rendered) throw lastLayoutError ?? new PosterCompositionError(
      "LAYOUT_VALIDATION_FAILED",
      "La composition automatique n’a pas pu finaliser cette affiche.",
    );

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
      size: rendered.size,
      width: rendered.width,
      height: rendered.height,
      tags: ["generated", "template", `text-hash:${rendered.textHash}`],
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      imageUrl: rendered.imageUrl,
      plan: rendered.plan,
      visualReport: rendered.visualReport,
      textHash: rendered.textHash,
      alreadyPresentBlockIds: rendered.alreadyPresentBlockIds,
      usedTextBlocks,
    });
  } catch (error) {
    if (error instanceof PosterCompositionError) {
      const status = error.code === "TEXT_TOO_LONG" || error.code === "LAYOUT_VALIDATION_FAILED"
        ? 422
        : error.code === "VISION_UNAVAILABLE"
          ? 503
          : 400;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    console.error("[Templates Render] Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
