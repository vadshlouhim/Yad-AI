import type { Metadata } from "next";
import { WhatsAppClient } from "@/components/whatsapp/whatsapp-client";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBillingConfig, getBillingGate } from "@/lib/billing";

export const metadata: Metadata = { title: "WhatsApp - EasyCom IA" };

export default async function WhatsAppPage() {
  const { profile } = await requireAuth();
  const admin = createAdminClient();
  const [billingConfig, gate] = await Promise.all([
    getBillingConfig(admin),
    getBillingGate(admin, profile.id),
  ]);

  return (
    <div className="container max-w-6xl mx-auto py-6 px-4 sm:px-6">
      <WhatsAppClient billingConfig={billingConfig} isPaid={gate.isPaid} />
    </div>
  );
}
