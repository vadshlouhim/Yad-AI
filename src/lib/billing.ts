import { NextResponse } from "next/server";
import type { createAdminClient } from "@/lib/supabase/admin";
import { canAccessAdmin } from "@/lib/admin-access";

type Admin = ReturnType<typeof createAdminClient>;
type UserRole = "SUPER_ADMIN" | "ADMIN" | "EDITOR" | "VIEWER";

export const BILLING_CONFIG_KEY = "billing.pricing";

export type PlanTier = "FREE" | "PRO" | "BUSINESS";

const TIER_LABELS: Record<PlanTier, string> = { FREE: "Gratuit", PRO: "Pro", BUSINESS: "Business" };

export function planToTier(plan: string | null | undefined): PlanTier {
  if (plan === "ENTERPRISE") return "BUSINESS";
  if (plan === "PROFESSIONAL" || plan === "STARTER") return "PRO";
  return "FREE";
}

/**
 * Limites par palier. `socialPublications` se réinitialise chaque mois calendaire pour
 * tous les paliers. `assistantMessages` est un cumul à vie pour FREE (jamais remis à
 * zéro) et un cumul mensuel pour PRO/BUSINESS — voir `getBillingUsage`.
 */
export const TIER_LIMITS: Record<PlanTier, { assistantMessages: number; automations: number; socialPublications: number }> = {
  FREE: { assistantMessages: 20, automations: 0, socialPublications: 5 },
  PRO: { assistantMessages: 50, automations: 3, socialPublications: 20 },
  BUSINESS: { assistantMessages: Number.MAX_SAFE_INTEGER, automations: 5, socialPublications: 50 },
};

export function tierLimitMessage(
  tier: PlanTier,
  metric: "assistantMessages" | "automations" | "socialPublications"
): string {
  if (metric === "automations") {
    if (tier === "FREE") return "Le mode gratuit ne permet pas de créer d'automatisation IA. Passez à l'offre Pro (3 automatisations) ou Business (5 automatisations).";
    if (tier === "PRO") return "Vous avez atteint la limite de 3 automatisations IA de l'offre Pro. Passez à l'offre Business pour en programmer jusqu'à 5.";
    return "Vous avez atteint la limite de 5 automatisations IA de l'offre Business.";
  }
  if (metric === "socialPublications") {
    if (tier === "FREE") return "Le mode gratuit permet 5 publications sociales manuelles par mois. Passez à l'offre Pro (20/mois) ou Business (50/mois).";
    if (tier === "PRO") return "Vous avez atteint la limite de 20 publications sociales par mois de l'offre Pro. Passez à l'offre Business pour 50/mois.";
    return "Vous avez atteint la limite de 50 publications sociales par mois de l'offre Business.";
  }
  if (tier === "FREE") return "Le mode gratuit inclut 20 messages avec l'assistant IA au total. Passez à l'offre Pro pour 50 messages renouvelés chaque mois.";
  if (tier === "PRO") return "Vous avez atteint la limite de 50 messages avec l'assistant IA ce mois-ci. Passez à l'offre Business pour un nombre illimité de messages.";
  return "";
}

export function tierLabel(tier: PlanTier): string {
  return TIER_LABELS[tier];
}

/** Limite du poster/affiche gratuit (binaire, indépendante des paliers) */
export const FREE_POSTER_LIMIT = 1;
export const BUSINESS_PRICE_CENTS = 5999;

export const LIMITED_SOCIAL_CHANNELS = ["INSTAGRAM", "FACEBOOK", "TELEGRAM"] as const;

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
  if (!gate.isSuperAdmin && gate.tier !== requiredTier) {
    return { ok: false as const, gate, response: paywallResponse(feature, message) };
  }
  return { ok: true as const, gate };
}

export function getCheckoutPrice(
  config: BillingConfig,
  tier: "PROFESSIONAL" | "ENTERPRISE" = "PROFESSIONAL",
  applyLaunchOffer = true
) {
  if (tier === "ENTERPRISE") {
    return { unitAmount: BUSINESS_PRICE_CENTS, planName: "EasyCom Biz" };
  }

  const launchOfferApplied = applyLaunchOffer && isLaunchOfferActive(config);
  return {
    unitAmount: launchOfferApplied ? config.launchPriceCents : config.basePriceCents,
    planName: "EasyCom Pro",
  };
}
