import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const profile = await prisma.user.findUnique({ where: { id: user.id } });
  if (!profile?.communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  const body = await request.json();

  const channel = await prisma.channel.upsert({
    where: {
      communityId_type: { communityId: profile.communityId, type: body.type },
    },
    create: {
      communityId: profile.communityId,
      type: body.type,
      name: body.name ?? body.type,
      accessToken: body.accessToken ?? null,
      pageId: body.pageId ?? null,
      isConnected: body.isConnected ?? false,
      isActive: body.isActive ?? true,
    },
    update: {
      accessToken: body.accessToken !== undefined ? body.accessToken : undefined,
      pageId: body.pageId !== undefined ? body.pageId : undefined,
      isConnected: body.isConnected !== undefined ? body.isConnected : undefined,
      isActive: body.isActive !== undefined ? body.isActive : undefined,
      name: body.name !== undefined ? body.name : undefined,
    },
  });

  return NextResponse.json(channel, { status: 201 });
}
