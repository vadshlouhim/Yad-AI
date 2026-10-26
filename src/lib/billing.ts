import { NextResponse } from "next/server";
import type { createAdminClient } from "@/lib/supabase/admin";
import { canAccessAdmin } from "@/lib/admin-access";
import {
  SUBSCRIPTION_CURRENCY,
  SUBSCRIPTION_MONTHLY_CENTS,
  SUBSCRIPTION_TRIAL_DAYS,
  SUBSCRIPTION_YEARLY_CENTS,
  getCommunityAccess,
  trialEndsAt,
  type CommunityAccess,
} from "@/lib/billing/subscription-policy";

type Admin = ReturnType<typeof createAdminClient>;
type UserRole = "SUPER_ADMIN" | "ADMIN" | "EDITOR" | "VIEWER";

export interface BillingConfig {
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  trialDays: number;
  currency: "EUR";
  taxLabel: "TTC";
}

export const DEFAULT_BILLING_CONFIG: BillingConfig = {
  monthlyPriceCents: SUBSCRIPTION_MONTHLY_CENTS,
  yearlyPriceCents: SUBSCRIPTION_YEARLY_CENTS,
  trialDays: SUBSCRIPTION_TRIAL_DAYS,
  currency: SUBSCRIPTION_CURRENCY,
  taxLabel: "TTC",
};

export async function getBillingConfig(admin?: Admin): Promise<BillingConfig> {
  void admin;
  return DEFAULT_BILLING_CONFIG;
}

export function formatEuroCents(cents: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(cents / 100);
}

/** One offer, so one paywall message. */
export const PAYWALL_MESSAGE = `Votre essai gratuit est terminé. Abonnez-vous pour continuer : ${formatEuroCents(SUBSCRIPTION_MONTHLY_CENTS)}/mois ou ${formatEuroCents(SUBSCRIPTION_YEARLY_CENTS)}/an.`;

export interface BillingGate {
  userId: string;
  communityId: string | null;
  plan: string;
  access: CommunityAccess;
  trialEndsAt: string | null;
  /** True while the community may create: subscribed, in its trial, or a super admin. */
  isPaid: boolean;
  isSuperAdmin: boolean;
}

export async function getBillingGate(admin: Admin, userId: string): Promise<BillingGate> {
  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, role, communityId")
    .eq("id", userId)
    .single();

  const typedProfile = profile as { id: string; email: string; role: UserRole; communityId: string | null } | null;
  const isSuperAdmin = canAccessAdmin(typedProfile);
  if (!typedProfile?.communityId) {
    return { userId, communityId: null, plan: "FREE_TRIAL", access: "readonly", trialEndsAt: null, isPaid: isSuperAdmin, isSuperAdmin };
  }

  const { data: community } = await admin
    .from("Community")
    .select("plan, createdAt")
    .eq("id", typedProfile.communityId)
    .single();

  const typedCommunity = community as { plan?: string; createdAt?: string } | null;
  const access = getCommunityAccess(typedCommunity);
  return {
    userId,
    communityId: typedProfile.communityId,
    plan: typedCommunity?.plan ?? "FREE_TRIAL",
    access,
    trialEndsAt: typedCommunity?.createdAt ? trialEndsAt(typedCommunity.createdAt).toISOString() : null,
    isPaid: isSuperAdmin || access !== "readonly",
    isSuperAdmin,
  };
}

/** For jobs that run without a signed-in user (automations, crons). */
export async function communityHasAccess(admin: Admin, communityId: string) {
  const { data: community } = await admin.from("Community").select("plan, createdAt").eq("id", communityId).maybeSingle();
  return getCommunityAccess(community as { plan?: string; createdAt?: string } | null) !== "readonly";
}

export function paywallPayload(feature: string, message = PAYWALL_MESSAGE) {
  return {
    error: message,
    code: "PAYWALL_REQUIRED",
    feature,
    billingUrl: "/dashboard/settings/billing",
  };
}

export function paywallResponse(feature: string, message = PAYWALL_MESSAGE, status = 402) {
  return NextResponse.json(paywallPayload(feature, message), { status });
}

export async function assertPaidFeature(
  admin: Admin,
  userId: string,
  feature: string,
  message = PAYWALL_MESSAGE
) {
  const gate = await getBillingGate(admin, userId);
  if (!gate.communityId) {
    return { ok: false as const, gate, response: NextResponse.json({ error: "Communauté introuvable" }, { status: 403 }) };
  }
  if (!gate.isPaid) {
    return { ok: false as const, gate, response: paywallResponse(feature, message) };
  }
  return { ok: true as const, gate };
}
