import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createPortalSession } from "@/lib/stripe";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const profile = await prisma.user.findUnique({ where: { id: user.id } });
  if (!profile?.communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  const community = await prisma.community.findUnique({
    where: { id: profile.communityId },
    select: { stripeCustomerId: true },
  });

  if (!community?.stripeCustomerId) {
    return NextResponse.json({ error: "Aucun abonnement Stripe trouvé" }, { status: 400 });
  }

  const body = await request.json();
  const session = await createPortalSession({
    stripeCustomerId: community.stripeCustomerId,
    returnUrl: body.returnUrl,
  });

  return NextResponse.json({ url: session.url });
}
