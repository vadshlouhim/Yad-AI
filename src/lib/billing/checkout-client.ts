export interface SubscriptionCheckoutRequest {
  tier: "PROFESSIONAL" | "ENTERPRISE";
  applyLaunchOffer?: boolean;
  successUrl: string;
  cancelUrl: string;
}

interface BillingApiResponse {
  url?: string;
  error?: string;
  code?: string;
  redirectUrl?: string;
}

export async function createSubscriptionCheckout(request: SubscriptionCheckoutRequest) {
  const response = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const data = await readBillingResponse(response);

  if (!response.ok) {
    if (data.redirectUrl && (data.code === "AUTH_REQUIRED" || data.code === "ONBOARDING_REQUIRED")) {
      window.location.assign(data.redirectUrl);
      return null;
    }
    throw new Error(data.error ?? "Impossible de préparer le paiement.");
  }

  if (!data.url) throw new Error("Stripe n'a pas renvoyé de page de paiement.");
  return data.url;
}

export async function createBillingPortal(returnUrl: string) {
  const response = await fetch("/api/billing/portal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ returnUrl }),
  });
  const data = await readBillingResponse(response);

  if (!response.ok) throw new Error(data.error ?? "Impossible d'ouvrir le portail de facturation.");
  if (!data.url) throw new Error("Stripe n'a pas renvoyé de portail de facturation.");
  return data.url;
}

async function readBillingResponse(response: Response): Promise<BillingApiResponse> {
  return response.json().catch(() => ({} as BillingApiResponse));
}
