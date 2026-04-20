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
  const {
    title, body: content, contentType, eventId, hashtags, status,
  } = body;

  if (!content?.trim()) {
    return NextResponse.json({ error: "Le contenu est requis" }, { status: 400 });
  }

  const draft = await prisma.contentDraft.create({
    data: {
      communityId: profile.communityId,
      title: title ?? null,
      body: content,
      contentType: contentType ?? "GENERAL",
      eventId: eventId ?? null,
      hashtags: hashtags ?? [],
      status: status ?? "DRAFT",
      aiGenerated: false,
    },
  });

  return NextResponse.json(draft, { status: 201 });
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const profile = await prisma.user.findUnique({ where: { id: user.id } });
  if (!profile?.communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") ?? "20");

  const drafts = await prisma.contentDraft.findMany({
    where: {
      communityId: profile.communityId,
      ...(status ? { status: status as never } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      event: { select: { title: true, category: true } },
    },
  });

  return NextResponse.json(drafts);
}
