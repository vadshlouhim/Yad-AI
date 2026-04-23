import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPortalSession } from "@/lib/stripe";

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
