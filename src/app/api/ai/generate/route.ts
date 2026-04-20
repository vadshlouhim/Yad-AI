import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { generateContent } from "@/lib/ai/engine";
import { z } from "zod";

const generateSchema = z.object({
  contentType: z.string(),
  eventId: z.string().optional(),
  channelType: z.string().optional(),
  customInstructions: z.string().optional(),
  saveDraft: z.boolean().optional().default(true),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { communityId: true },
    });
    if (!profile?.communityId) {
      return NextResponse.json({ error: "Communauté non configurée" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
    }

    const { contentType, eventId, channelType, customInstructions, saveDraft } = parsed.data;

    // Générer le contenu
    const generated = await generateContent({
      communityId: profile.communityId,
      contentType: contentType as never,
      eventId,
      channelType: channelType as never,
      customInstructions,
    });

    // Sauvegarder en brouillon si demandé
    let draftId: string | undefined;
    if (saveDraft) {
      const draft = await prisma.contentDraft.create({
        data: {
          communityId: profile.communityId,
          eventId: eventId ?? null,
          body: generated.body,
          bodyHebrew: generated.bodyHebrew ?? null,
          hashtags: generated.hashtags,
          cta: generated.cta ?? null,
          contentType: contentType as never,
          status: "AI_PROPOSAL",
          aiGenerated: true,
          aiModel: "gemini-2.5-flash",
        },
      });
      draftId = draft.id;

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          communityId: profile.communityId,
          action: "content.generated",
          resource: "ContentDraft",
          resourceId: draftId,
          newData: { contentType, channelType },
        },
      });
    }

    return NextResponse.json({ success: true, generated, draftId });
  } catch (error) {
    console.error("[AI Generate] Erreur:", error);
    return NextResponse.json({ error: "Erreur lors de la génération" }, { status: 500 });
  }
}
