"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft, CreditCard, Shield, Sparkles,
  ExternalLink, AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { cn, formatDateTime } from "@/lib/utils";
import { isLaunchOfferActive, planToTier, type BillingConfig, type PlanTier } from "@/lib/billing";
import { createBillingPortal, createSubscriptionCheckout } from "@/lib/billing/checkout-client";
import { PlanCard } from "@/components/billing/plan-card";

interface Community {
  plan: string;
  stripeCustomerId: string | null;
  planExpiresAt: Date | null;
}

interface Subscription {
  id: string;
  plan: string;
  status: string;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd: Date | null;
}

interface Props {
  community: Community;
  subscription: Subscription | null;
  billingConfig: BillingConfig;
}

const FREE_FEATURES = [
  "Tableau de bord et aperçu",
  "5 publications sociales manuelles / mois",
  "0 automatisation IA",
  "20 messages Agent IA",
  "WhatsApp bloqué",
  "Affiches limitées",
];

const PRO_FEATURES = [
  "WhatsApp débloqué",
  "Affiches illimitées",
  "20 publications sociales / mois",
  "3 automatisations IA",
  "50 messages Agent IA",
];

const BUSINESS_FEATURES = [
  "WhatsApp débloqué",
  "Affiches illimitées",
  "50 publications sociales / mois",
  "5 automatisations IA",
  "Messages Agent IA illimités",
  "Gestion des emails",
  "Gestion des avis Google",
];

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Actif",
  TRIALING: "Période d'essai",
  PAST_DUE: "Paiement en retard",
  CANCELED: "Annulé",
};

const STATUS_VARIANT: Record<string, "published" | "info" | "failed" | "draft"> = {
  ACTIVE: "published",
  TRIALING: "info",
  PAST_DUE: "failed",
  CANCELED: "draft",
};

function formatPrice(cents: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function BillingClient({ community, subscription, billingConfig }: Props) {
  const tier = planToTier(community.plan);
  const [loading, setLoading] = useState<PlanTier | "portal" | null>(null);
  const [mobileTier, setMobileTier] = useState<PlanTier>(tier === "FREE" ? "PRO" : tier);

  async function goToCheckout(tier: "PRO" | "BUSINESS") {
    setLoading(tier);
    try {
      const checkoutUrl = await createSubscriptionCheckout({
        tier: tier === "BUSINESS" ? "ENTERPRISE" : "PROFESSIONAL",
        applyLaunchOffer: tier === "PRO" && isLaunchOfferActive(billingConfig),
        successUrl: `${window.location.origin}/dashboard/settings/billing?success=true`,
        cancelUrl: `${window.location.origin}/dashboard/settings/billing`,
      });
      if (checkoutUrl) window.location.assign(checkoutUrl);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erreur lors de la redirection vers la page de paiement.");
    } finally {
      setLoading(null);
    }
  }

  async function openPortal() {
    setLoading("portal");
    try {
      const portalUrl = await createBillingPortal(window.location.href);
      window.location.assign(portalUrl);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erreur lors de l'accès au portail de facturation.");
    } finally {
      setLoading(null);
    }
  }

  const currentPlanLabel = tier === "FREE" ? "Gratuit" : tier === "PRO" ? "Pro" : "Business";
  const mobilePlans = [
    { tier: "FREE" as const, title: "Gratuit", price: "0 €", color: "bg-slate-900", features: FREE_FEATURES },
    {
      tier: "PRO" as const,
      title: "Pro",
      price: tier === "FREE" && isLaunchOfferActive(billingConfig) ? formatPrice(billingConfig.launchPriceCents) : formatPrice(billingConfig.basePriceCents),
      color: "bg-[#075ce5]",
      features: PRO_FEATURES,
    },
    { tier: "BUSINESS" as const, title: "Business", price: "59,99 €", color: "bg-[#421388]", features: BUSINESS_FEATURES },
  ];
  const selectedMobilePlan = mobilePlans.find((plan) => plan.tier === mobileTier) ?? mobilePlans[1];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-3 pb-10 pt-3 sm:px-6 md:space-y-6 md:px-0 md:py-0">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#421388] px-5 py-6 text-white shadow-[0_24px_58px_-32px_rgba(66,19,136,0.7)] md:hidden">
        <div className="absolute -right-12 -top-14 size-40 rounded-full bg-fuchsia-400/25 blur-3xl" />
        <div className="absolute -bottom-16 left-1/3 size-36 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white text-[#421388] shadow-lg"><CreditCard className="size-7" /></span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-100">Mon compte</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">Abonnement</h1>
            <p className="mt-1 text-sm font-bold text-violet-100">Offre actuelle : {currentPlanLabel}</p>
          </div>
        </div>
      </section>

      {/* Header */}
      <div className="hidden items-center gap-3 md:flex">
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4" />
            Paramètres
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Facturation</h1>
          <p className="text-slate-500 mt-1">Gérez votre abonnement et vos paiements</p>
        </div>
      </div>

      {/* Abonnement actuel */}
      {subscription && (
        <Card className="hidden border-blue-200 bg-blue-50/50 md:block">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <CreditCard className="size-5 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-800">
                      Plan {currentPlanLabel}
                    </p>
                    <Badge variant={STATUS_VARIANT[subscription.status] ?? "draft"} className="text-xs">
                      {STATUS_LABELS[subscription.status] ?? subscription.status}
                    </Badge>
                  </div>

                  {subscription.status === "TRIALING" && subscription.trialEnd && (
                    <p className="text-sm text-blue-700 mt-1">
                      Essai gratuit jusqu&apos;au {formatDateTime(subscription.trialEnd)}
                    </p>
                  )}

                  <p className="text-sm text-slate-500 mt-1">
                    {subscription.cancelAtPeriodEnd
                      ? `⚠️ Se termine le ${formatDateTime(subscription.currentPeriodEnd)}`
                      : `Renouvellement le ${formatDateTime(subscription.currentPeriodEnd)}`}
                  </p>
                </div>
              </div>

              {community.stripeCustomerId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openPortal}
                  loading={loading === "portal"}
                >
                  <ExternalLink className="size-4" />
                  Gérer l&apos;abonnement
                </Button>
              )}
            </div>

            {subscription.status === "PAST_DUE" && (
              <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
                <AlertCircle className="size-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">
                  Votre paiement est en retard. Mettez à jour votre moyen de paiement pour éviter
                  l&apos;interruption du service.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {subscription && (
        <section className="rounded-[1.6rem] border border-blue-100 bg-blue-50 p-4 shadow-sm md:hidden">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#075ce5] text-white"><CreditCard className="size-5" /></span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><p className="font-black text-slate-950">Plan {currentPlanLabel}</p><Badge variant={STATUS_VARIANT[subscription.status] ?? "draft"} className="text-[10px]">{STATUS_LABELS[subscription.status] ?? subscription.status}</Badge></div>
              <p className="mt-1 text-xs font-medium text-slate-500">{subscription.cancelAtPeriodEnd ? `Se termine le ${formatDateTime(subscription.currentPeriodEnd)}` : `Renouvellement le ${formatDateTime(subscription.currentPeriodEnd)}`}</p>
            </div>
          </div>
          {community.stripeCustomerId && (
            <Button variant="outline" onClick={openPortal} loading={loading === "portal"} className="mt-4 min-h-11 w-full rounded-2xl border-blue-200 bg-white font-black text-blue-700">Gérer mon abonnement</Button>
          )}
        </section>
      )}

      <section className="space-y-4 md:hidden">
        <h2 className="text-xl font-black tracking-tight text-slate-950">Choisissez votre offre</h2>
        <div className="grid grid-cols-3 gap-2">
          {mobilePlans.map((plan) => (
            <button
              key={plan.tier}
              type="button"
              onClick={() => setMobileTier(plan.tier)}
              className={cn(
                "min-w-0 rounded-[1.3rem] border-2 bg-white px-2 py-3 text-center transition",
                mobileTier === plan.tier ? "border-[#421388] shadow-[0_10px_24px_-16px_rgba(66,19,136,0.7)]" : "border-slate-100"
              )}
            >
              <span className="block truncate text-sm font-black text-slate-950">{plan.title}</span>
              <span className="mt-1 block truncate text-xs font-bold text-slate-500">{plan.price}</span>
            </button>
          ))}
        </div>

        <div className={cn("overflow-hidden rounded-[1.8rem] text-white shadow-[0_22px_48px_-30px_rgba(15,23,42,0.65)]", selectedMobilePlan.color)}>
          <div className="p-5">
            <div className="flex items-end justify-between gap-3">
              <div><p className="text-2xl font-black">{selectedMobilePlan.title}</p><p className="mt-1 text-sm font-semibold text-white/70">Sans engagement</p></div>
              <p className="text-xl font-black">{selectedMobilePlan.price}<span className="text-xs font-bold text-white/70">/mois</span></p>
            </div>
            <ul className="mt-5 space-y-2.5">
              {selectedMobilePlan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm font-semibold leading-5 text-white/90"><span className="mt-1 size-2 shrink-0 rounded-full bg-white" />{feature}</li>
              ))}
            </ul>
          </div>
          <div className="bg-white p-3">
            {selectedMobilePlan.tier === "FREE" ? (
              <Button variant="outline" disabled className="min-h-12 w-full rounded-2xl font-black">{tier === "FREE" ? "Offre actuelle" : "Offre gratuite"}</Button>
            ) : selectedMobilePlan.tier === "PRO" ? (
              tier === "PRO" ? <Button variant="outline" disabled className="min-h-12 w-full rounded-2xl font-black">Offre actuelle</Button>
                : tier === "BUSINESS" ? <Button variant="outline" disabled className="min-h-12 w-full rounded-2xl font-black">Inclus dans Business</Button>
                  : <Button onClick={() => goToCheckout("PRO")} loading={loading === "PRO"} className="min-h-12 w-full rounded-2xl bg-[#075ce5] font-black text-white">Choisir Pro</Button>
            ) : tier === "BUSINESS" ? (
              <Button variant="outline" disabled className="min-h-12 w-full rounded-2xl font-black">Offre actuelle</Button>
            ) : tier === "PRO" ? (
              <Button variant="outline" onClick={openPortal} loading={loading === "portal"} disabled={!community.stripeCustomerId} className="min-h-12 w-full rounded-2xl border-violet-200 font-black text-[#421388]">Passer à Business</Button>
            ) : (
              <Button onClick={() => goToCheckout("BUSINESS")} loading={loading === "BUSINESS"} className="min-h-12 w-full rounded-2xl bg-[#421388] font-black text-white">Choisir Business</Button>
            )}
          </div>
        </div>
        {tier === "FREE" && isLaunchOfferActive(billingConfig) && <p className="px-2 text-center text-xs font-bold text-blue-700">{billingConfig.launchMessage}</p>}
      </section>

      {/* Grille des plans */}
      <div className="hidden md:block">
        <h2 className="mb-4 text-center text-lg font-semibold text-slate-900">Choisir un mode</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <PlanCard
            tier="FREE"
            title="Gratuit"
            priceLabel="0 €"
            features={FREE_FEATURES}
            badge={tier === "FREE" ? "Plan actuel" : undefined}
            highlighted={tier === "FREE"}
            footer={
              <Button variant="outline" className="w-full rounded-2xl" disabled>
                {tier === "FREE" ? "Plan actuel" : "Non disponible"}
              </Button>
            }
          />

          <PlanCard
            tier="PRO"
            title="Pro"
            priceLabel={tier === "FREE" && isLaunchOfferActive(billingConfig)
              ? formatPrice(billingConfig.launchPriceCents)
              : formatPrice(billingConfig.basePriceCents)}
            features={PRO_FEATURES}
            badge={tier === "PRO" ? "Plan actuel" : "Populaire"}
            highlighted={tier === "PRO"}
            footer={
              tier === "PRO" ? (
                <Button variant="outline" className="w-full rounded-2xl" disabled>
                  Plan actuel
                </Button>
              ) : tier === "BUSINESS" ? (
                <Button variant="outline" className="w-full rounded-2xl" disabled>
                  Inclus dans Business
                </Button>
              ) : (
                <Button
                  className="w-full rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
                  onClick={() => goToCheckout("PRO")}
                  loading={loading === "PRO"}
                >
                  Passer à l&apos;offre Pro
                </Button>
              )
            }
          />

          <PlanCard
            tier="BUSINESS"
            title="Business"
            priceLabel="59,99 €"
            features={BUSINESS_FEATURES}
            badge={tier === "BUSINESS" ? "Plan actuel" : undefined}
            highlighted={tier === "BUSINESS"}
            footer={
              tier === "BUSINESS" ? (
                <Button variant="outline" className="w-full rounded-2xl" disabled>
                  Plan actuel
                </Button>
              ) : tier === "PRO" ? (
                <Button
                  variant="outline"
                  className="w-full rounded-2xl"
                  onClick={openPortal}
                  loading={loading === "portal"}
                  disabled={!community.stripeCustomerId}
                >
                  {community.stripeCustomerId ? "Changer d'offre dans Stripe" : "Contactez le support"}
                </Button>
              ) : (
                <Button
                  className="w-full rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-600/20 hover:bg-violet-700"
                  onClick={() => goToCheckout("BUSINESS")}
                  loading={loading === "BUSINESS"}
                >
                  Passer à l&apos;offre Business
                </Button>
              )
            }
          />
        </div>
        {tier === "FREE" && isLaunchOfferActive(billingConfig) && (
          <p className="mt-3 text-center text-xs font-semibold text-blue-700">{billingConfig.launchMessage}</p>
        )}
      </div>

      {/* Découverte info */}
      {community.plan === "FREE_TRIAL" && !subscription && (
        <Card className="hidden border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 md:block">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Sparkles className="size-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-amber-900">Mode gratuit actif</p>
              <p className="text-sm text-amber-700 mt-1">
                Vous pouvez tester la plateforme, puis passer au payant quand vous atteignez une limite.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sécurité */}
      <div className="flex items-center justify-center gap-2 px-3 text-center text-xs text-slate-400 md:justify-start md:px-0 md:text-left">
        <Shield className="size-3.5" />
        <span>Paiements sécurisés par Stripe. Annulez à tout moment.</span>
      </div>
    </div>
  );
}
