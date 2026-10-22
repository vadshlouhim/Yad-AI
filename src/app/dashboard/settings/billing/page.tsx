import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { BillingClient } from "@/components/settings/billing-client";
import { getBillingConfig } from "@/lib/billing";
import { stripe } from "@/lib/stripe";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

type InvoiceSummary = {
  id: string;
  number: string | null;
  amountPaid: number;
  currency: string;
  status: string | null;
  createdAt: string;
  invoicePdf: string | null;
  hostedInvoiceUrl: string | null;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("billing");
  return { title: t("metadataTitle") };
}

export default async function BillingPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const admin = createAdminClient();

  const [{ data: community }, { data: subscription }, { count: subscriptionHistoryCount }, billingConfig] = await Promise.all([
    admin.from("Community").select("plan, stripeCustomerId, planExpiresAt").eq("id", communityId).single(),
    admin
      .from("Subscription")
      .select("id, plan, status, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, trialEnd, createdAt")
      .eq("communityId", communityId)
      .in("status", ["ACTIVE", "TRIALING", "PAST_DUE", "UNPAID", "INCOMPLETE", "CANCELED", "PAUSED"])
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin.from("Subscription").select("id", { count: "exact", head: true }).eq("communityId", communityId),
    getBillingConfig(admin),
  ]);

  let invoices: InvoiceSummary[] = [];
  if (community?.stripeCustomerId) {
    try {
      const result = await stripe.invoices.list({ customer: community.stripeCustomerId, limit: 12 });
      invoices = result.data.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        amountPaid: invoice.amount_paid,
        currency: invoice.currency,
        status: invoice.status,
        createdAt: new Date(invoice.created * 1000).toISOString(),
        invoicePdf: invoice.invoice_pdf ?? null,
        hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
      }));
    } catch (error) {
      console.error("[Billing] Impossible de charger les factures Stripe:", error);
    }
  }

  return (
    <BillingClient
      community={community!}
      subscription={subscription as Parameters<typeof BillingClient>[0]["subscription"]}
      billingConfig={billingConfig}
      invoices={invoices}
      hasUsedTrial={(subscriptionHistoryCount ?? 0) > 0}
      now={new Date().toISOString()}
    />
  );
}
