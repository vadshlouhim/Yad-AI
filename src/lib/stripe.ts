import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

export const PLANS = {
  FREE_TRIAL: {
    name: "Essai gratuit",
    priceId: null,
    price: 0,
    limits: {
      publicationsPerMonth: 30,
      aiGenerationsPerMonth: 50,
      channels: 2,
      templates: 10,
    },
  },
  STARTER: {
    name: "Starter",
    priceId: process.env.STRIPE_STARTER_PRICE_ID,
    price: 29,
    limits: {
      publicationsPerMonth: 150,
      aiGenerationsPerMonth: 300,
      channels: 5,
      templates: 50,
    },
  },
  PROFESSIONAL: {
    name: "Professionnel",
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    price: 79,
    limits: {
      publicationsPerMonth: -1, // Illimité
      aiGenerationsPerMonth: -1,
      channels: -1,
      templates: -1,
    },
  },
  ENTERPRISE: {
    name: "Enterprise",
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    price: 199,
    limits: {
      publicationsPerMonth: -1,
      aiGenerationsPerMonth: -1,
      channels: -1,
      templates: -1,
    },
  },
} as const;

export async function createCheckoutSession(params: {
  communityId: string;
  priceId: string;
  stripeCustomerId?: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const { communityId, priceId, stripeCustomerId, successUrl, cancelUrl } = params;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { communityId },
    subscription_data: {
      trial_period_days: 14,
      metadata: { communityId },
    },
    allow_promotion_codes: true,
    billing_address_collection: "required",
  });

  return session;
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
