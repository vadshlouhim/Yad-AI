import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { BillingClient } from "@/components/settings/billing-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Facturation — Yad.ia" };

export default async function BillingPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const admin = createAdminClient();

  const [{ data: community }, { data: subscription }] = await Promise.all([
    admin.from("Community").select("plan, stripeCustomerId, planExpiresAt").eq("id", communityId).single(),
    admin
      .from("Subscription")
      .select("*")
      .eq("communityId", communityId)
      .in("status", ["ACTIVE", "TRIALING", "PAST_DUE"])
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <BillingClient
      community={community!}
      subscription={subscription as Parameters<typeof BillingClient>[0]["subscription"]}
    />
  );
}
