/**
 * Single source of truth for the EasyCom IA offer: one subscription, billed monthly
 * or yearly, after a free trial that needs no card. Everything else (pricing page,
 * checkout, paywalls, admin) reads from here.
 */
export const SUBSCRIPTION_TRIAL_DAYS = 7;
export const SUBSCRIPTION_MONTHLY_CENTS = 1299;
export const SUBSCRIPTION_YEARLY_CENTS = 9900;
export const SUBSCRIPTION_CURRENCY = "EUR";

export type BillingInterval = "month" | "year";

export function subscriptionPriceCents(interval: BillingInterval) {
  return interval === "year" ? SUBSCRIPTION_YEARLY_CENTS : SUBSCRIPTION_MONTHLY_CENTS;
}

const DAY_MS = 86_400_000;

/** The trial starts when the community is created; no card is asked for until it ends. */
export function trialEndsAt(communityCreatedAt: string | Date) {
  return new Date(new Date(communityCreatedAt).getTime() + SUBSCRIPTION_TRIAL_DAYS * DAY_MS);
}

export function trialDaysLeft(communityCreatedAt: string | Date, now = new Date()) {
  return Math.max(0, Math.ceil((trialEndsAt(communityCreatedAt).getTime() - now.getTime()) / DAY_MS));
}

/** Any plan other than FREE_TRIAL means a live (or manually granted) subscription. */
export function isSubscribedPlan(plan: string | null | undefined) {
  return Boolean(plan && plan !== "FREE_TRIAL");
}

export type CommunityAccess = "subscribed" | "trial" | "readonly";

/** Subscribers and communities still in their trial use everything; the others can only read. */
export function getCommunityAccess(
  community: { plan?: string | null; createdAt?: string | Date | null } | null | undefined,
  now = new Date()
): CommunityAccess {
  if (isSubscribedPlan(community?.plan)) return "subscribed";
  if (community?.createdAt && trialEndsAt(community.createdAt) > now) return "trial";
  return "readonly";
}

export function hasCommunityAccess(
  community: { plan?: string | null; createdAt?: string | Date | null } | null | undefined,
  now = new Date()
) {
  return getCommunityAccess(community, now) !== "readonly";
}

export function isTrialEligible(subscriptionHistoryCount: number) {
  return subscriptionHistoryCount === 0;
}

export function hasFullSubscriptionAccess(status: string) {
  const normalized = status.toLowerCase();
  return normalized === "trialing" || normalized === "active";
}
