import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCheckoutSession } from "@/lib/stripe";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getCanonicalAppOrigin, safeAppReturnUrl } from "@/lib/stripe-config";
import { isTrialEligible, trialEndsAt, type BillingInterval } from "@/lib/billing/subscription-policy";

// Stripe refuses a trial_end less than 48 hours away; below that, billing starts now.
const MIN_STRIPE_TRIAL_MS = 49 * 60 * 60 * 1000;

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
      .select("communityId, locale")
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
      .select("stripeCustomerId, createdAt")
      .eq("id", profile.communityId)
      .single();
    if (communityError || !community) {
      return NextResponse.json(
        { error: "La communauté associée à votre compte est introuvable.", code: "COMMUNITY_NOT_FOUND" },
        { status: 404 }
      );
    }

    const { data: subscriptions, error: subscriptionsError } = await admin
      .from("Subscription")
      .select("id, stripeSubscriptionId, status")
      .eq("communityId", profile.communityId)
      .limit(10);
    if (subscriptionsError) throw subscriptionsError;
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
    const interval: BillingInterval = body.interval === "year" ? "year" : "month";
    // The free trial runs from community creation without a card; subscribing early
    // keeps the remaining days free instead of charging right away.
    const remainingTrialEnd = trialEndsAt(community.createdAt);
    const trialEnd = isTrialEligible(subscriptions?.length ?? 0) && remainingTrialEnd.getTime() - Date.now() >= MIN_STRIPE_TRIAL_MS
      ? remainingTrialEnd
      : null;
    const requestOrigin = getCanonicalAppOrigin(request.url);
    const successUrl = safeAppReturnUrl(body.successUrl, requestOrigin, "/dashboard/settings/billing?success=true");
    const cancelUrl = safeAppReturnUrl(body.cancelUrl, requestOrigin, "/dashboard/settings/billing");

    const session = await createCheckoutSession({
      communityId: profile.communityId,
      userId: user.id,
      locale: profile.locale === "he" || profile.locale === "en" ? profile.locale : "fr",
      interval,
      trialEnd,
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
  // Server configuration problems (keys, prices, site URL) name the setting to fix; they never
  // contain a secret value, only the variable name or the mismatch.
  if (error instanceof Error && /STRIPE_|NEXT_PUBLIC_APP_URL|Price Stripe|Stripe (TEST|LIVE)|mauvais environnement/.test(error.message)) {
    return `Configuration du paiement incomplète : ${error.message}`;
  }
  return "Impossible de préparer le paiement pour le moment.";
}
