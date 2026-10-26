import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type Stripe from "stripe";
import { createNotificationOnce } from "@/lib/notifications/create-once";
import { notifyUser } from "@/lib/notifications/notify";
import { assertStripeConfiguration, getAcceptedPriceIds, getStripeMode } from "@/lib/stripe-config";
import { getBillingCopy, normalizeBillingLocale } from "@/lib/billing/copy";
import { hasFullSubscriptionAccess } from "@/lib/billing/subscription-policy";

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
  if (!signature) return NextResponse.json({ error: "Signature manquante" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (error) {
    console.error("[Stripe Webhook] Erreur signature:", error);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.trial_will_end":
        await handleTrialWillEnd(event.data.object as Stripe.Subscription, event.id);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Erreur traitement:", error);
    return NextResponse.json({ error: "Erreur traitement" }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const communityId = session.client_reference_id ?? metadataCommunityId(session.metadata);
  if (!communityId) return;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  if (!customerId) throw new Error("Checkout Stripe sans Customer.");
  const admin = createAdminClient();
  const result = await admin.from("Community").update({ stripeCustomerId: customerId, updatedAt: new Date().toISOString() }).eq("id", communityId);
  throwIfSupabaseError(result.error, "association Customer/communauté");
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const communityId = await communityIdForSubscription(subscription);
  if (!communityId) return;
  const priceId = subscription.items.data[0]?.price.id;
  if (!priceId) throw new Error("Abonnement Stripe sans Price.");
  const plan = getPlanFromPrice(priceId);
  const sub = subscription as unknown as { current_period_start: number; current_period_end: number; trial_start: number | null; trial_end: number | null; canceled_at: number | null };
  const admin = createAdminClient();

  const communityUpdate = await admin.from("Community").update({
    plan: hasFullAccess(subscription.status) ? plan : "FREE_TRIAL",
    stripeCustomerId: subscription.customer as string,
    updatedAt: new Date().toISOString(),
  }).eq("id", communityId);
  throwIfSupabaseError(communityUpdate.error, "mise à jour du plan");

  const subscriptionUpsert = await admin.from("Subscription").upsert({
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
  }, { onConflict: "stripeSubscriptionId" });
  throwIfSupabaseError(subscriptionUpsert.error, "enregistrement de l'abonnement");

  if (hasFullAccess(subscription.status)) {
    await notifySubscriptionChange(communityId, "SUBSCRIPTION_RENEWED", "subscriptionActive", `subscription:${subscription.id}:${subscription.status}`);
  }
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const communityId = await communityIdForSubscription(subscription);
  if (!communityId) return;
  const admin = createAdminClient();
  const communityUpdate = await admin.from("Community").update({ plan: "FREE_TRIAL", updatedAt: new Date().toISOString() }).eq("id", communityId);
  throwIfSupabaseError(communityUpdate.error, "révocation du plan");
  const subscriptionUpdate = await admin.from("Subscription").update({ status: "CANCELED", canceledAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).eq("stripeSubscriptionId", subscription.id);
  throwIfSupabaseError(subscriptionUpdate.error, "annulation de l'abonnement");
  await notifySubscriptionChange(communityId, "SUBSCRIPTION_EXPIRING", "subscriptionCanceled", `subscription-canceled:${subscription.id}`);
}

async function handleTrialWillEnd(subscription: Stripe.Subscription, eventId: string) {
  const communityId = await communityIdForSubscription(subscription);
  if (!communityId) return;
  const admin = createAdminClient();
  const recipient = await getCommunityRecipient(admin, communityId);
  if (!recipient) return;
  const locale = normalizeBillingLocale(recipient.locale);
  const copy = getBillingCopy(locale);
  const dedupeKey = `stripe-trial-will-end:${subscription.id}:${subscription.trial_end ?? eventId}`;
  const auditResult = await admin.from("AuditLog").insert({
    id: `stripe-event-${eventId}`,
    userId: recipient.id,
    communityId,
    action: "stripe.subscription.trial_will_end",
    resource: "Subscription",
    resourceId: subscription.id,
    newData: { stripeEventId: eventId, trialEnd: subscription.trial_end },
  });
  if (auditResult.error && auditResult.error.code !== "23505") {
    throwIfSupabaseError(auditResult.error, "journalisation de la fin d'essai");
  }

  const created = await createNotificationOnce(admin, {
    userId: recipient.id,
    communityId,
    type: "SUBSCRIPTION_EXPIRING",
    title: copy.trialEndingTitle,
    body: copy.trialEndingBody,
    link: "/dashboard/settings/billing",
    dedupeKey,
    data: { stripeEventId: eventId, stripeSubscriptionId: subscription.id, trialEnd: subscription.trial_end },
  });
  if (!created) return;

  if (process.env.NODE_ENV === "production" && getStripeMode() === "live") {
    const greeting = recipient.name ? copy.emailGreetingName.replace("{name}", recipient.name) : copy.emailGreeting;
    await notifyUser(admin, recipient.id, {
      title: copy.trialEndingTitle,
      body: copy.trialEndingBody,
      link: "/dashboard/settings/billing",
      email: { locale, direction: locale === "he" ? "rtl" : "ltr", ctaLabel: copy.emailCta, greeting, footer: copy.emailFooter },
    });
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  if (invoice.amount_paid <= 0) return;
  const communityId = await communityIdFromCustomer(invoice.customer);
  if (communityId) await notifySubscriptionChange(communityId, "SUBSCRIPTION_RENEWED", "paymentPaid", `invoice-paid:${invoice.id}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const communityId = await communityIdFromCustomer(invoice.customer);
  if (communityId) await notifySubscriptionChange(communityId, "PAYMENT_FAILED", "paymentFailed", `payment-failed:${invoice.id}`);
}

async function communityIdFromCustomer(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null) {
  const customerId = typeof customer === "string" ? customer : customer?.id;
  if (!customerId) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("Community").select("id").eq("stripeCustomerId", customerId).maybeSingle();
  return data?.id ?? null;
}

async function communityIdForSubscription(subscription: Stripe.Subscription) {
  return await communityIdFromCustomer(subscription.customer) ?? metadataCommunityId(subscription.metadata);
}

async function notifySubscriptionChange(communityId: string, type: "SUBSCRIPTION_RENEWED" | "SUBSCRIPTION_EXPIRING" | "PAYMENT_FAILED", messageKey: "subscriptionActive" | "subscriptionCanceled" | "paymentFailed" | "paymentPaid", dedupeKey: string) {
  const admin = createAdminClient();
  const recipient = await getCommunityRecipient(admin, communityId);
  if (!recipient) return;
  const copy = getBillingCopy(recipient.locale);
  await createNotificationOnce(admin, { userId: recipient.id, communityId, type, title: copy.notificationTitle, body: copy[messageKey], link: "/dashboard/settings/billing", dedupeKey });
}

async function getCommunityRecipient(admin: ReturnType<typeof createAdminClient>, communityId: string) {
  const { data } = await admin.from("profiles").select("id, name, locale").eq("communityId", communityId).order("createdAt", { ascending: true }).limit(1).maybeSingle();
  return data as { id: string; name: string | null; locale: string | null } | null;
}

function metadataCommunityId(metadata: Stripe.Metadata | null | undefined) {
  return metadata?.community_id ?? metadata?.communityId ?? null;
}

// One offer: every accepted price (current monthly/yearly, or a legacy one still billing)
// is the same subscription.
function getPlanFromPrice(priceId: string): "PROFESSIONAL" {
  if (getAcceptedPriceIds().includes(priceId)) return "PROFESSIONAL";
  throw new Error(`Price Stripe non autorisé: ${priceId}`);
}

function mapStripeStatus(status: string): "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "UNPAID" | "INCOMPLETE" | "PAUSED" {
  const map: Record<string, "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "UNPAID" | "INCOMPLETE" | "PAUSED"> = {
    trialing: "TRIALING", active: "ACTIVE", past_due: "PAST_DUE", canceled: "CANCELED", unpaid: "UNPAID", incomplete: "INCOMPLETE", incomplete_expired: "CANCELED", paused: "PAUSED",
  };
  const mapped = map[status];
  if (!mapped) throw new Error(`Statut Stripe non pris en charge: ${status}`);
  return mapped;
}

const hasFullAccess = hasFullSubscriptionAccess;

function throwIfSupabaseError(error: { message: string } | null, operation: string) {
  if (error) throw new Error(`Échec Supabase pendant ${operation}: ${error.message}`);
}
