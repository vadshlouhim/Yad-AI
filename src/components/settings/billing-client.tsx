"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft, CreditCard, Check, Zap, Shield, Sparkles,
  ExternalLink, AlertCircle, Calendar
} from "lucide-react";
import Link from "next/link";
import { formatDateTime, cn } from "@/lib/utils";

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
}

const PLANS = [
  {
    id: "FREE_TRIAL",
    name: "Essai gratuit",
    price: 0,
    period: "",
    description: "Pour découvrir Yad.ia",
    features: [
      "30 publications / mois",
      "50 générations IA / mois",
      "2 canaux de diffusion",
      "10 templates",
    ],
    color: "border-slate-200",
    badge: null,
  },
  {
    id: "STARTER",
    name: "Starter",
    price: 29,
    period: "/ mois",
    description: "Pour les petites communautés",
    features: [
      "150 publications / mois",
      "300 générations IA / mois",
      "5 canaux de diffusion",
      "50 templates",
      "Automatisations Chabbat",
      "Support email",
    ],
    color: "border-blue-200",
    badge: null,
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID,
  },
  {
    id: "PROFESSIONAL",
    name: "Professionnel",
    price: 79,
    period: "/ mois",
    description: "Pour les communautés actives",
    features: [
      "Publications illimitées",
      "Générations IA illimitées",
      "Tous les canaux",
      "Templates illimités",
      "Toutes les automatisations",
      "Calendrier juif avancé",
      "Support prioritaire",
    ],
    color: "border-purple-200",
    badge: "Populaire",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    price: 199,
    period: "/ mois",
    description: "Pour les grandes organisations",
    features: [
      "Tout ce qu'il y a dans Pro",
      "Multi-communautés",
      "API dédiée",
      "Onboarding personnalisé",
      "SLA garanti",
      "Support dédié",
    ],
    color: "border-amber-200",
    badge: null,
    priceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID,
  },
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

export function BillingClient({ community, subscription }: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  async function goToCheckout(priceId: string, planId: string) {
    setLoading(planId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
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

  const currentPlan = PLANS.find((p) => p.id === community.plan) ?? PLANS[0];

  return (
    <div className="max-w-4xl space-y-6">
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
                      Plan {currentPlan.name}
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
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Choisir un plan</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = community.plan === plan.id;
            const isUpgrade = PLANS.findIndex((p) => p.id === community.plan) <
                              PLANS.findIndex((p) => p.id === plan.id);

            return (
              <Card
                key={plan.id}
                className={cn(
                  "relative border-2 transition-all",
                  isCurrent ? "border-blue-500 bg-blue-50/30" : plan.color,
                  plan.id === "PROFESSIONAL" && !isCurrent && "ring-2 ring-purple-200"
                )}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-purple-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Plan actuel
                    </span>
                  </div>
                )}

                <CardContent className="p-5 space-y-4">
                  <div>
                    <p className="font-bold text-slate-900">{plan.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{plan.description}</p>
                    <div className="mt-3">
                      <span className="text-3xl font-bold text-slate-900">{plan.price === 0 ? "Gratuit" : `${plan.price}€`}</span>
                      {plan.period && <span className="text-sm text-slate-400 ml-1">{plan.period}</span>}
                    </div>
                  </div>

                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-xs text-slate-600">
                        <Check className="size-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <Button variant="outline" size="sm" className="w-full" disabled>
                      Plan actuel
                    </Button>
                  ) : plan.id === "FREE_TRIAL" ? (
                    <Button variant="outline" size="sm" className="w-full" disabled>
                      Plan de base
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full"
                      variant={plan.id === "PROFESSIONAL" ? "default" : "outline"}
                      onClick={() => plan.priceId && goToCheckout(plan.priceId, plan.id)}
                      loading={loading === plan.id}
                      disabled={!plan.priceId}
                    >
                      {isUpgrade ? (
                        <>
                          <Zap className="size-3.5" />
                          Passer à {plan.name}
                        </>
                      ) : (
                        <>Choisir {plan.name}</>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Période d'essai info */}
      {community.plan === "FREE_TRIAL" && !subscription && (
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Sparkles className="size-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-amber-900">14 jours d&apos;essai gratuit inclus</p>
              <p className="text-sm text-amber-700 mt-1">
                Tous les plans payants incluent 14 jours d&apos;essai. Aucun prélèvement pendant la période d&apos;essai.
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
