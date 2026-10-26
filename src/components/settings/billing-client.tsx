"use client";

import { useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, CreditCard, Download, ExternalLink, FileText, ReceiptText, Shield, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BillingConfig } from "@/lib/billing";
import type { BillingInterval, CommunityAccess } from "@/lib/billing/subscription-policy";
import { createBillingPortal, createSubscriptionCheckout } from "@/lib/billing/checkout-client";

interface Community { plan: string; stripeCustomerId: string | null; planExpiresAt: Date | null; }
interface Subscription { id: string; plan: string; status: string; currentPeriodStart: Date; currentPeriodEnd: Date; cancelAtPeriodEnd: boolean; trialEnd: Date | null; createdAt: Date; }
interface Invoice { id: string; number: string | null; amountPaid: number; currency: string; status: string | null; createdAt: string; invoicePdf: string | null; hostedInvoiceUrl: string | null; }
interface Props {
  community: Community;
  subscription: Subscription | null;
  billingConfig: BillingConfig;
  invoices: Invoice[];
  hasUsedTrial: boolean;
  access: CommunityAccess;
  trialEndsAt: string | null;
  now: string;
}

const ACTIVE_STATUSES = new Set(["ACTIVE", "TRIALING"]);

export function BillingClient({ community, subscription, billingConfig, invoices, hasUsedTrial, access, trialEndsAt, now }: Props) {
  const locale = useLocale();
  const t = useTranslations("billing");
  const format = useFormatter();
  const [loading, setLoading] = useState<"checkout" | "portal" | null>(null);
  const [interval, setBillingInterval] = useState<BillingInterval>("month");
  const isActive = Boolean(subscription && ACTIVE_STATUSES.has(subscription.status));
  const isStripeTrial = subscription?.status === "TRIALING" && Boolean(subscription.trialEnd);
  const nextDate = subscription?.currentPeriodEnd ?? community.planExpiresAt;
  const formatPrice = (cents: number, currency = "EUR") => format.number(cents / 100, { style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: 2 });
  const monthly = formatPrice(billingConfig.monthlyPriceCents, billingConfig.currency);
  const yearly = formatPrice(billingConfig.yearlyPriceCents, billingConfig.currency);
  const formatDate = (value: Date | string) => format.dateTime(new Date(value), { dateStyle: "medium" });
  const daysUntil = (value: Date | string) => Math.max(0, Math.ceil((new Date(value).getTime() - new Date(now).getTime()) / 86_400_000));
  const status = isActive
    ? { label: t(isStripeTrial ? "statusTrial" : "statusActive"), className: "bg-emerald-100 text-emerald-800" }
    : subscription?.status === "PAST_DUE"
      ? { label: t("statusPastDue"), className: "bg-amber-100 text-amber-800" }
      : access === "trial"
        ? { label: t("statusTrial"), className: "bg-emerald-100 text-emerald-800" }
        : { label: t("statusReadOnly"), className: "bg-slate-100 text-slate-700" };
  const features = t.raw("features") as string[];
  const options: Array<{ value: BillingInterval; label: string; price: string; caption: string; saving?: string }> = [
    { value: "month", label: t("monthly"), price: monthly, caption: t("perMonth") },
    { value: "year", label: t("yearly"), price: yearly, caption: t("perYear"), saving: t("yearlySaving") },
  ];
  const selectedPrice = interval === "year" ? yearly : monthly;

  async function checkout() {
    setLoading("checkout");
    try {
      const url = await createSubscriptionCheckout({ interval, successUrl: `${window.location.origin}/dashboard/settings/billing?success=true`, cancelUrl: window.location.href });
      if (url) window.location.assign(url);
    } catch (error) {
      alert(error instanceof Error ? error.message : t("checkoutError"));
      setLoading(null);
    }
  }

  async function portal() {
    setLoading("portal");
    try {
      window.location.assign(await createBillingPortal(window.location.href));
    } catch (error) {
      alert(error instanceof Error ? error.message : t("portalError"));
      setLoading(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-3 pb-10 pt-3 sm:px-6 md:py-6" dir={locale === "he" ? "rtl" : "ltr"}>
      <div className="hidden items-center gap-3 md:flex"><Link href="/dashboard/settings"><Button variant="ghost" size="sm"><ArrowLeft className="rtl-mirror size-4" />{t("back")}</Button></Link><div><h1 className="text-2xl font-black text-slate-950">{t("title")}</h1><p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p></div></div>

      <section className="overflow-hidden rounded-[2rem] bg-[#421388] p-5 text-white shadow-[0_24px_58px_-30px_rgba(66,19,136,0.75)] sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-black"><Sparkles className="size-3.5" />EASYCOM IA</div><h2 className="mt-4 whitespace-pre-line text-3xl font-black tracking-tight">{t("heroTitle")}</h2><p className="mt-3 max-w-lg text-sm leading-6 text-white/80">{t("heroDescription", { monthly, yearly })}</p></div><Badge className={`px-3 py-2 ${status.className}`}>{status.label}</Badge></div>
        {isStripeTrial && subscription?.trialEnd && <p className="mt-6 rounded-2xl bg-emerald-400/15 px-4 py-3 text-sm font-bold ring-1 ring-emerald-200/30">{t("trialSummary", { days: daysUntil(subscription.trialEnd), date: formatDate(subscription.trialEnd) })}</p>}
        {!isActive && (
          <div className="mt-6 rounded-[1.5rem] bg-white p-4 text-slate-950 sm:p-5">
            <p className={cn("rounded-2xl px-4 py-3 text-sm font-bold", access === "trial" ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900")}>
              {access === "trial" && trialEndsAt
                ? t("appTrialSummary", { days: daysUntil(trialEndsAt), date: formatDate(trialEndsAt) })
                : hasUsedTrial ? t("trialUsed") : t("readOnlySummary")}
            </p>
            <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-violet-700">{t("chooseInterval")}</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t("chooseInterval")}>
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
                  <span className="flex items-center justify-between gap-2"><span className="text-sm font-black">{option.label}</span>{option.saving ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-800">{option.saving}</span> : null}</span>
                  <span className="mt-2 block"><bdi dir="ltr" className="text-2xl font-black text-[#421388]">{option.price}</bdi> <span className="text-xs font-semibold text-slate-500">{option.caption}</span></span>
                </button>
              ))}
            </div>
            <Button onClick={checkout} loading={loading === "checkout"} className="mt-4 min-h-12 w-full rounded-2xl bg-[#421388] px-5 font-black text-white hover:bg-[#2f0d70]">{t("subscribeNow", { price: selectedPrice })}</Button>
            <p className="mt-2 text-center text-xs font-semibold text-slate-500">{access === "trial" ? t("offerEligibility") : t("offerThen", { monthly, yearly })}</p>
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{t("state")}</p><p className="mt-3 text-lg font-black text-slate-950">{status.label}</p><p className="mt-1 text-sm text-slate-500">{t(isActive || access === "trial" ? "fullAccess" : "noBilling")}</p></article>
        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{t("since")}</p><p className="mt-3 text-lg font-black text-slate-950">{subscription ? formatDate(subscription.currentPeriodStart) : "—"}</p><p className="mt-1 text-sm text-slate-500">{t("periodStart")}</p></article>
        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{t(subscription?.cancelAtPeriodEnd ? "accessEnd" : "nextRenewal")}</p><p className="mt-3 text-lg font-black text-slate-950">{nextDate ? formatDate(nextDate) : "—"}</p><p className="mt-1 text-sm text-slate-500">{t(subscription?.cancelAtPeriodEnd ? "accessUntil" : "changeAnytime")}</p></article>
      </section>

      {community.stripeCustomerId && <section className="rounded-[1.7rem] border border-violet-100 bg-violet-50/60 p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#421388] shadow-sm"><CreditCard className="size-5" /></span><div><h3 className="font-black text-slate-950">{t("manageTitle")}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{t("manageDescription")}</p></div></div><Button variant="outline" onClick={portal} loading={loading === "portal"} className="shrink-0 rounded-xl border-violet-200 bg-white"><ExternalLink className="size-4" />{t("openPortal")}</Button></div></section>}

      <section className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"><ReceiptText className="size-5" /></span><div><h3 className="text-lg font-black text-slate-950">{t("invoices")}</h3><p className="text-sm text-slate-500">{t("invoicesDescription")}</p></div></div>{invoices.length ? <div className="mt-5 divide-y divide-slate-100">{invoices.map((invoice) => <div key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"><div className="flex items-center gap-3"><FileText className="size-4 text-slate-400" /><div><p className="font-bold text-slate-800">{invoice.number ?? t("invoice")} · {formatPrice(invoice.amountPaid, invoice.currency)}</p><p className="text-xs text-slate-500">{formatDate(invoice.createdAt)} · {invoice.status === "paid" ? t("paid") : invoice.status ?? t("processing")}</p></div></div>{(invoice.invoicePdf ?? invoice.hostedInvoiceUrl) && <a href={invoice.invoicePdf ?? invoice.hostedInvoiceUrl ?? "#"} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"><Download className="size-4" />{t("download")}</a>}</div>)}</div> : <p className="mt-5 rounded-2xl bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-500">{t("noInvoices")}</p>}</section>

      <section className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-lg font-black text-slate-950">{t("included")}</h3><div className="mt-4 grid gap-3 sm:grid-cols-2">{features.map((feature) => <div key={feature} className="flex items-center gap-2 text-sm font-semibold text-slate-700"><CheckCircle2 className="size-4 shrink-0 text-emerald-500" />{feature}</div>)}</div></section>
      <p className="flex items-center justify-center gap-2 text-center text-xs text-slate-400"><Shield className="size-3.5" />{t("secure")}</p>
    </div>
  );
}
