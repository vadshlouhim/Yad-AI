import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MarketplaceReportsClient } from "@/components/admin/marketplace-reports-client";
import { canAccessAdmin } from "@/lib/admin-access";
import { requireAuth } from "@/lib/auth";

export const metadata: Metadata = { title: "Modération boutique — EasyCom IA" };

export default async function MarketplaceModerationPage() {
  const { profile } = await requireAuth();
  if (!canAccessAdmin(profile)) redirect("/dashboard");
  return <MarketplaceReportsClient />;
}
