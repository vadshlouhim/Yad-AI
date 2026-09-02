import { NextResponse } from "next/server";
import { stripe, switchIntroductorySubscriptionToBasePrice } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type Stripe from "stripe";
import { createNotificationOnce } from "@/lib/notifications/create-once";
import { assertStripeConfiguration } from "@/lib/stripe-config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertStripeConfiguration({ webhook: true });
  } catch (error) {
    console.error("[Stripe Webhook] Configuration invalide:", error);
    return NextResponse.json({ error: "Webhook Stripe non configuré" }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error("[Stripe Webhook] Erreur signature:", error);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  console.log(`[Stripe Webhook] Événement: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(subscription);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Erreur traitement:", error);
    return NextResponse.json({ error: "Erreur traitement" }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const communityId = session.metadata?.communityId;
  if (!communityId) return;

  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  if (!customerId) throw new Error("Checkout Stripe sans Customer.");
  const admin = createAdminClient();
  const communityUpdate = await admin
    .from("Community")
    .update({ stripeCustomerId: customerId, updatedAt: new Date().toISOString() })
    .eq("id", communityId);
  throwIfSupabaseError(communityUpdate.error, "association Customer/communauté");

  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  if (session.mode === "subscription" && session.metadata?.introductoryPrice === "true" && subscriptionId) {
    await switchIntroductorySubscriptionToBasePrice(subscriptionId);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const communityId = subscription.metadata?.communityId;
  if (!communityId) return;

  const priceId = subscription.items.data[0]?.price.id;
  if (!priceId) throw new Error("Abonnement Stripe sans Price.");
  const plan = getPlanFromSubscription(subscription, priceId);
  const sub = subscription as unknown as {
    current_period_start: number;
    current_period_end: number;
    trial_start: number | null;
    trial_end: number | null;
    canceled_at: number | null;
  };

  const admin = createAdminClient();

  const communityUpdate = await admin
    .from("Community")
    .update({
      plan: hasPaidAccess(subscription.status) ? plan : "FREE_TRIAL",
      stripeCustomerId: subscription.customer as string,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", communityId);
  throwIfSupabaseError(communityUpdate.error, "mise à jour du plan");

  const subscriptionUpsert = await admin.from("Subscription").upsert(
    {
      communityId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      plan,
      status: mapStripeStatus(subscription.status),
      currentPeriodStart: new Date(sub.current_period_start * 1000).toISOString(),
      currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
      trialStart: sub.trial_start ? new Date(sub.trial_start * 1000).toISOString() : null,
      trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
      updatedAt: new Date().toISOString(),
    },
    { onConflict: "stripeSubscriptionId" }
  );
  throwIfSupabaseError(subscriptionUpsert.error, "enregistrement de l'abonnement");

  await notifySubscriptionChange(
    communityId,
    "SUBSCRIPTION_RENEWED",
    `Votre abonnement ${plan} est actif.`,
    `subscription:${subscription.id}:${subscription.status}`
  );
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const communityId = subscription.metadata?.communityId;
  if (!communityId) return;

  const admin = createAdminClient();

  const communityUpdate = await admin
    .from("Community")
    .update({ plan: "FREE_TRIAL", updatedAt: new Date().toISOString() })
    .eq("id", communityId);
  throwIfSupabaseError(communityUpdate.error, "révocation du plan");

  const subscriptionUpdate = await admin
    .from("Subscription")
    .update({ status: "CANCELED", canceledAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .eq("stripeSubscriptionId", subscription.id);
  throwIfSupabaseError(subscriptionUpdate.error, "annulation de l'abonnement");

  await notifySubscriptionChange(
    communityId,
    "SUBSCRIPTION_EXPIRING",
    "Votre abonnement a été annulé. Passez à un plan payant pour continuer.",
    `subscription-canceled:${subscription.id}`
  );
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const admin = createAdminClient();
  const { data: community } = await admin
    .from("Community")
    .select("id")
    .eq("stripeCustomerId", customerId)
    .single();

  if (community) {
    await notifySubscriptionChange(
      community.id,
      "PAYMENT_FAILED",
      "Le paiement de votre abonnement a échoué. Mettez à jour votre moyen de paiement.",
      `payment-failed:${invoice.id}`
    );
  }
}

async function notifySubscriptionChange(communityId: string, type: string, message: string, dedupeKey: string) {
  const admin = createAdminClient();
  const { data: user } = await admin
    .from("profiles")
    .select("id")
    .eq("communityId", communityId)
    .limit(1)
    .maybeSingle();

  if (!user) return;

  await createNotificationOnce(admin, {
    userId: user.id,
    communityId,
    type: type as never,
    title: "Abonnement",
    body: message,
    link: "/dashboard/settings/billing",
    dedupeKey,
  });
}

function getPlanFromPriceId(priceId: string): "STARTER" | "PROFESSIONAL" | "ENTERPRISE" {
  if (priceId === process.env.STRIPE_PAID_PRICE_ID) return "PROFESSIONAL";
  if (priceId === process.env.STRIPE_LAUNCH_PRICE_ID) return "PROFESSIONAL";
  if (priceId === process.env.STRIPE_STARTER_PRICE_ID) return "STARTER";
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "PROFESSIONAL";
  if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) return "ENTERPRISE";
  throw new Error(`Price Stripe non autorisé: ${priceId}`);
}

function getPlanFromSubscription(
  subscription: Stripe.Subscription,
  priceId: string
): "FREE_TRIAL" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE" {
  const metadataTier = subscription.metadata?.planTier;
  const configuredPlan = getPlanFromPriceId(priceId);
  if (metadataTier && metadataTier !== configuredPlan) {
    throw new Error("Le plan des metadata Stripe ne correspond pas au Price configuré.");
  }
  return configuredPlan;
}

function mapStripeStatus(status: string): "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "UNPAID" | "INCOMPLETE" | "PAUSED" {
  const map: Record<string, "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "UNPAID" | "INCOMPLETE" | "PAUSED"> = {
    trialing: "TRIALING",
    active: "ACTIVE",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    unpaid: "UNPAID",
    incomplete: "INCOMPLETE",
    incomplete_expired: "CANCELED",
    paused: "PAUSED",
  };
  const mapped = map[status];
  if (!mapped) throw new Error(`Statut Stripe non pris en charge: ${status}`);
  return mapped;
}

function hasPaidAccess(status: Stripe.Subscription.Status) {
  return status === "trialing" || status === "active" || status === "past_due";
}

function throwIfSupabaseError(error: { message: string } | null, operation: string) {
  if (error) throw new Error(`Échec Supabase pendant ${operation}: ${error.message}`);
}
