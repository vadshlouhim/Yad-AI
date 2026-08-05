import Stripe from "stripe";

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY manquant");
    _stripe = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
  }
  return _stripe;
}

// Proxy conserve la compatibilité avec tous les imports existants (stripe.xxx)
// tout en initialisant Stripe uniquement à la première requête, jamais au build.
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    return Reflect.get(getStripe(), prop, receiver);
  },
});

export const PLANS = {
  FREE_TRIAL: {
    name: "Gratuit",
    priceId: null,
    price: 0,
    limits: {
      socialPublications: 1,
      assistantMessages: 20,
      automations: 1,
      posterGenerations: 1,
      whatsapp: false,
    },
  },
  PROFESSIONAL: {
    name: "Payant",
    priceId: process.env.STRIPE_PAID_PRICE_ID ?? process.env.STRIPE_PRO_PRICE_ID,
    price: 19.99,
    limits: {
      socialPublications: -1,
      assistantMessages: -1,
      automations: -1,
      posterGenerations: -1,
      whatsapp: true,
    },
  },
} as const;

export async function createCheckoutSession(params: {
  communityId: string;
  tier: "PROFESSIONAL" | "ENTERPRISE";
  unitAmount: number;
  planName: string;
  stripeCustomerId?: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const {
    communityId,
    tier,
    unitAmount,
    planName,
    stripeCustomerId,
    customerEmail,
    successUrl,
    cancelUrl,
  } = params;

  const checkoutParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    ...(stripeCustomerId
      ? { customer: stripeCustomerId }
      : customerEmail
        ? { customer_email: customerEmail }
        : {}),
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: unitAmount,
          recurring: { interval: "month" },
          product_data: { name: planName },
          tax_behavior: "exclusive",
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: communityId,
    metadata: { communityId, planTier: tier },
    subscription_data: {
      metadata: { communityId, planTier: tier },
    },
    allow_promotion_codes: true,
    billing_address_collection: "required",
  };

  try {
    return await stripe.checkout.sessions.create(checkoutParams);
  } catch (error) {
    // Un ancien Customer Stripe (supprimé ou provenant d'un autre mode
    // test/live) ne doit pas empêcher la communauté de se réabonner.
    if (stripeCustomerId && isMissingStripeCustomer(error)) {
      delete checkoutParams.customer;
      if (customerEmail) checkoutParams.customer_email = customerEmail;
      return stripe.checkout.sessions.create(checkoutParams);
    }
    throw error;
  }
}

function isMissingStripeCustomer(error: unknown) {
  if (!(error instanceof Stripe.errors.StripeError)) return false;
  return error.code === "resource_missing" && error.param === "customer";
}

export async function createArticleCheckoutSession(params: {
  communityId: string;
  priceId: string;
  stripeCustomerId?: string;
  successUrl: string;
  cancelUrl: string;
  articleId: string;
  articleSlug: string;
}) {
  const { communityId, priceId, stripeCustomerId, successUrl, cancelUrl, articleId, articleSlug } = params;

  return stripe.checkout.sessions.create({
    mode: "payment",
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      communityId,
      articleId,
      articleSlug,
      checkoutType: "article",
    },
    allow_promotion_codes: true,
    billing_address_collection: "required",
  });
}

export async function createPortalSession(params: {
  stripeCustomerId: string;
  returnUrl: string;
}) {
  return stripe.billingPortal.sessions.create({
    customer: params.stripeCustomerId,
    return_url: params.returnUrl,
  });
}
