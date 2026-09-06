import Stripe from "stripe";
import { assertStripeConfiguration, getConfiguredLaunchPriceId, getConfiguredPriceId, getStripeMode } from "@/lib/stripe-config";

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
    name: "EasyCom IA",
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
  useIntroductoryPrice: boolean;
  stripeCustomerId?: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const {
    communityId,
    useIntroductoryPrice,
    stripeCustomerId,
    customerEmail,
    successUrl,
    cancelUrl,
  } = params;

  assertStripeConfiguration({ checkout: true });
  const basePriceId = getConfiguredPriceId();
  const launchPriceId = getConfiguredLaunchPriceId();
  await validateSubscriptionCatalog(launchPriceId, basePriceId);
  const priceId = useIntroductoryPrice ? launchPriceId : basePriceId;

  const checkoutParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    ...(stripeCustomerId
      ? { customer: stripeCustomerId }
      : customerEmail
        ? { customer_email: customerEmail }
        : {}),
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: communityId,
    metadata: { communityId, planTier: "PROFESSIONAL", introductoryPrice: String(useIntroductoryPrice) },
    subscription_data: {
      metadata: { communityId, planTier: "PROFESSIONAL", introductoryPrice: String(useIntroductoryPrice) },
    },
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
    metadata: {
      communityId,
      articleId,
      articleSlug,
      checkoutType: "article",
    },
    allow_promotion_codes: true,
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

export async function createPortalSession(params: {
  stripeCustomerId: string;
  returnUrl: string;
}) {
  assertStripeConfiguration({ portal: true });
  return stripe.billingPortal.sessions.create({
    customer: params.stripeCustomerId,
    return_url: params.returnUrl,
    configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID,
  });
}

async function validateSubscriptionCatalog(launchPriceId: string, basePriceId: string) {
  const [launchPrice, basePrice] = await Promise.all([
    stripe.prices.retrieve(launchPriceId),
    stripe.prices.retrieve(basePriceId),
  ]);

  assertStripeObjectMode(launchPrice.livemode, "Price de lancement");
  assertStripeObjectMode(basePrice.livemode, "Price standard");
  assertMonthlyEuroPrice(launchPrice, 999, "lancement");
  assertMonthlyEuroPrice(basePrice, 1999, "standard");
  if (launchPrice.product !== basePrice.product) {
    throw new Error("Les Prices Stripe de lancement et standard doivent appartenir au même Product.");
  }
}

function assertMonthlyEuroPrice(price: Stripe.Price, expectedAmount: number, label: string) {
  if (!price.active || price.type !== "recurring" || price.currency !== "eur" || price.unit_amount !== expectedAmount || price.recurring?.interval !== "month" || price.recurring.interval_count !== 1) {
    throw new Error(`Le Price Stripe ${label} ne correspond pas à l'offre EasyCom attendue.`);
  }
}

export async function switchIntroductorySubscriptionToBasePrice(subscriptionId: string) {
  assertStripeConfiguration({ checkout: true });
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const item = subscription.items.data[0];
  if (!item) throw new Error("Abonnement Stripe sans ligne tarifaire.");

  const launchPriceId = getConfiguredLaunchPriceId();
  const basePriceId = getConfiguredPriceId();
  if (item.price.id === basePriceId) return subscription;
  if (item.price.id !== launchPriceId) {
    throw new Error("L'abonnement ne porte ni le Price de lancement ni le Price standard configuré.");
  }

  return stripe.subscriptions.update(subscriptionId, {
    items: [{ id: item.id, price: basePriceId }],
    proration_behavior: "none",
    metadata: { ...subscription.metadata, introductoryPriceApplied: "true" },
  }, { idempotencyKey: `easycom-intro-to-base-${subscriptionId}` });
}

function assertStripeObjectMode(livemode: boolean, label: string) {
  const expectedLiveMode = getStripeMode() === "live";
  if (livemode !== expectedLiveMode) {
    throw new Error(`${label}: objet Stripe provenant du mauvais environnement.`);
  }
}
