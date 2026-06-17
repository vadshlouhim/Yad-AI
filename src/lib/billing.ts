import { NextResponse } from "next/server";
import type { createAdminClient } from "@/lib/supabase/admin";
import { canAccessAdmin } from "@/lib/admin-access";

type Admin = ReturnType<typeof createAdminClient>;
type UserRole = "SUPER_ADMIN" | "ADMIN" | "EDITOR" | "VIEWER";

export const BILLING_CONFIG_KEY = "billing.pricing";

export const FREE_LIMITS = {
  assistantMessages: 20,
  posterGenerations: 1,
  automations: 1,
  socialPublications: 1,
} as const;

export const PAID_PLAN_ID = "PROFESSIONAL";

export interface BillingConfig {
  basePriceCents: number;
  launchPriceCents: number;
  currency: "EUR";
  taxLabel: "HT";
  launchEndsAt: string;
  launchMessage: string;
}

export interface BillingGate {
  userId: string;
  communityId: string | null;
  plan: string;
  isPaid: boolean;
  isSuperAdmin: boolean;
}

export interface BillingUsage {
  assistantMessages: number;
  posterGenerations: number;
  automations: number;
  socialPublications: number;
}

export const DEFAULT_BILLING_CONFIG: BillingConfig = {
  basePriceCents: 1999,
  launchPriceCents: 999,
  currency: "EUR",
  taxLabel: "HT",
  launchEndsAt: "2026-08-31",
  launchMessage: "Offre de lancement : profitez d'EasyCom IA à 9,99 € HT par mois jusqu'à fin août 2026.",
};

export function isPaidPlan(plan: string | null | undefined) {
  return Boolean(plan && plan !== "FREE_TRIAL");
}

export function isLaunchOfferActive(config: BillingConfig, now = new Date()) {
  const end = new Date(`${config.launchEndsAt}T23:59:59`);
  return Number.isFinite(end.getTime()) && now <= end;
}

export function formatEuroCents(cents: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function normalizeBillingConfig(value: unknown): BillingConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_BILLING_CONFIG;
  const data = value as Partial<BillingConfig>;
  return {
    basePriceCents: positiveInt(data.basePriceCents, DEFAULT_BILLING_CONFIG.basePriceCents),
    launchPriceCents: positiveInt(data.launchPriceCents, DEFAULT_BILLING_CONFIG.launchPriceCents),
    currency: "EUR",
    taxLabel: "HT",
    launchEndsAt: typeof data.launchEndsAt === "string" && data.launchEndsAt ? data.launchEndsAt : DEFAULT_BILLING_CONFIG.launchEndsAt,
    launchMessage: typeof data.launchMessage === "string" && data.launchMessage.trim()
      ? data.launchMessage.trim()
      : DEFAULT_BILLING_CONFIG.launchMessage,
  };
}

function positiveInt(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;
}

export async function getBillingConfig(admin: Admin): Promise<BillingConfig> {
  const { data, error } = await admin
    .from("PlatformSetting")
    .select("value")
    .eq("key", BILLING_CONFIG_KEY)
    .maybeSingle();

  if (error) return DEFAULT_BILLING_CONFIG;
  return normalizeBillingConfig((data as { value?: unknown } | null)?.value);
}

export async function saveBillingConfig(admin: Admin, config: BillingConfig) {
  const normalized = normalizeBillingConfig(config);
  const { error } = await admin.from("PlatformSetting").upsert(
    {
      key: BILLING_CONFIG_KEY,
      value: normalized,
      updatedAt: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
  if (error) throw new Error(error.message);
  return normalized;
}

export async function getBillingGate(admin: Admin, userId: string): Promise<BillingGate> {
  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, role, communityId")
    .eq("id", userId)
    .single();

  const typedProfile = profile as { id: string; email: string; role: UserRole; communityId: string | null } | null;
  if (!typedProfile?.communityId) {
    return {
      userId,
      communityId: null,
      plan: "FREE_TRIAL",
      isPaid: false,
      isSuperAdmin: canAccessAdmin(typedProfile),
    };
  }

  const { data: community } = await admin
    .from("Community")
    .select("plan")
    .eq("id", typedProfile.communityId)
    .single();

  const plan = (community as { plan?: string } | null)?.plan ?? "FREE_TRIAL";
  const isSuperAdmin = canAccessAdmin(typedProfile);
  return {
    userId,
    communityId: typedProfile.communityId,
    plan,
    isPaid: isSuperAdmin || isPaidPlan(plan),
    isSuperAdmin,
  };
}

export async function getBillingUsage(admin: Admin, communityId: string): Promise<BillingUsage> {
  const [{ count: posterGenerations }, { count: automations }, { count: socialPublications }, { data: conversations }] =
    await Promise.all([
      admin
        .from("MediaFile")
        .select("id", { count: "exact", head: true })
        .eq("communityId", communityId)
        .eq("source", "TEMPLATE_GENERATION"),
      admin
        .from("Automation")
        .select("id", { count: "exact", head: true })
        .eq("communityId", communityId),
      admin
        .from("Publication")
        .select("id", { count: "exact", head: true })
        .eq("communityId", communityId)
        .in("channelType", ["INSTAGRAM", "FACEBOOK", "TELEGRAM"]),
      admin
        .from("Conversation")
        .select("id")
        .eq("communityId", communityId)
        .limit(500),
    ]);

  const conversationIds = ((conversations ?? []) as Array<{ id: string }>).map((conversation) => conversation.id);
  let assistantMessages = 0;
  if (conversationIds.length > 0) {
    const { count } = await admin
      .from("ConversationMessage")
      .select("id", { count: "exact", head: true })
      .eq("role", "user")
      .in("conversationId", conversationIds);
    assistantMessages = count ?? 0;
  }

  return {
    assistantMessages,
    posterGenerations: posterGenerations ?? 0,
    automations: automations ?? 0,
    socialPublications: socialPublications ?? 0,
  };
}

export function paywallPayload(feature: string, message: string, usage?: Partial<BillingUsage>) {
  return {
    error: message,
    code: "PAYWALL_REQUIRED",
    feature,
    usage,
    limits: FREE_LIMITS,
    billingUrl: "/dashboard/settings/billing",
  };
}

export function paywallResponse(feature: string, message: string, usage?: Partial<BillingUsage>, status = 402) {
  return NextResponse.json(paywallPayload(feature, message, usage), { status });
}

export async function assertPaidFeature(
  admin: Admin,
  userId: string,
  feature: string,
  message: string
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

export function getActivePaidPriceId(config: BillingConfig) {
  if (isLaunchOfferActive(config) && process.env.STRIPE_LAUNCH_PRICE_ID) {
    return process.env.STRIPE_LAUNCH_PRICE_ID;
  }
  return process.env.STRIPE_PAID_PRICE_ID ?? process.env.STRIPE_PRO_PRICE_ID;
}
