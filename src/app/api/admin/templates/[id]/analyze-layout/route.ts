export const runtime = "nodejs";
export const maxDuration = 180;

import { NextResponse } from "next/server";
import { canAccessAdmin } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { analyzeTemplateLayout } from "@/lib/templates/layout-analysis";
import { resolveTemplateAssetUrl } from "@/lib/templates/shared";
import { TEMPLATE_LAYOUT_ANALYSIS_VERSION } from "@/lib/templates/zones";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé", code: "UNAUTHORIZED" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("email, role").eq("id", user.id).single();
  if (!canAccessAdmin(profile)) {
    return NextResponse.json({ error: "Accès réservé à l’admin global", code: "FORBIDDEN" }, { status: 403 });
  }

  const { id } = await params;
  const { data: template } = await admin
    .from("Template")
    .select("id, name, category, originalUrl, previewUrl, design")
    .eq("id", id)
    .maybeSingle();
  if (!template) return NextResponse.json({ error: "Affiche introuvable", code: "TEMPLATE_NOT_FOUND" }, { status: 404 });
  const imageUrl = resolveTemplateAssetUrl(template.originalUrl) ?? resolveTemplateAssetUrl(template.previewUrl);
  if (!imageUrl) return NextResponse.json({ error: "Téléversez d’abord l’image source.", code: "SOURCE_REQUIRED" }, { status: 400 });

  await admin.from("Template").update({ layoutStatus: "ANALYZING", updatedAt: new Date().toISOString() }).eq("id", id);
  try {
    const analysis = await analyzeTemplateLayout({
      imageUrl,
      templateName: template.name,
      category: template.category,
      existingZones: template.design,
    });
    const analyzedAt = new Date().toISOString();
    const { data: updated, error } = await admin.from("Template").update({
      design: analysis.zones,
      layoutStatus: "REVIEW",
      layoutConfidence: analysis.confidence,
      layoutAnalyzedAt: analyzedAt,
      layoutAnalysisVersion: TEMPLATE_LAYOUT_ANALYSIS_VERSION,
      updatedAt: analyzedAt,
    }).eq("id", id).select().single();
    if (error) throw error;
    return NextResponse.json({ ...updated, analysisSummary: analysis.summary });
  } catch (error) {
    await admin.from("Template").update({ layoutStatus: "FAILED", updatedAt: new Date().toISOString() }).eq("id", id);
    console.error("[Admin Template Layout Analysis]", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Analyse visuelle impossible.",
      code: "LAYOUT_ANALYSIS_FAILED",
    }, { status: 422 });
  }
}
