import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const profile = await prisma.user.findUnique({ where: { id: user.id } });
  if (!profile?.communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  const body = await request.json();

  const allowed = [
    "name", "description", "city", "country", "timezone",
    "phone", "email", "website", "address", "postalCode",
    "tone", "language", "signature", "hashtags", "mentions",
    "editorialRules", "communityType", "religiousStream",
    "logoUrl", "coverUrl",
  ];

  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  const updated = await prisma.community.update({
    where: { id: profile.communityId },
    data: data as never,
  });

  return NextResponse.json(updated);
}

export async function GET(_request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const profile = await prisma.user.findUnique({ where: { id: user.id } });
  if (!profile?.communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  const community = await prisma.community.findUnique({
    where: { id: profile.communityId },
  });

  return NextResponse.json(community);
}
