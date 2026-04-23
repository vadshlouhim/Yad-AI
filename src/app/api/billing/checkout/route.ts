import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCheckoutSession } from "@/lib/stripe";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
  if (!profile?.communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  const { data: community } = await admin
    .from("Community")
    .select("stripeCustomerId")
    .eq("id", profile.communityId)
    .single();

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
