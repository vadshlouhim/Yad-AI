import assert from "node:assert/strict";
import {
  getCommunityAccess,
  hasCommunityAccess,
  hasFullSubscriptionAccess,
  isSubscribedPlan,
  isTrialEligible,
  subscriptionPriceCents,
  SUBSCRIPTION_MONTHLY_CENTS,
  SUBSCRIPTION_TRIAL_DAYS,
  SUBSCRIPTION_YEARLY_CENTS,
  trialDaysLeft,
  trialEndsAt,
} from "../src/lib/billing/subscription-policy";

// One offer: 7-day trial without card, then 12.99 €/month or 99 €/year.
assert.equal(SUBSCRIPTION_TRIAL_DAYS, 7);
assert.equal(SUBSCRIPTION_MONTHLY_CENTS, 1299);
assert.equal(SUBSCRIPTION_YEARLY_CENTS, 9900);
assert.equal(subscriptionPriceCents("month"), 1299);
assert.equal(subscriptionPriceCents("year"), 9900);

const createdAt = "2026-10-01T10:00:00.000Z";
const day = 86_400_000;
const at = (offsetDays: number) => new Date(new Date(createdAt).getTime() + offsetDays * day);
assert.equal(trialEndsAt(createdAt).toISOString(), "2026-10-08T10:00:00.000Z");
assert.equal(trialDaysLeft(createdAt, at(0)), 7);
assert.equal(trialDaysLeft(createdAt, at(6.5)), 1);
assert.equal(trialDaysLeft(createdAt, at(8)), 0);
// The count drops at midnight (Paris), not 24 hours after sign-up.
assert.equal(trialDaysLeft("2026-10-28T14:00:00.000Z", new Date("2026-10-29T08:00:00.000Z")), 6, "the day after sign-up shows 6");
assert.equal(trialDaysLeft("2026-10-28T14:00:00.000Z", new Date("2026-10-28T23:30:00.000Z")), 6, "after midnight in Paris it already shows 6");
assert.equal(trialDaysLeft("2026-10-28T14:00:00.000Z", new Date("2026-10-28T22:30:00.000Z")), 7, "still 7 until midnight in Paris");
assert.equal(trialDaysLeft("2026-10-28T14:00:00.000Z", new Date("2026-11-04T09:00:00.000Z")), 1, "the last morning shows 1, not 0");
assert.deepEqual(Array.from({ length: 7 }, (_, i) => trialDaysLeft("2026-10-28T14:00:00.000Z", new Date(Date.parse("2026-10-28T15:00:00.000Z") + i * day))), [7, 6, 5, 4, 3, 2, 1]);

// Trial while the community is younger than 7 days, read-only after, whatever the plan value says.
assert.equal(getCommunityAccess({ plan: "FREE_TRIAL", createdAt }, at(1)), "trial");
assert.equal(getCommunityAccess({ plan: "FREE_TRIAL", createdAt }, at(6.99)), "trial");
assert.equal(getCommunityAccess({ plan: "FREE_TRIAL", createdAt }, at(7)), "readonly");
assert.equal(getCommunityAccess({ plan: "FREE_TRIAL", createdAt: null }, at(1)), "readonly");
assert.equal(getCommunityAccess(null), "readonly");
assert.equal(hasCommunityAccess({ plan: "FREE_TRIAL", createdAt }, at(30)), false);

// Every paid plan value, legacy ones included, is the same subscription.
for (const plan of ["PROFESSIONAL", "STARTER", "ENTERPRISE"]) {
  assert.equal(isSubscribedPlan(plan), true, `${plan} must count as subscribed`);
  assert.equal(getCommunityAccess({ plan, createdAt }, at(400)), "subscribed");
}
assert.equal(isSubscribedPlan("FREE_TRIAL"), false);
assert.equal(isSubscribedPlan(null), false);

assert.equal(isTrialEligible(0), true);
assert.equal(isTrialEligible(1), false);
assert.equal(isTrialEligible(12), false);
assert.equal(hasFullSubscriptionAccess("trialing"), true);
assert.equal(hasFullSubscriptionAccess("ACTIVE"), true);
for (const status of ["past_due", "unpaid", "canceled", "incomplete_expired", "paused"]) {
  assert.equal(hasFullSubscriptionAccess(status), false, `${status} must not grant full access`);
}

console.log("Subscription policy checks passed.");
