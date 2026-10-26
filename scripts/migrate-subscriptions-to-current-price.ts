/**
 * Moves every live subscription still billed on a legacy price (19.99 €/month…) to the
 * current monthly price (12.99 €). No proration: the new amount applies from the next
 * invoice, and the Stripe webhook syncs the database. Subscribers only pay less.
 * Dry run by default; pass --apply to update.
 *
 *   npx tsx scripts/migrate-subscriptions-to-current-price.ts           # lists who would move
 *   npx tsx scripts/migrate-subscriptions-to-current-price.ts --apply   # moves them
 */
import { config } from "dotenv";
import Stripe from "stripe";

config({ path: ".env.local" });
config({ path: ".env" });

const apply = process.argv.includes("--apply");
const key = process.env.STRIPE_SECRET_KEY;
const target = process.env.STRIPE_PRICE_MONTHLY;
if (!key?.startsWith("sk_")) throw new Error("STRIPE_SECRET_KEY manquant ou invalide.");
if (!target?.startsWith("price_")) throw new Error("STRIPE_PRICE_MONTHLY manquant : lancez d'abord scripts/stripe-create-prices.ts.");
const legacy = ["STRIPE_PRICE_MONTHLY_1999", "STRIPE_PRO_PRICE_ID", "STRIPE_STARTER_PRICE_ID", "STRIPE_ENTERPRISE_PRICE_ID"]
  .map((name) => process.env[name])
  .filter((value): value is string => Boolean(value) && value !== target);
if (!legacy.length) throw new Error("Aucun ancien prix configuré (STRIPE_PRICE_MONTHLY_1999…).");

const stripe = new Stripe(key);
const MOVABLE = new Set<Stripe.Subscription.Status>(["active", "trialing", "past_due"]);

async function main() {
  console.log(`Stripe ${key!.startsWith("sk_live_") ? "LIVE" : "TEST"} — ${apply ? "migration" : "simulation (ajoutez --apply pour migrer)"}`);
  const targetPrice = await stripe.prices.retrieve(target!);
  if (targetPrice.unit_amount !== 1299 || targetPrice.recurring?.interval !== "month") {
    throw new Error(`${target} n'est pas le prix mensuel à 12,99 €.`);
  }

  let moved = 0;
  for (const priceId of legacy) {
    for await (const subscription of stripe.subscriptions.list({ price: priceId, status: "all", limit: 100 })) {
      if (!MOVABLE.has(subscription.status)) continue;
      const item = subscription.items.data.find((entry) => entry.price.id === priceId);
      if (!item) continue;
      const customer = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
      console.log(`${apply ? "→" : "·"} ${subscription.id} (client ${customer}, ${subscription.status}) : ${priceId} → ${target}`);
      if (apply) {
        await stripe.subscriptions.update(subscription.id, {
          items: [{ id: item.id, price: target! }],
          proration_behavior: "none",
          metadata: { ...subscription.metadata, plan_tier: "PROFESSIONAL", billing_interval: "month", migrated_from_price: priceId },
        });
      }
      moved++;
    }
  }
  console.log(`\n${moved} abonnement(s) ${apply ? "migré(s)" : "à migrer"}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
