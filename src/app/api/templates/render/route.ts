export const runtime = "nodejs";
export const maxDuration = 180;

import { NextResponse } from "next/server";
import { FREE_POSTER_LIMIT, getBillingGate, getBillingUsage, paywallResponse } from "@/lib/billing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { editTemplatePosterWithFal, type PosterChange } from "@/lib/templates/fal-edit";

function changesFromLegacyBody(body: Record<string, unknown>): PosterChange[] {
  if (Array.isArray(body.textBlocks)) {
    return body.textBlocks.slice(0, 20).flatMap((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const block = item as Record<string, unknown>;
      const newText = typeof block.text === "string" ? block.text.trim() : "";
      if (!newText) return [];
      return [{
        label: typeof block.role === "string" ? block.role : `Texte ${index + 1}`,
        currentText: "",
        newText: newText.slice(0, 500),
      }];
    });
  }
  if (body.generatedTexts && typeof body.generatedTexts === "object" && !Array.isArray(body.generatedTexts)) {
    return Object.entries(body.generatedTexts as Record<string, unknown>).slice(0, 20).flatMap(([label, value]) => {
      const newText = typeof value === "string" ? value.trim() : "";
      return newText ? [{ label, currentText: "", newText: newText.slice(0, 500) }] : [];
    });
  }
  return [];
}

function trustedLogoUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const logoUrl = new URL(value.trim());
    const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    return logoUrl.protocol === "https:" && logoUrl.host === supabaseUrl.host ? logoUrl.toString() : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const body = await request.json() as Record<string, unknown>;
    const templateId = typeof body.templateId === "string" ? body.templateId : "";
    const changes = changesFromLegacyBody(body);
    const logoUrl = trustedLogoUrl(body.logoUrl);
    const structureName = changes.find((change) => change.label === "organization")?.newText;
    if (!templateId || changes.length === 0) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

    const admin = createAdminClient();
    const gate = await getBillingGate(admin, user.id);
    if (!gate.communityId) return NextResponse.json({ error: "Communauté non configurée" }, { status: 400 });
    if (!gate.isPaid) {
      const usage = await getBillingUsage(admin, gate.communityId, gate.tier);
      if (usage.posterGenerations >= FREE_POSTER_LIMIT) {
        return paywallResponse("poster_generations", "Le mode gratuit permet de modifier une seule affiche.", { posterGenerations: usage.posterGenerations });
      }
    }
    const { data: template } = await admin.from("Template").select("*").eq("id", templateId)
      .or(`isGlobal.eq.true,communityId.eq.${gate.communityId}`).single();
    if (!template) return NextResponse.json({ error: "Template introuvable" }, { status: 404 });
    const edited = await editTemplatePosterWithFal({
      admin,
      template,
      communityId: gate.communityId,
      userId: user.id,
      changes,
      referenceImageUrls: logoUrl ? [logoUrl] : undefined,
      editInstructions: [
        "NON-NEGOTIABLE BRANDING REQUIREMENTS:",
        structureName
          ? `The official organization name is "${structureName}". It is mandatory: reproduce it exactly, clearly and legibly once on the final poster. Never omit, abbreviate, translate or alter it.`
          : "The organization name provided in the confirmed content is mandatory and must never be omitted or altered.",
        logoUrl
          ? "The second reference image is the community's official logo. Its presence is mandatory: add that exact logo once, fully visible, in a discreet existing branding area. Never ignore, redraw, crop, distort, recolor or replace it, and never write its URL as text."
          : "No separate official logo reference was supplied; do not invent one.",
      ].join("\n"),
    });
    await admin.from("Template").update({ usageCount: (template.usageCount ?? 0) + 1, updatedAt: new Date().toISOString() }).eq("id", template.id);
    return NextResponse.json({ imageUrl: edited.imageUrl, usedTextBlocks: body.textBlocks ?? [], generatedTexts: body.generatedTexts ?? {}, warnings: [] });
  } catch (error) {
    console.error("[Template Fal Render]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Modification impossible" }, { status: 500 });
  }
}
