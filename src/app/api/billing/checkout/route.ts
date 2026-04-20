import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createCheckoutSession } from "@/lib/stripe";

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

  const body = await request.json();
  const { priceId, successUrl, cancelUrl } = body;

  const session = await createCheckoutSession({
    communityId: profile.communityId,
    priceId,
    stripeCustomerId: community?.stripeCustomerId ?? undefined,
    successUrl,
    cancelUrl,
  });

  return NextResponse.json({ url: session.url });
}
