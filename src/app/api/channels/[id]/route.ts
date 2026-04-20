import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

async function getAuthorizedChannel(channelId: string, userId: string) {
  const profile = await prisma.user.findUnique({ where: { id: userId } });
  if (!profile?.communityId) return null;

  return prisma.channel.findFirst({
    where: { id: channelId, communityId: profile.communityId },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const channel = await getAuthorizedChannel(id, user.id);
  if (!channel) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await request.json();
  const updated = await prisma.channel.update({
    where: { id },
    data: {
      isActive: body.isActive !== undefined ? body.isActive : undefined,
      isConnected: body.isConnected !== undefined ? body.isConnected : undefined,
      name: body.name !== undefined ? body.name : undefined,
      handle: body.handle !== undefined ? body.handle : undefined,
      accessToken: body.accessToken !== undefined ? body.accessToken : undefined,
      refreshToken: body.refreshToken !== undefined ? body.refreshToken : undefined,
      pageId: body.pageId !== undefined ? body.pageId : undefined,
      settings: body.settings !== undefined ? body.settings : undefined,
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
  const channel = await getAuthorizedChannel(id, user.id);
  if (!channel) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await prisma.channel.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
