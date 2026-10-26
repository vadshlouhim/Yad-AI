/**
 * Creates the two EasyCom IA prices (12.99 €/month, 99 €/year) on one Product in the
 * Stripe account of STRIPE_SECRET_KEY, then prints the env lines to set.
 * Dry run by default; pass --apply to create. Re-running reuses matching prices.
 *
 *   npx tsx scripts/stripe-create-prices.ts            # shows what it would do
 *   npx tsx scripts/stripe-create-prices.ts --apply    # creates the prices
 */
import { config } from "dotenv";
import Stripe from "stripe";
import { SUBSCRIPTION_MONTHLY_CENTS, SUBSCRIPTION_YEARLY_CENTS, type BillingInterval } from "../src/lib/billing/subscription-policy";

config({ path: ".env.local" });
config({ path: ".env" });

const apply = process.argv.includes("--apply");
const key = process.env.STRIPE_SECRET_KEY;
if (!key?.startsWith("sk_")) throw new Error("STRIPE_SECRET_KEY manquant ou invalide.");
const stripe = new Stripe(key);
const mode = key.startsWith("sk_live_") ? "LIVE" : "TEST";
const PRODUCT_LOOKUP = "easycom_ia_subscription";

const wanted: Array<{ interval: BillingInterval; amount: number; env: string; lookupKey: string }> = [
  { interval: "month", amount: SUBSCRIPTION_MONTHLY_CENTS, env: "STRIPE_PRICE_MONTHLY", lookupKey: "easycom_ia_monthly_1299" },
  { interval: "year", amount: SUBSCRIPTION_YEARLY_CENTS, env: "STRIPE_PRICE_YEARLY", lookupKey: "easycom_ia_yearly_9900" },
];

async function main() {
  console.log(`Stripe ${mode} — ${apply ? "création" : "simulation (ajoutez --apply pour créer)"}`);
  const existing = await stripe.prices.list({ lookup_keys: wanted.map((item) => item.lookupKey), active: true, limit: 10 });
  let productId = existing.data[0] && typeof existing.data[0].product === "string" ? existing.data[0].product : null;

  const lines: string[] = [];
  for (const item of wanted) {
    const found = existing.data.find((price) => price.lookup_key === item.lookupKey);
    if (found) {
      console.log(`✓ Prix ${item.interval} déjà présent : ${found.id}`);
      lines.push(`${item.env}=${found.id}`);
      continue;
    }
    if (!apply) {
      console.log(`→ Créerait un prix ${item.amount / 100} €/${item.interval === "year" ? "an" : "mois"} (${item.lookupKey})`);
      continue;
    }
    if (!productId) {
      const product = await stripe.products.create({ name: "EasyCom IA", metadata: { lookup: PRODUCT_LOOKUP } });
      productId = product.id;
      console.log(`+ Produit créé : ${productId}`);
    }
    const price = await stripe.prices.create({
      product: productId,
      currency: "eur",
      unit_amount: item.amount,
      recurring: { interval: item.interval, interval_count: 1 },
      tax_behavior: "inclusive",
      lookup_key: item.lookupKey,
    });
    console.log(`+ Prix ${item.interval} créé : ${price.id}`);
    lines.push(`${item.env}=${price.id}`);
  }

  if (lines.length) console.log(`\nÀ renseigner (${mode === "LIVE" ? "Netlify" : ".env.local"}) :\n${lines.join("\n")}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
