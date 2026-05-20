import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createArticleCheckoutSession } from "@/lib/stripe";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
  if (!profile?.communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  const body = await request.json();
  const { articleId, successUrl, cancelUrl } = body as {
    articleId?: string;
    successUrl?: string;
    cancelUrl?: string;
  };

  if (!articleId || !successUrl || !cancelUrl) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const [{ data: community }, { data: article }] = await Promise.all([
    admin
      .from("Community")
      .select("stripeCustomerId")
      .eq("id", profile.communityId)
      .single(),
    admin
      .from("Article")
      .select("id, slug, stripePriceId")
      .eq("id", articleId)
      .eq("isActive", true)
      .or(`isGlobal.eq.true,communityId.eq.${profile.communityId}`)
      .single(),
  ]);

  if (!article?.stripePriceId) {
    return NextResponse.json({ error: "Article introuvable ou non commandable" }, { status: 404 });
  }

  const session = await createArticleCheckoutSession({
    communityId: profile.communityId,
    articleId: article.id,
    articleSlug: article.slug,
    priceId: article.stripePriceId,
    stripeCustomerId: community?.stripeCustomerId ?? undefined,
    successUrl,
    cancelUrl,
  });

  return NextResponse.json({ url: session.url });
}
