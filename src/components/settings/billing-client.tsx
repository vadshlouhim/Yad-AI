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
import { formatDateTime } from "@/lib/utils";
import { planToTier, type BillingConfig, type PlanTier } from "@/lib/billing";
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
  const [loading, setLoading] = useState<PlanTier | "portal" | null>(null);

  async function goToCheckout(tier: "PRO" | "BUSINESS") {
    setLoading(tier);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: tier === "BUSINESS" ? "ENTERPRISE" : "PROFESSIONAL",
          applyLaunchOffer: tier === "PRO",
          successUrl: `${window.location.origin}/dashboard/settings/billing?success=true`,
          cancelUrl: `${window.location.origin}/dashboard/settings/billing`,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      alert("Erreur lors de la redirection vers la page de paiement.");
    } finally {
      setLoading(null);
    }
  }

  async function openPortal() {
    setLoading("portal");
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnUrl: window.location.href }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      alert("Erreur lors de l'accès au portail de facturation.");
    } finally {
      setLoading(null);
    }
  }

  const tier = planToTier(community.plan);
  const currentPlanLabel = tier === "FREE" ? "Gratuit" : tier === "PRO" ? "Pro" : "Business";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
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
        <Card className="border-blue-200 bg-blue-50/50">
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

      {/* Grille des plans */}
      <div>
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
            priceLabel={tier === "FREE" ? formatPrice(billingConfig.launchPriceCents) : formatPrice(billingConfig.basePriceCents)}
            features={PRO_FEATURES}
            badge={tier === "PRO" ? "Plan actuel" : "Populaire"}
            highlighted={tier === "PRO"}
            footer={
              tier === "PRO" ? (
                <Button variant="outline" className="w-full rounded-2xl" disabled>
                  Plan actuel
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
        {tier === "FREE" && (
          <p className="mt-3 text-center text-xs font-semibold text-blue-700">{billingConfig.launchMessage}</p>
        )}
      </div>

      {/* Découverte info */}
      {community.plan === "FREE_TRIAL" && !subscription && (
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
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
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Shield className="size-3.5" />
        <span>Paiements sécurisés par Stripe. Annulez à tout moment.</span>
      </div>
    </div>
  );
}
