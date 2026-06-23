"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft, CreditCard, Check, Shield, Sparkles,
  ExternalLink, AlertCircle, Lock, X
} from "lucide-react";
import Link from "next/link";
import { formatDateTime, cn } from "@/lib/utils";
import type { BillingConfig } from "@/lib/billing";

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
  { label: "Tableau de bord et aperçu des pages", included: true },
  { label: "1 affiche modifiable", included: true },
  { label: "1 publication Instagram/Facebook/Telegram", included: true },
  { label: "1 automatisation IA", included: true },
  { label: "20 messages avec l'assistant IA", included: true },
  { label: "WhatsApp", included: false },
  { label: "Affiches illimitées", included: false },
  { label: "Automatisations avancées", included: false },
];

const PAID_FEATURES = [
  "WhatsApp débloqué",
  "Affiches modifiables sans limite",
  "Publications Instagram, Facebook et Telegram sans limite",
  "Automatisations IA sans limite",
  "Assistant IA sans limite de 20 messages",
  "Support et services additionnels selon options",
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
  const [loading, setLoading] = useState<string | null>(null);

  async function goToCheckout() {
    const planId = "PROFESSIONAL";
    setLoading(planId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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

  const isPaid = community.plan !== "FREE_TRIAL";
  const currentPlan = isPaid ? "Payant" : "Gratuit";

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
                      Plan {currentPlan}
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
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className={cn("relative border-2", !isPaid ? "border-slate-900 bg-slate-50" : "border-slate-200")}>
            {!isPaid && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">Plan actuel</span>
              </div>
            )}
            <CardContent className="space-y-5 p-6">
              <div className="text-center">
                <p className="text-lg font-black text-slate-950">Gratuit</p>
                <p className="mt-1 text-sm text-slate-500">Pour découvrir EasyCom IA avec des limites claires.</p>
                <p className="mt-4 text-3xl font-black text-slate-950">0 €</p>
              </div>
              <ul className="space-y-2.5">
                {FREE_FEATURES.map((feature) => (
                  <li key={feature.label} className="flex items-start gap-2 text-sm text-slate-700">
                    {feature.included ? (
                      <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                    ) : (
                      <X className="mt-0.5 size-4 shrink-0 text-slate-400" />
                    )}
                    <span className={cn(!feature.included && "text-slate-400")}>{feature.label}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full rounded-2xl" disabled>
                Continuer gratuitement
              </Button>
            </CardContent>
          </Card>

          <Card className={cn("relative overflow-hidden border-2", isPaid ? "border-blue-600 bg-blue-50/40" : "border-blue-200 ring-2 ring-blue-100")}>
            <div className="absolute right-4 top-4 rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
              Lancement
            </div>
            {isPaid && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">Plan actuel</span>
              </div>
            )}
            <CardContent className="space-y-5 p-6">
              <div className="text-center">
                <p className="text-lg font-black text-slate-950">Payant</p>
                <p className="mt-1 text-sm text-blue-700">{billingConfig.launchMessage}</p>
                <div className="mt-4 flex flex-wrap items-end justify-center gap-3">
                  <span className="text-lg font-bold text-slate-400 line-through">
                    {formatPrice(billingConfig.basePriceCents)} {billingConfig.taxLabel}
                  </span>
                  <span className="text-4xl font-black text-blue-700">
                    {formatPrice(billingConfig.launchPriceCents)}
                  </span>
                  <span className="pb-1 text-sm font-semibold text-slate-500">{billingConfig.taxLabel} / mois</span>
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-500">
                  Tarif réduit jusqu&apos;au {new Date(`${billingConfig.launchEndsAt}T12:00:00`).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}.
                </p>
              </div>
              <ul className="space-y-2.5">
                {PAID_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              {isPaid ? (
                <Button variant="outline" className="w-full rounded-2xl" disabled>
                  Plan actuel
                </Button>
              ) : (
                <Button
                  className="w-full rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
                  onClick={goToCheckout}
                  loading={loading === "PROFESSIONAL"}
                >
                  <Lock className="size-4" />
                  Passer au payant
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
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
