import { NextResponse } from "next/server";
import type { createAdminClient } from "@/lib/supabase/admin";
import { canAccessAdmin } from "@/lib/admin-access";

type Admin = ReturnType<typeof createAdminClient>;
type UserRole = "SUPER_ADMIN" | "ADMIN" | "EDITOR" | "VIEWER";

export const BILLING_CONFIG_KEY = "billing.pricing";

export type PlanTier = "FREE" | "PRO" | "BUSINESS";

const TIER_LABELS: Record<PlanTier, string> = { FREE: "Gratuit", PRO: "Pro", BUSINESS: "Business" };

export function planToTier(plan: string | null | undefined): PlanTier {
  if (plan && plan !== "FREE_TRIAL") return "PRO";
  return "FREE";
}

/**
 * Limites par palier. `socialPublications` se réinitialise chaque mois calendaire pour
 * tous les paliers. `assistantMessages` est un cumul à vie pour FREE (jamais remis à
 * zéro) et un cumul mensuel pour PRO/BUSINESS — voir `getBillingUsage`.
 */
export const TIER_LIMITS: Record<PlanTier, { assistantMessages: number; automations: number; socialPublications: number }> = {
  FREE: { assistantMessages: 0, automations: 0, socialPublications: 0 },
  PRO: { assistantMessages: Number.MAX_SAFE_INTEGER, automations: Number.MAX_SAFE_INTEGER, socialPublications: Number.MAX_SAFE_INTEGER },
  BUSINESS: { assistantMessages: Number.MAX_SAFE_INTEGER, automations: Number.MAX_SAFE_INTEGER, socialPublications: Number.MAX_SAFE_INTEGER },
};

export function tierLimitMessage(
  tier: PlanTier,
  metric: "assistantMessages" | "automations" | "socialPublications"
): string {
  if (tier !== "FREE") return "";
  if (metric === "automations") return "Créez votre première automatisation : premier mois à 8,99 € TTC, puis 29,99 € TTC/mois.";
  if (metric === "socialPublications") return "Publiez avec EasyCom IA : premier mois à 8,99 € TTC, puis 29,99 € TTC/mois.";
  return "Lancez votre première génération IA : premier mois à 8,99 € TTC, puis 29,99 € TTC/mois.";
}

export function tierLabel(tier: PlanTier): string {
  return TIER_LABELS[tier];
}

/** Limite du poster/affiche gratuit (binaire, indépendante des paliers) */
export const FREE_POSTER_LIMIT = 0;

export const LIMITED_SOCIAL_CHANNELS = ["INSTAGRAM", "FACEBOOK", "TELEGRAM"] as const;

export interface BillingConfig {
  basePriceCents: number;
  launchPriceCents: number;
  currency: "EUR";
  taxLabel: "TTC";
  launchEndsAt: string;
  launchMessage: string;
}

export interface BillingGate {
  userId: string;
  communityId: string | null;
  plan: string;
  tier: PlanTier;
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
  basePriceCents: 2999,
  launchPriceCents: 899,
  currency: "EUR",
  taxLabel: "TTC",
  launchEndsAt: "2099-12-31",
  launchMessage: "Offre de bienvenue : premier mois à 8,99 € TTC au lieu de 29,99 € TTC, puis 29,99 € TTC/mois.",
};

export function isPaidPlan(plan: string | null | undefined) {
  return Boolean(plan && plan !== "FREE_TRIAL");
}

export function isLaunchOfferActive(config: BillingConfig, now = new Date()) {
  void config;
  void now;
  return true;
}

export function formatEuroCents(cents: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function normalizeBillingConfig(value: unknown): BillingConfig {
  void value;
  return DEFAULT_BILLING_CONFIG;
}

export async function getBillingConfig(admin: Admin): Promise<BillingConfig> {
  void admin;
  return DEFAULT_BILLING_CONFIG;
}

export async function saveBillingConfig(admin: Admin, config: BillingConfig) {
  void admin;
  return normalizeBillingConfig(config);
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
      tier: "FREE",
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
    tier: planToTier(plan),
    isPaid: isSuperAdmin || isPaidPlan(plan),
    isSuperAdmin,
  };
}

function startOfCurrentMonthUTC(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/**
 * `tier` détermine si `assistantMessages` est compté à vie (FREE) ou sur le mois
 * calendaire en cours (PRO/BUSINESS). `socialPublications` est toujours mensuel.
 * `automations` reste un cumul à vie (pas de notion de "par mois" dans le cahier des charges).
 */
export async function getBillingUsage(admin: Admin, communityId: string, tier: PlanTier): Promise<BillingUsage> {
  const monthStart = startOfCurrentMonthUTC();

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
        .in("channelType", LIMITED_SOCIAL_CHANNELS as unknown as string[])
        .gte("createdAt", monthStart),
      admin
        .from("Conversation")
        .select("id")
        .eq("communityId", communityId)
        .limit(500),
    ]);

  const conversationIds = ((conversations ?? []) as Array<{ id: string }>).map((conversation) => conversation.id);
  let assistantMessages = 0;
  if (conversationIds.length > 0) {
    let query = admin
      .from("ConversationMessage")
      .select("id", { count: "exact", head: true })
      .eq("role", "user")
      .in("conversationId", conversationIds);
    if (tier !== "FREE") {
      query = query.gte("createdAt", monthStart);
    }
    const { count } = await query;
    assistantMessages = count ?? 0;
  }

  return {
    assistantMessages,
    posterGenerations: posterGenerations ?? 0,
    automations: automations ?? 0,
    socialPublications: socialPublications ?? 0,
  };
}

export function paywallPayload(
  feature: string,
  message: string,
  usage?: Partial<BillingUsage>,
  limits?: Record<string, number>
) {
  return {
    error: message,
    code: "PAYWALL_REQUIRED",
    feature,
    usage,
    limits: limits ?? TIER_LIMITS.FREE,
    billingUrl: "/dashboard/settings/billing",
  };
}

export function paywallResponse(
  feature: string,
  message: string,
  usage?: Partial<BillingUsage>,
  limits?: Record<string, number>,
  status = 402
) {
  return NextResponse.json(paywallPayload(feature, message, usage, limits), { status });
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

/** Réservé aux fonctionnalités exclusives à l'offre Business (gestion des emails, avis Google) */
export async function assertTierFeature(
  admin: Admin,
  userId: string,
  requiredTier: PlanTier,
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

export function getCheckoutPrice(
  config: BillingConfig,
  ..._legacyArgs: [tier?: "PROFESSIONAL" | "ENTERPRISE", applyLaunchOffer?: boolean]
) {
  void _legacyArgs;
  return {
    unitAmount: config.basePriceCents,
    planName: "EasyCom IA",
  };
}
