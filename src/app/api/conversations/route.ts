import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// GET — Liste des conversations de l'utilisateur
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const conversations = await prisma.conversation.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(conversations);
}

// POST — Créer une nouvelle conversation
export async function POST(request: Request) {
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

  const body = await request.json().catch(() => ({}));

  const conversation = await prisma.conversation.create({
    data: {
      userId: user.id,
      communityId: profile.communityId,
      title: body.title ?? "Nouvelle conversation",
    },
  });

  return NextResponse.json(conversation);
}
