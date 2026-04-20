import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createPublicationsFromDraft, publishToAllChannels } from "@/lib/publishing/publisher";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const profile = await prisma.user.findUnique({ where: { id: user.id } });
  if (!profile?.communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  const body = await request.json();
  const { draftId, channelTypes, scheduledAt } = body;

  // Récupérer les IDs de canaux à partir des types
  const channels = await prisma.channel.findMany({
    where: {
      communityId: profile.communityId,
      type: { in: channelTypes },
      isActive: true,
    },
    select: { id: true },
  });

  if (channels.length === 0) {
    return NextResponse.json({ error: "Aucun canal actif trouvé" }, { status: 400 });
  }

  const publications = await createPublicationsFromDraft({
    draftId,
    communityId: profile.communityId,
    channelIds: channels.map((c: { id: string }) => c.id),
    scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
  });

  // Si pas de scheduledAt → publier immédiatement en arrière-plan
  if (!scheduledAt) {
    publishToAllChannels(draftId, channels.map((c: { id: string }) => c.id)).catch(console.error);
  }

  return NextResponse.json({ publications, count: publications.length });
}
