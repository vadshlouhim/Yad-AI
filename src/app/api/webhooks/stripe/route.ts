import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
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

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
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

  const customerId = session.customer as string;

  // Créer ou lier le customer Stripe
  await prisma.community.update({
    where: { id: communityId },
    data: { stripeCustomerId: customerId },
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const communityId = subscription.metadata?.communityId;
  if (!communityId) return;

  const priceId = subscription.items.data[0]?.price.id;
  const plan = getPlanFromPriceId(priceId);

  await prisma.$transaction([
    prisma.community.update({
      where: { id: communityId },
      data: { plan, stripeCustomerId: subscription.customer as string },
    }),
    prisma.subscription.upsert({
      where: { stripeSubscriptionId: subscription.id },
      create: {
        communityId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        plan,
        status: mapStripeStatus(subscription.status),
        currentPeriodStart: new Date((subscription as unknown as { current_period_start: number }).current_period_start * 1000),
        currentPeriodEnd: new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000),
        trialStart: (subscription as unknown as { trial_start: number | null }).trial_start
          ? new Date((subscription as unknown as { trial_start: number }).trial_start * 1000)
          : null,
        trialEnd: (subscription as unknown as { trial_end: number | null }).trial_end
          ? new Date((subscription as unknown as { trial_end: number }).trial_end * 1000)
          : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
      update: {
        status: mapStripeStatus(subscription.status),
        currentPeriodEnd: new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: (subscription as unknown as { canceled_at: number | null }).canceled_at
          ? new Date((subscription as unknown as { canceled_at: number }).canceled_at * 1000)
          : null,
      },
    }),
  ]);

  // Notification à l'admin
  await notifySubscriptionChange(communityId, "SUBSCRIPTION_RENEWED",
    `Votre abonnement ${plan} est actif.`);
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const communityId = subscription.metadata?.communityId;
  if (!communityId) return;

  await prisma.$transaction([
    prisma.community.update({
      where: { id: communityId },
      data: { plan: "FREE_TRIAL" },
    }),
    prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: "CANCELED",
        canceledAt: new Date(),
      },
    }),
  ]);

  await notifySubscriptionChange(communityId, "SUBSCRIPTION_EXPIRING",
    "Votre abonnement a été annulé. Passez à un plan payant pour continuer.");
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log("[Stripe] Paiement réussi:", invoice.id);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const community = await prisma.community.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (community) {
    await notifySubscriptionChange(community.id, "PAYMENT_FAILED",
      "Le paiement de votre abonnement a échoué. Mettez à jour votre moyen de paiement.");
  }
}

async function notifySubscriptionChange(
  communityId: string,
  type: string,
  message: string
) {
  const user = await prisma.user.findFirst({ where: { communityId } });
  if (!user) return;

  await prisma.notification.create({
    data: {
      userId: user.id,
      communityId,
      type: type as never,
      title: "Abonnement",
      body: message,
      link: "/dashboard/settings/billing",
    },
  });
}

function getPlanFromPriceId(priceId: string): "FREE_TRIAL" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE" {
  if (priceId === process.env.STRIPE_STARTER_PRICE_ID) return "STARTER";
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "PROFESSIONAL";
  if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) return "ENTERPRISE";
  return "STARTER";
}

function mapStripeStatus(status: string): "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "UNPAID" | "INCOMPLETE" | "PAUSED" {
  const map: Record<string, "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "UNPAID" | "INCOMPLETE" | "PAUSED"> = {
    trialing: "TRIALING",
    active: "ACTIVE",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    unpaid: "UNPAID",
    incomplete: "INCOMPLETE",
    paused: "PAUSED",
  };
  return map[status] ?? "ACTIVE";
}
