export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderTemplatePoster } from "@/lib/templates/render";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    if (!process.env.FAL_KEY) {
      return NextResponse.json(
        { error: "FAL_KEY manquant dans l'environnement serveur" },
        { status: 500 }
      );
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

    return NextResponse.json({
      imageUrl: rendered.imageUrl,
      promptUsed: rendered.promptUsed,
    });
  } catch (error) {
    console.error("[Templates Render] Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
