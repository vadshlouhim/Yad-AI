"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Lock, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BillingConfig } from "@/lib/billing";
import type { BillingInterval } from "@/lib/billing/subscription-policy";
import { createSubscriptionCheckout } from "@/lib/billing/checkout-client";

interface Props {
  open: boolean;
  onClose: () => void;
  config: BillingConfig;
  title?: string;
  description?: string;
  featureLabel?: string;
}

export function UpgradeModal({ open, onClose, config, title, description, featureLabel }: Props) {
  const [loading, setLoading] = useState(false);
  const [interval, setBillingInterval] = useState<BillingInterval>("month");
  const t = useTranslations("billing");
  const format = useFormatter();
  if (!open) return null;

  const formatPrice = (cents: number) => format.number(cents / 100, { style: "currency", currency: config.currency, minimumFractionDigits: 2 });
  const monthly = formatPrice(config.monthlyPriceCents);
  const yearly = formatPrice(config.yearlyPriceCents);
  const features = t.raw("features") as string[];
  const options: Array<{ value: BillingInterval; label: string; price: string; caption: string; saving?: string }> = [
    { value: "month", label: t("monthly"), price: monthly, caption: t("perMonth") },
    { value: "year", label: t("yearly"), price: yearly, caption: t("perYear"), saving: t("yearlySaving") },
  ];

  async function goToCheckout() {
    setLoading(true);
    try {
      const checkoutUrl = await createSubscriptionCheckout({
        interval,
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
        <div className="relative bg-[#421388] p-6 text-white">
          <button type="button" onClick={onClose} className="absolute end-4 top-4 inline-flex size-9 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25" aria-label={t("back")}><X className="size-4" /></button>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold"><Lock className="size-3.5" />{featureLabel ?? t("offerBadge")}</div>
          <h2 className="mt-4 max-w-md text-2xl font-black tracking-tight">{title ?? t("bannerReadOnly")}</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-white/80">{description ?? t("heroDescription", { monthly, yearly })}</p>
        </div>

        <div className="space-y-5 p-6">
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t("chooseInterval")}>
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={interval === option.value}
                onClick={() => setBillingInterval(option.value)}
                className={cn(
                  "rounded-2xl border-2 p-4 text-start transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200",
                  interval === option.value ? "border-[#421388] bg-violet-50" : "border-slate-200 bg-white hover:border-violet-200"
                )}
              >
                <span className="flex items-center justify-between gap-2"><span className="text-sm font-black text-slate-950">{option.label}</span>{option.saving ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-800">{option.saving}</span> : null}</span>
                <span className="mt-2 block"><bdi dir="ltr" className="text-2xl font-black text-[#421388]">{option.price}</bdi> <span className="text-xs font-semibold text-slate-500">{option.caption}</span></span>
              </button>
            ))}
          </div>

          <div className="grid gap-2 text-sm text-slate-700">{features.map((feature) => <div key={feature} className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-500" /><span>{feature}</span></div>)}</div>
          <div className="flex flex-col gap-3 sm:flex-row"><Button onClick={goToCheckout} loading={loading} className="h-11 flex-1 rounded-2xl bg-[#421388] text-white shadow-lg shadow-violet-900/20 hover:bg-[#2f0d70]">{t("continueCheckout")}<ArrowRight className="rtl-mirror size-4" /></Button><Button type="button" variant="outline" onClick={onClose} className="h-11 rounded-2xl border-slate-200 px-5">{t("back")}</Button></div>
          <p className="text-center text-xs font-semibold text-slate-500">{t("offerEligibility")}</p>
        </div>
      </div>
    </div>
  );
}
