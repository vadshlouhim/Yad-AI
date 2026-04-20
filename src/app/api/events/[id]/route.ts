import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { id } = await params;
    const profile = await prisma.user.findUnique({ where: { id: user.id } });

    const event = await prisma.event.findFirst({
      where: { id, communityId: profile?.communityId ?? "" },
      include: {
        contentDrafts: {
          orderBy: { updatedAt: "desc" },
          take: 10,
        },
        publications: {
          orderBy: { scheduledAt: "desc" },
          take: 10,
          include: { channel: { select: { type: true, name: true } } },
        },
        mediaFiles: { take: 20 },
        _count: { select: { contentDrafts: true, publications: true } },
      },
    });

    if (!event) return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
    return NextResponse.json(event);
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { id } = await params;
    const profile = await prisma.user.findUnique({ where: { id: user.id } });
    if (!profile?.communityId) return NextResponse.json({ error: "Pas de communauté" }, { status: 400 });

    // Vérifier que l'événement appartient à la communauté
    const existing = await prisma.event.findFirst({
      where: { id, communityId: profile.communityId },
    });
    if (!existing) return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });

    const body = await request.json();

    const updated = await prisma.event.update({
      where: { id },
      data: {
        ...body,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        category: body.category as never,
        status: body.status as never,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        communityId: profile.communityId,
        action: "event.updated",
        resource: "Event",
        resourceId: id,
        oldData: existing,
        newData: body,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { id } = await params;
    const profile = await prisma.user.findUnique({ where: { id: user.id } });
    if (!profile?.communityId) return NextResponse.json({ error: "Pas de communauté" }, { status: 400 });

    const existing = await prisma.event.findFirst({
      where: { id, communityId: profile.communityId },
    });
    if (!existing) return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });

    // Archiver plutôt que supprimer (soft delete)
    await prisma.event.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        communityId: profile.communityId,
        action: "event.archived",
        resource: "Event",
        resourceId: id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
}
