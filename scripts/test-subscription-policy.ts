import assert from "node:assert/strict";
import { hasFullSubscriptionAccess, isTrialEligible, SUBSCRIPTION_TRIAL_DAYS } from "../src/lib/billing/subscription-policy";

assert.equal(SUBSCRIPTION_TRIAL_DAYS, 30);
assert.equal(isTrialEligible(0), true);
assert.equal(isTrialEligible(1), false);
assert.equal(isTrialEligible(12), false);
assert.equal(hasFullSubscriptionAccess("trialing"), true);
assert.equal(hasFullSubscriptionAccess("ACTIVE"), true);
for (const status of ["past_due", "unpaid", "canceled", "incomplete_expired", "paused"]) {
  assert.equal(hasFullSubscriptionAccess(status), false, `${status} must not grant full access`);
}

console.log("Subscription policy checks passed.");
