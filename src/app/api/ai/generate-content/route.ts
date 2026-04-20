import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { generateContent } from "@/lib/ai/engine";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const profile = await prisma.user.findUnique({ where: { id: user.id } });
  if (!profile?.communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  const body = await request.json();
  const { contentType, eventId, instructions } = body;

  try {
    const result = await generateContent({
      communityId: profile.communityId,
      contentType: (contentType ?? "GENERAL") as never,
      eventId: eventId ?? undefined,
      customInstructions: instructions,
    });

    // Sauvegarder en brouillon IA
    const draft = await prisma.contentDraft.create({
      data: {
        communityId: profile.communityId,
        body: result.body,
        title: null,
        hashtags: result.hashtags ?? [],
        contentType: (contentType ?? "GENERAL") as never,
        eventId: eventId ?? null,
        status: "AI_PROPOSAL",
        aiGenerated: true,
        aiModel: "gemini-2.5-flash",
        aiPromptUsed: instructions ?? null,
      },
    });

    return NextResponse.json({ ...result, draftId: draft.id });
  } catch (error) {
    console.error("[AI Generate]", error);
    return NextResponse.json({ error: "Erreur de génération IA" }, { status: 500 });
  }
}
