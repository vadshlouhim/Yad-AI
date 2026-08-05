import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPortalSession } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Votre session a expiré." }, { status: 401 });

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

    const body = await request.json().catch(() => ({}));
    const origin = new URL(request.url).origin;
    const session = await createPortalSession({
      stripeCustomerId: community.stripeCustomerId,
      returnUrl: safeReturnUrl(body.returnUrl, origin),
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[Billing Portal] Échec de création:", error);
    return NextResponse.json(
      { error: "Impossible d'ouvrir le portail de facturation pour le moment." },
      { status: 500 }
    );
  }
}

function safeReturnUrl(value: unknown, origin: string) {
  const fallback = new URL("/dashboard/settings/billing", origin).toString();
  try {
    const url = new URL(typeof value === "string" ? value : fallback, origin);
    return url.origin === origin ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}
