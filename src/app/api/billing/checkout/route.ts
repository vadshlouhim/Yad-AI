import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCheckoutSession } from "@/lib/stripe";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getCanonicalAppOrigin, safeAppReturnUrl } from "@/lib/stripe-config";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Votre session a expiré. Reconnectez-vous pour continuer.", code: "AUTH_REQUIRED", redirectUrl: "/auth/login" },
        { status: 401 }
      );
    }

    const admin = createAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("communityId")
      .eq("id", user.id)
      .single();
    if (profileError) throw profileError;
    if (!profile?.communityId) {
      return NextResponse.json(
        {
          error: "Terminez la création de votre communauté avant de choisir un abonnement.",
          code: "ONBOARDING_REQUIRED",
          redirectUrl: "/onboarding",
        },
        { status: 409 }
      );
    }

    const { data: community, error: communityError } = await admin
      .from("Community")
      .select("stripeCustomerId")
      .eq("id", profile.communityId)
      .single();
    if (communityError || !community) {
      return NextResponse.json(
        { error: "La communauté associée à votre compte est introuvable.", code: "COMMUNITY_NOT_FOUND" },
        { status: 404 }
      );
    }

    const { data: subscriptions } = await admin
      .from("Subscription")
      .select("id, stripeSubscriptionId, status")
      .eq("communityId", profile.communityId)
      .limit(10);
    const activeSubscription = await findCurrentModeSubscription(subscriptions ?? []);
    if (activeSubscription) {
      return NextResponse.json(
        {
          error: "Un abonnement est déjà actif. Utilisez le portail de facturation pour le modifier.",
          code: "SUBSCRIPTION_ALREADY_ACTIVE",
        },
        { status: 409 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const firstSubscription = !(subscriptions?.length);
    const requestOrigin = getCanonicalAppOrigin(request.url);
    const successUrl = safeAppReturnUrl(body.successUrl, requestOrigin, "/dashboard/settings/billing?success=true");
    const cancelUrl = safeAppReturnUrl(body.cancelUrl, requestOrigin, "/dashboard/settings/billing");

    const session = await createCheckoutSession({
      communityId: profile.communityId,
      useIntroductoryPrice: firstSubscription,
      stripeCustomerId: community.stripeCustomerId ?? undefined,
      customerEmail: user.email,
      successUrl,
      cancelUrl,
    });

    if (!session.url) throw new Error("Stripe n'a pas renvoyé d'URL de paiement.");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[Billing Checkout] Échec de création:", error);
    return NextResponse.json(
      { error: checkoutErrorMessage(error), code: "CHECKOUT_FAILED" },
      { status: 500 }
    );
  }
}

async function findCurrentModeSubscription(subscriptions: Array<{ id: string; stripeSubscriptionId: string; status: string }>) {
  const candidates = subscriptions.filter((item) =>
    ["TRIALING", "ACTIVE", "PAST_DUE", "UNPAID", "INCOMPLETE", "PAUSED"].includes(item.status)
  );

  for (const candidate of candidates) {
    if (candidate.stripeSubscriptionId.startsWith("manual:")) return candidate;
    try {
      const current = await stripe.subscriptions.retrieve(candidate.stripeSubscriptionId);
      if (current.status !== "canceled" && current.status !== "incomplete_expired") return candidate;
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError && error.code === "resource_missing") continue;
      throw error;
    }
  }
  return undefined;
}

function checkoutErrorMessage(error: unknown) {
  if (error instanceof Stripe.errors.StripeError) {
    if (error.type === "StripeAuthenticationError") {
      return "La configuration Stripe du serveur est invalide.";
    }
    if (error.code === "resource_missing") {
      return "Une ressource Stripe configurée est introuvable.";
    }
    return "Stripe n'a pas pu créer la page de paiement. Réessayez dans un instant.";
  }
  if (error instanceof Error && error.message === "STRIPE_SECRET_KEY manquant") {
    return "Stripe n'est pas configuré sur le serveur.";
  }
  return "Impossible de préparer le paiement pour le moment.";
}
