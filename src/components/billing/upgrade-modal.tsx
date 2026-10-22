"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Lock, Sparkles, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BillingConfig } from "@/lib/billing";
import { createSubscriptionCheckout } from "@/lib/billing/checkout-client";

interface Props {
  open: boolean;
  onClose: () => void;
  config: BillingConfig;
  title?: string;
  description?: string;
  featureLabel?: string;
  requiredTier?: "PRO" | "BUSINESS";
}

export function UpgradeModal({ open, onClose, config, title, description, featureLabel, requiredTier = "PRO" }: Props) {
  const [loading, setLoading] = useState(false);
  const t = useTranslations("billing");
  const format = useFormatter();
  if (!open) return null;

  void requiredTier;
  const price = format.number(config.basePriceCents / 100, { style: "currency", currency: config.currency, minimumFractionDigits: 2 });
  const features = t.raw("features") as string[];

  async function goToCheckout() {
    setLoading(true);
    try {
      const checkoutUrl = await createSubscriptionCheckout({
        tier: "PROFESSIONAL",
        successUrl: `${window.location.origin}/dashboard/settings/billing?success=true`,
        cancelUrl: window.location.href,
      });
      if (checkoutUrl) window.location.assign(checkoutUrl);
    } catch (error) {
      alert(error instanceof Error ? error.message : t("checkoutError"));
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="relative border-b border-blue-100 bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-6">
          <button type="button" onClick={onClose} className="absolute end-4 top-4 inline-flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-slate-900" aria-label={t("back")}><X className="size-4" /></button>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-bold text-blue-700 shadow-sm"><Lock className="size-3.5" />{featureLabel ?? t("offerBadge")}</div>
          <h2 className="mt-4 max-w-md text-2xl font-black tracking-tight text-slate-950">{title ?? t("offerTrial")}</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">{description ?? t("heroDescription")}</p>
        </div>

        <div className="space-y-5 p-6">
          <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/60 p-5">
            <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><Sparkles className="size-5 text-blue-700" /><p className="font-black text-slate-950">EasyCom IA</p></div><p className="mt-2 text-sm font-bold text-blue-800">{t("offerCard")}</p></div><div className="text-end"><p className="text-3xl font-black text-blue-700">{format.number(0, { style: "currency", currency: config.currency })}</p><p className="text-xs font-semibold text-slate-500">{config.trialDays} jours</p></div></div>
            <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-600">{t("offerThen", { price })}</p>
            <p className="mt-2 text-xs font-semibold text-slate-500">{t("offerEligibility")}</p>
          </div>

          <div className="grid gap-2 text-sm text-slate-700">{features.map((feature) => <div key={feature} className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-500" /><span>{feature}</span></div>)}</div>
          <div className="flex flex-col gap-3 sm:flex-row"><Button onClick={goToCheckout} loading={loading} className="h-11 flex-1 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">{t("continueCheckout")}<ArrowRight className="rtl-mirror size-4" /></Button><Button type="button" variant="outline" onClick={onClose} className={cn("h-11 rounded-2xl border-slate-200 px-5")}>{t("back")}</Button></div>
        </div>
      </div>
    </div>
  );
}
