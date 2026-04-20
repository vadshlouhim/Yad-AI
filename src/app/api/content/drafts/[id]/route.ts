import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

async function getAuthorizedDraft(draftId: string, userId: string) {
  const profile = await prisma.user.findUnique({ where: { id: userId } });
  if (!profile?.communityId) return null;

  const draft = await prisma.contentDraft.findFirst({
    where: { id: draftId, communityId: profile.communityId },
  });
  return draft;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const draft = await prisma.contentDraft.findUnique({
    where: { id },
    include: {
      event: true,
      channelAdaptations: true,
      publications: {
        include: { channel: { select: { type: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!draft) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(draft);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const draft = await getAuthorizedDraft(id, user.id);
  if (!draft) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await request.json();
  const updated = await prisma.contentDraft.update({
    where: { id },
    data: {
      title: body.title !== undefined ? body.title : undefined,
      body: body.body !== undefined ? body.body : undefined,
      status: body.status !== undefined ? body.status : undefined,
      hashtags: body.hashtags !== undefined ? body.hashtags : undefined,
      scheduledAt: body.scheduledAt !== undefined ? (body.scheduledAt ? new Date(body.scheduledAt) : null) : undefined,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const draft = await getAuthorizedDraft(id, user.id);
  if (!draft) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await prisma.contentDraft.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
