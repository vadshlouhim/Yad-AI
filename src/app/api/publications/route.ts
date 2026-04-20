import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createPublicationsFromDraft, publishToChannel } from "@/lib/publishing/publisher";
import { z } from "zod";

const createSchema = z.object({
  draftId: z.string(),
  channelIds: z.array(z.string()),
  scheduledAt: z.string().datetime().optional(),
  publishNow: z.boolean().default(false),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const profile = await prisma.user.findUnique({ where: { id: user.id } });
    if (!profile?.communityId) return NextResponse.json({ error: "Pas de communauté" }, { status: 400 });

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const { draftId, channelIds, scheduledAt, publishNow } = parsed.data;

    // Créer les publications
    const publications = await createPublicationsFromDraft({
      draftId,
      communityId: profile.communityId,
      channelIds,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
    });

    // Publication immédiate si demandée
    if (publishNow) {
      const results: Record<string, unknown> = {};
      for (const pub of publications) {
        const fullPub = await prisma.publication.findUnique({
          where: { id: pub.id },
          include: { channel: true },
        });
        if (fullPub) {
          results[pub.channelId] = await publishToChannel(fullPub);
        }
      }
      return NextResponse.json({ publications, results });
    }

    return NextResponse.json({ publications }, { status: 201 });
  } catch (error) {
    console.error("[Publications POST]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const profile = await prisma.user.findUnique({ where: { id: user.id } });
    if (!profile?.communityId) return NextResponse.json({ error: "Pas de communauté" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const channelType = searchParams.get("channelType");

    const publications = await prisma.publication.findMany({
      where: {
        communityId: profile.communityId,
        ...(status && { status: status as never }),
        ...(channelType && { channelType: channelType as never }),
      },
      orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
      take: 50,
      include: {
        channel: { select: { type: true, name: true } },
        event: { select: { title: true, category: true } },
        draft: { select: { title: true, contentType: true } },
      },
    });

    return NextResponse.json(publications);
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
