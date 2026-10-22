import Stripe from "stripe";
import { assertStripeConfiguration, getConfiguredPriceId, getStripeMode } from "@/lib/stripe-config";
import { SUBSCRIPTION_TRIAL_DAYS } from "@/lib/billing/subscription-policy";

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    assertStripeConfiguration();
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY manquant");
    _stripe = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
  }
  return _stripe;
}

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
    limits: { socialPublications: 1, assistantMessages: 20, automations: 1, posterGenerations: 1, whatsapp: false },
  },
  PROFESSIONAL: {
    name: "EasyCom IA",
    priceId: process.env.STRIPE_PRICE_MONTHLY_1999,
    price: 19.99,
    limits: { socialPublications: -1, assistantMessages: -1, automations: -1, posterGenerations: -1, whatsapp: true },
  },
} as const;

export async function createCheckoutSession(params: {
  communityId: string;
  userId: string;
  locale: "fr" | "he" | "en";
  includeTrial: boolean;
  stripeCustomerId?: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const { communityId, userId, locale, includeTrial, stripeCustomerId, customerEmail, successUrl, cancelUrl } = params;
  assertStripeConfiguration({ checkout: true });
  const priceId = getConfiguredPriceId();
  await validateSubscriptionCatalog(priceId);
  const metadata = {
    community_id: communityId,
    user_id: userId,
    plan_tier: "PROFESSIONAL",
    trial_included: String(includeTrial),
  };

  const checkoutParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    ...(stripeCustomerId
      ? { customer: stripeCustomerId }
      : customerEmail
        ? { customer_email: customerEmail }
        : {}),
    line_items: [{ price: priceId, quantity: 1 }],
    payment_method_collection: "always",
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: communityId,
    locale: locale === "he" ? "auto" : locale,
    metadata,
    subscription_data: {
      ...(includeTrial
        ? {
            trial_period_days: SUBSCRIPTION_TRIAL_DAYS,
            trial_settings: { end_behavior: { missing_payment_method: "cancel" as const } },
          }
        : {}),
      metadata,
    },
    billing_address_collection: "required",
    integration_identifier: createIntegrationIdentifier(),
  };

  try {
    return await stripe.checkout.sessions.create(checkoutParams);
  } catch (error) {
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
  expectedAmount: number;
  expectedCurrency: string;
}) {
  const { communityId, priceId, stripeCustomerId, successUrl, cancelUrl, articleId, articleSlug, expectedAmount, expectedCurrency } = params;
  assertStripeConfiguration();
  const price = await stripe.prices.retrieve(priceId);
  assertStripeObjectMode(price.livemode, "Price article");
  if (!price.active || price.type !== "one_time" || price.unit_amount !== expectedAmount || price.currency !== expectedCurrency.toLowerCase()) {
    throw new Error("Le Price Stripe de cet article ne correspond pas à son prix en base.");
  }

  const checkoutParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    ...(stripeCustomerId ? { customer: stripeCustomerId } : {}),
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { communityId, articleId, articleSlug, checkoutType: "article" },
    billing_address_collection: "required",
  };

  try {
    return await stripe.checkout.sessions.create(checkoutParams);
  } catch (error) {
    if (stripeCustomerId && isMissingStripeCustomer(error)) {
      delete checkoutParams.customer;
      return stripe.checkout.sessions.create(checkoutParams);
    }
    throw error;
  }
}

export async function createPortalSession(params: { stripeCustomerId: string; returnUrl: string }) {
  assertStripeConfiguration({ portal: true });
  return stripe.billingPortal.sessions.create({
    customer: params.stripeCustomerId,
    return_url: params.returnUrl,
    configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID,
  });
}

async function validateSubscriptionCatalog(priceId: string) {
  const price = await stripe.prices.retrieve(priceId);
  assertStripeObjectMode(price.livemode, "Price mensuel");
  assertMonthlyEuroPrice(price, 1999, "mensuel");
}

function assertMonthlyEuroPrice(price: Stripe.Price, expectedAmount: number, label: string) {
  if (!price.active || price.type !== "recurring" || price.currency !== "eur" || price.unit_amount !== expectedAmount || price.recurring?.interval !== "month" || price.recurring.interval_count !== 1) {
    throw new Error(`Le Price Stripe ${label} ne correspond pas à l'offre EasyCom attendue.`);
  }
}

function createIntegrationIdentifier() {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const suffix = Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
  return `easycom_trial_${suffix}`;
}

function assertStripeObjectMode(livemode: boolean, label: string) {
  const expectedLiveMode = getStripeMode() === "live";
  if (livemode !== expectedLiveMode) throw new Error(`${label}: objet Stripe provenant du mauvais environnement.`);
}
