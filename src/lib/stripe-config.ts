export type StripeMode = "test" | "live";

interface StripeConfigurationRequirements {
  checkout?: boolean;
  portal?: boolean;
  webhook?: boolean;
}

export function getStripeMode(): StripeMode {
  const secretKey = requiredEnv("STRIPE_SECRET_KEY");
  const mode = secretKey.startsWith("sk_live_")
    ? "live"
    : secretKey.startsWith("sk_test_")
      ? "test"
      : null;

  if (!mode) throw new Error("STRIPE_SECRET_KEY doit être une clé Stripe sk_test_ ou sk_live_.");
  return mode;
}

export function assertStripeConfiguration(requirements: StripeConfigurationRequirements = {}) {
  const mode = getStripeMode();
  const production = process.env.NODE_ENV === "production";

  if (production && mode !== "live") {
    throw new Error("Stripe TEST est interdit lorsque NODE_ENV=production.");
  }
  if (!production && mode !== "test") {
    throw new Error("Stripe LIVE est interdit hors production.");
  }

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (production && !publishableKey) {
    throw new Error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY manquant en production.");
  }
  if (publishableKey) {
    const expectedPrefix = mode === "live" ? "pk_live_" : "pk_test_";
    if (!publishableKey.startsWith(expectedPrefix)) {
      throw new Error("Les clés Stripe secrète et publique ne ciblent pas le même mode.");
    }
  }

  if (requirements.checkout) {
    for (const [name, priceId] of [
      ["STRIPE_LAUNCH_PRICE_ID", requiredEnv("STRIPE_LAUNCH_PRICE_ID")],
      ["STRIPE_PAID_PRICE_ID", requiredEnv("STRIPE_PAID_PRICE_ID", "STRIPE_PRO_PRICE_ID")],
    ]) {
      if (!priceId.startsWith("price_")) {
        throw new Error(`${name} doit contenir un Price ID Stripe.`);
      }
    }
  }

  if (requirements.webhook && !requiredEnv("STRIPE_WEBHOOK_SECRET").startsWith("whsec_")) {
    throw new Error("STRIPE_WEBHOOK_SECRET doit contenir un signing secret Stripe.");
  }

  if (requirements.portal && !requiredEnv("STRIPE_PORTAL_CONFIGURATION_ID").startsWith("bpc_")) {
    throw new Error("STRIPE_PORTAL_CONFIGURATION_ID doit contenir un ID de configuration Customer Portal.");
  }

  if (production) getCanonicalAppOrigin();
  return mode;
}

export function getConfiguredPriceId() {
  return requiredEnv("STRIPE_PAID_PRICE_ID", "STRIPE_PRO_PRICE_ID");
}

export function getConfiguredLaunchPriceId() {
  return requiredEnv("STRIPE_LAUNCH_PRICE_ID");
}

export function getCanonicalAppOrigin(requestUrl?: string) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  const candidate = process.env.NODE_ENV === "production" ? configuredUrl : configuredUrl ?? requestUrl;

  if (!candidate) throw new Error("NEXT_PUBLIC_APP_URL manquant");

  const url = new URL(candidate);
  const localHostname = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
  if (process.env.NODE_ENV === "production" && (url.protocol !== "https:" || localHostname)) {
    throw new Error("NEXT_PUBLIC_APP_URL doit être une URL HTTPS publique en production.");
  }

  return url.origin;
}

export function safeAppReturnUrl(value: unknown, origin: string, fallbackPath: string) {
  const fallback = new URL(fallbackPath, origin).toString();
  try {
    const url = new URL(typeof value === "string" ? value : fallback, origin);
    return url.origin === origin ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

function requiredEnv(name: string, fallbackName?: string) {
  const value = process.env[name] ?? (fallbackName ? process.env[fallbackName] : undefined);
  if (!value) throw new Error(`${name} manquant`);
  return value;
}
