export const SUBSCRIPTION_TRIAL_DAYS = 30;

export function isTrialEligible(subscriptionHistoryCount: number) {
  return subscriptionHistoryCount === 0;
}

export function hasFullSubscriptionAccess(status: string) {
  const normalized = status.toLowerCase();
  return normalized === "trialing" || normalized === "active";
}
