import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { recordToPosterTextBlocks, type PosterTextBlock } from "@/lib/templates/render";

function normalizeTextRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string")
      .slice(0, 30),
  );
}

function blocksFromExactParagraphs(instruction: string): PosterTextBlock[] {
  return instruction
    .split(/\r?\n[ \t]*\r?\n/)
    .filter((paragraph) => paragraph.trim().length > 0)
    .map((text, index) => ({
      id: `paragraph_${index + 1}`,
      text,
      role: index === 0 ? "title" : "paragraph",
      priority: index === 0 ? "main" : index === 1 ? "important" : "complementary",
    }));
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await request.json() as Record<string, unknown>;
    const templateId = typeof body.templateId === "string" ? body.templateId : "";
    const answers = body.answers && typeof body.answers === "object" && !Array.isArray(body.answers)
      ? body.answers as Record<string, unknown>
      : {};
    const instruction = typeof answers.instruction === "string" ? answers.instruction : "";
    const currentValues = normalizeTextRecord(answers.valeurs_actuelles);
    if (!templateId || (!instruction.trim() && Object.keys(currentValues).length === 0)) {
      return NextResponse.json({ error: "Fournissez les textes exacts à composer." }, { status: 400 });
    }
    if (instruction.length > 20_000) {
      return NextResponse.json({ error: "La demande est trop longue pour être analysée." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
    if (!profile?.communityId) {
      return NextResponse.json({ error: "Communauté non configurée" }, { status: 400 });
    }
    const { data: template } = await admin
      .from("Template")
      .select("id")
      .eq("id", templateId)
      .eq("layoutStatus", "READY")
      .or(`isGlobal.eq.true,communityId.eq.${profile.communityId}`)
      .single();
    if (!template) return NextResponse.json({ error: "Template introuvable" }, { status: 404 });

    const textBlocks = Object.keys(currentValues).length > 0
      ? recordToPosterTextBlocks(currentValues)
      : blocksFromExactParagraphs(instruction);
    return NextResponse.json({
      textBlocks,
      generatedTexts: Object.fromEntries(textBlocks.map((block) => [block.id, block.text])),
      rejectedZoneIds: [],
    });
  } catch (error) {
    console.error("[Templates Generate] Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
