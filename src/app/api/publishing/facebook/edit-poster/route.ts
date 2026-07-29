import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderTemplatePoster } from "@/lib/templates/render";
import { applyExactPosterEdits } from "@/lib/templates/exact-edits";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await request.json() as Record<string, unknown>;
    const templateId = typeof body.templateId === "string" ? body.templateId : "";
    const editPrompt = typeof body.editPrompt === "string" ? body.editPrompt : "";
    const currentTexts = body.generatedTexts && typeof body.generatedTexts === "object" && !Array.isArray(body.generatedTexts)
      ? body.generatedTexts as Record<string, string>
      : null;
    if (!templateId || !editPrompt || !currentTexts) {
      return NextResponse.json({ error: "Données de modification invalides." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
    if (!profile?.communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });
    const { data: template } = await admin
      .from("Template")
      .select("*")
      .eq("id", templateId)
      .or(`isGlobal.eq.true,communityId.eq.${profile.communityId}`)
      .single();
    if (!template) return NextResponse.json({ error: "Template introuvable." }, { status: 404 });

    const textBlocks = await applyExactPosterEdits({ currentTexts, editPrompt, channel: "Facebook" });
    const rendered = await renderTemplatePoster({
      admin,
      template,
      communityId: profile.communityId,
      textBlocks,
    });
    return NextResponse.json({
      imageUrl: rendered.imageUrl,
      textBlocks,
      generatedTexts: Object.fromEntries(textBlocks.map((block) => [block.id, block.text])),
      visualReport: rendered.visualReport,
      textHash: rendered.textHash,
    });
  } catch (error) {
    console.error("[Facebook Edit Poster]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 },
    );
  }
}
