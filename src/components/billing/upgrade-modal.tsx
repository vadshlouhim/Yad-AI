"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Lock, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isLaunchOfferActive, type BillingConfig } from "@/lib/billing";
import { createSubscriptionCheckout } from "@/lib/billing/checkout-client";

interface Props {
  open: boolean;
  onClose: () => void;
  config: BillingConfig;
  title?: string;
  description?: string;
  featureLabel?: string;
  /** Conservé pour compatibilité avec les anciens appels. */
  requiredTier?: "PRO" | "BUSINESS";
}

const PAID_FEATURES = [
  "Toutes les automatisations IA",
  "Générations et affiches IA",
  "Publications et envois",
  "Newsletter papier et outils avancés",
];

function formatPrice(cents: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function UpgradeModal({
  open,
  onClose,
  config,
  title,
  description = "Passez à l'offre supérieure pour débloquer cette action.",
  featureLabel = "Action premium",
  requiredTier = "PRO",
}: Props) {
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  void requiredTier;
  const launchOfferActive = isLaunchOfferActive(config);
  const resolvedTitle = title ?? "Débloquez cette action avec EasyCom IA";
  const features = PAID_FEATURES;

  async function goToCheckout() {
    setLoading(true);
    try {
      const checkoutUrl = await createSubscriptionCheckout({
        tier: "PROFESSIONAL",
        applyLaunchOffer: launchOfferActive,
        successUrl: `${window.location.origin}/dashboard/settings/billing?success=true`,
        cancelUrl: window.location.href,
      });
      if (checkoutUrl) window.location.assign(checkoutUrl);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Impossible d'ouvrir le paiement pour le moment.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="relative border-b border-blue-100 bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-6">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-slate-900"
            aria-label="Fermer"
          >
            <X className="size-4" />
          </button>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-bold text-blue-700 shadow-sm">
            <Lock className="size-3.5" />
            {featureLabel}
          </div>
          <h2 className="mt-4 max-w-md text-2xl font-black tracking-tight text-slate-950">{resolvedTitle}</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">{description}</p>
        </div>

        <div className="space-y-5 p-6">
          <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/60 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="size-5 text-blue-700" />
                  <p className="font-black text-slate-950">EasyCom IA</p>
                </div>
                {launchOfferActive && <p className="mt-1 text-xs font-semibold text-blue-700">{config.launchMessage}</p>}
              </div>
              <div className="text-right">
                {launchOfferActive ? (
                  <>
                    <p className="text-sm font-bold text-slate-400 line-through">
                      {formatPrice(config.basePriceCents)} {config.taxLabel}
                    </p>
                    <p className="text-3xl font-black text-blue-700">
                      {formatPrice(config.launchPriceCents)}
                    </p>
                  </>
                ) : (
                  <p className="text-3xl font-black text-blue-700">{formatPrice(config.basePriceCents)}</p>
                )}
                <p className="text-xs font-semibold text-slate-500">{config.taxLabel} / mois, puis {formatPrice(config.basePriceCents)} {config.taxLabel} / mois</p>
              </div>
            </div>
            {launchOfferActive && (
              <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                Offre réservée à la première souscription de votre communauté.
              </p>
            )}
          </div>

          <div className="grid gap-2 text-sm text-slate-700">
            {features.map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={goToCheckout}
              loading={loading}
              className="h-11 flex-1 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
            >
              Débloquer à 8,99 € TTC
              <ArrowRight className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className={cn("h-11 rounded-2xl border-slate-200 px-5")}
            >
              Continuer gratuitement
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
