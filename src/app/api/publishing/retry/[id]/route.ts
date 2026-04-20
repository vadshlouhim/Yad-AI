import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { retryFailedPublication } from "@/lib/publishing/publisher";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const profile = await prisma.user.findUnique({ where: { id: user.id } });
  if (!profile?.communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  const { id } = await params;
  const publication = await prisma.publication.findFirst({
    where: { id, communityId: profile.communityId },
  });

  if (!publication) return NextResponse.json({ error: "Publication introuvable" }, { status: 404 });
  if (publication.status !== "FAILED") {
    return NextResponse.json({ error: "Seules les publications en échec peuvent être relancées" }, { status: 400 });
  }

  await retryFailedPublication(id);
  return NextResponse.json({ success: true });
}
