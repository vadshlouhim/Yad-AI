import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { adaptContentForChannel } from "@/lib/ai/engine";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const profile = await prisma.user.findUnique({ where: { id: user.id } });
  if (!profile?.communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  const body = await request.json();
  const { draftId, channelTypes } = body;

  const draft = await prisma.contentDraft.findFirst({
    where: { id: draftId, communityId: profile.communityId },
  });

  if (!draft) return NextResponse.json({ error: "Brouillon introuvable" }, { status: 404 });

  const results = await Promise.all(
    (channelTypes as string[]).map(async (channelType) => {
      const adapted = await adaptContentForChannel({
        communityId: profile.communityId!,
        originalContent: draft.body,
        targetChannel: channelType as never,
      });

      await prisma.channelAdaptation.upsert({
        where: { draftId_channelType: { draftId, channelType } },
        create: {
          draftId,
          channelType: channelType as never,
          body: adapted.body,
          hashtags: adapted.hashtags ?? [],
          cta: adapted.cta ?? null,
        },
        update: {
          body: adapted.body,
          hashtags: adapted.hashtags ?? [],
          cta: adapted.cta ?? null,
        },
      });

      return { channelType, ...adapted };
    })
  );

  return NextResponse.json({ adaptations: results });
}
