"use client";

import { useState } from "react";
import { useFormatter, useLocale } from "next-intl";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, CreditCard, Download, ExternalLink, FileText, ReceiptText, Shield, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BillingConfig } from "@/lib/billing";
import { createBillingPortal, createSubscriptionCheckout } from "@/lib/billing/checkout-client";

interface Community { plan: string; stripeCustomerId: string | null; planExpiresAt: Date | null; }
interface Subscription { id: string; plan: string; status: string; currentPeriodStart: Date; currentPeriodEnd: Date; cancelAtPeriodEnd: boolean; trialEnd: Date | null; createdAt: Date; }
interface Invoice { id: string; number: string | null; amountPaid: number; currency: string; status: string | null; createdAt: string; invoicePdf: string | null; hostedInvoiceUrl: string | null; }
interface Props { community: Community; subscription: Subscription | null; billingConfig: BillingConfig; invoices: Invoice[]; }

const FEATURES = ["Automatisations IA sans limite", "Affiches, publications et envois", "Newsletter papier Chabbat et PDF", "Email, avis Google et WhatsApp"];
const ACTIVE_STATUSES = new Set(["ACTIVE", "TRIALING"]);

export function BillingClient({ community, subscription, billingConfig, invoices }: Props) {
  const locale = useLocale();
  const format = useFormatter();
  const [loading, setLoading] = useState<"checkout" | "portal" | null>(null);
  const status = !subscription
    ? { label: locale === "he" ? "התנסות חינם" : "Découverte gratuite", className: "bg-slate-100 text-slate-700" }
    : ACTIVE_STATUSES.has(subscription.status)
      ? { label: locale === "he" ? (subscription.status === "TRIALING" ? "תקופת ניסיון" : "מנוי פעיל") : (subscription.status === "TRIALING" ? "Période d'essai" : "Abonnement actif"), className: "bg-emerald-100 text-emerald-800" }
      : subscription.status === "PAST_DUE"
        ? { label: locale === "he" ? "נדרש להסדיר את התשלום" : "Paiement à régulariser", className: "bg-amber-100 text-amber-800" }
        : { label: locale === "he" ? "מנוי לא פעיל" : "Abonnement inactif", className: "bg-slate-100 text-slate-700" };
  const formatPrice = (cents: number, currency = "EUR") => format.number(cents / 100, { style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: 2 });
  const formatDateTime = (value: Date | string) => format.dateTime(new Date(value), { dateStyle: "medium" });
  const isPaid = Boolean(subscription && ACTIVE_STATUSES.has(subscription.status));
  const nextDate = subscription?.currentPeriodEnd ?? community.planExpiresAt;

  async function checkout() {
    setLoading("checkout");
    try {
      const url = await createSubscriptionCheckout({ tier: "PROFESSIONAL", applyLaunchOffer: true, successUrl: `${window.location.origin}/dashboard/settings/billing?success=true`, cancelUrl: window.location.href });
      if (url) window.location.assign(url);
    } catch (error) { alert(error instanceof Error ? error.message : "Impossible d'ouvrir le paiement."); setLoading(null); }
  }

  async function portal() {
    setLoading("portal");
    try { window.location.assign(await createBillingPortal(window.location.href)); }
    catch (error) { alert(error instanceof Error ? error.message : "Impossible d'ouvrir l'espace Stripe."); setLoading(null); }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-3 pb-10 pt-3 sm:px-6 md:py-6">
      <div className="hidden items-center gap-3 md:flex"><Link href="/dashboard/settings"><Button variant="ghost" size="sm"><ArrowLeft className="rtl-mirror size-4" />{locale === "he" ? "הגדרות" : "Paramètres"}</Button></Link><div><h1 className="text-2xl font-black text-slate-950">{locale === "he" ? "תשלום" : "Paiement"}</h1><p className="mt-1 text-sm text-slate-500">{locale === "he" ? "המנוי, אמצעי התשלום והחשבוניות שלכם." : "Votre abonnement, vos moyens de paiement et vos factures."}</p></div></div>

      <section className="overflow-hidden rounded-[2rem] bg-[#421388] p-5 text-white shadow-[0_24px_58px_-30px_rgba(66,19,136,0.75)] sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-black"><Sparkles className="size-3.5" />EASYCOM IA</div><h2 className="mt-4 text-3xl font-black tracking-tight">{locale === "he" ? <>מנוי אחד.<br />כל EasyCom IA.</> : <>Un seul abonnement.<br />Tout EasyCom IA.</>}</h2><p className="mt-3 max-w-lg text-sm leading-6 text-white/80">{locale === "he" ? "אפשר להתנסות בחינם; התשלום נדרש רק לפני פעולה ממשית." : "Vous explorez gratuitement ; le paiement est demandé seulement avant une action réelle."}</p></div><Badge className={`px-3 py-2 ${status.className}`}>{status.label}</Badge></div>
        {!isPaid && <div className="mt-6 grid gap-3 rounded-[1.5rem] bg-white p-4 text-slate-950 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-violet-700">{locale === "he" ? "הצעת היכרות" : "Offre de bienvenue"}</p><p className="mt-1 text-lg font-black">{locale === "he" ? `החודש הראשון ב־${formatPrice(billingConfig.launchPriceCents)} כולל מס` : `Premier mois à ${formatPrice(billingConfig.launchPriceCents)} TTC`}</p><p className="text-sm font-semibold text-slate-500">{locale === "he" ? `לאחר מכן ${formatPrice(billingConfig.basePriceCents)} לחודש, ללא התחייבות.` : `Puis ${formatPrice(billingConfig.basePriceCents)} TTC/mois, sans engagement.`}</p></div><Button onClick={checkout} loading={loading === "checkout"} className="min-h-11 rounded-2xl bg-[#421388] px-5 font-black text-white hover:bg-[#2f0d70]">{locale === "he" ? `התחלה ב־${formatPrice(billingConfig.launchPriceCents)}` : `Commencer à ${formatPrice(billingConfig.launchPriceCents)}`}</Button></div>}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{locale === "he" ? "מצב" : "État"}</p><p className="mt-3 text-lg font-black text-slate-950">{status.label}</p><p className="mt-1 text-sm text-slate-500">{locale === "he" ? (isPaid ? "כל התכונות זמינות." : "אין חיוב פעיל.") : (isPaid ? "Toutes les fonctions sont disponibles." : "Aucune facturation en cours.")}</p></article>
        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{locale === "he" ? "מאז" : "Depuis"}</p><p className="mt-3 text-lg font-black text-slate-950">{subscription ? formatDateTime(subscription.currentPeriodStart) : "—"}</p><p className="mt-1 text-sm text-slate-500">{locale === "he" ? "תחילת התקופה הנוכחית." : "Début de la période actuelle."}</p></article>
        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{locale === "he" ? (subscription?.cancelAtPeriodEnd ? "סיום הגישה" : "החידוש הבא") : (subscription?.cancelAtPeriodEnd ? "Fin d'accès" : "Prochain renouvellement")}</p><p className="mt-3 text-lg font-black text-slate-950">{nextDate ? formatDateTime(nextDate) : "—"}</p><p className="mt-1 text-sm text-slate-500">{locale === "he" ? (subscription?.cancelAtPeriodEnd ? "הגישה נשארת פעילה עד למועד זה." : "אפשר לשנות את החיוב בכל עת.") : (subscription?.cancelAtPeriodEnd ? "Votre accès reste actif jusque-là." : "Vous pouvez modifier ce prélèvement à tout moment.")}</p></article>
      </section>

      {community.stripeCustomerId && <section className="rounded-[1.7rem] border border-violet-100 bg-violet-50/60 p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#421388] shadow-sm"><CreditCard className="size-5" /></span><div><h3 className="font-black text-slate-950">{locale === "he" ? "ניהול התשלום" : "Gérer mon paiement"}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{locale === "he" ? "שנו את הכרטיס, הורידו חשבוניות Stripe או בטלו את המנוי בלחיצה אחת." : "Modifiez votre carte, téléchargez vos factures Stripe ou annulez votre abonnement en un clic."}</p></div></div><Button variant="outline" onClick={portal} loading={loading === "portal"} className="shrink-0 rounded-xl border-violet-200 bg-white"><ExternalLink className="size-4" />{locale === "he" ? "פתיחת Stripe" : "Ouvrir Stripe"}</Button></div></section>}

      <section className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"><ReceiptText className="size-5" /></span><div><h3 className="text-lg font-black text-slate-950">{locale === "he" ? "חשבוניות" : "Factures"}</h3><p className="text-sm text-slate-500">{locale === "he" ? "התשלומים האחרונים שלכם ב־Stripe." : "Vos derniers paiements Stripe."}</p></div></div>{invoices.length ? <div className="mt-5 divide-y divide-slate-100">{invoices.map((invoice) => <div key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"><div className="flex items-center gap-3"><FileText className="size-4 text-slate-400" /><div><p className="font-bold text-slate-800">{invoice.number ?? (locale === "he" ? "חשבונית Stripe" : "Facture Stripe")} · {formatPrice(invoice.amountPaid, invoice.currency)}</p><p className="text-xs text-slate-500">{formatDateTime(invoice.createdAt)} · {invoice.status === "paid" ? (locale === "he" ? "שולמה" : "Payée") : invoice.status ?? (locale === "he" ? "בטיפול" : "En cours")}</p></div></div>{(invoice.invoicePdf ?? invoice.hostedInvoiceUrl) && <a href={invoice.invoicePdf ?? invoice.hostedInvoiceUrl ?? "#"} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"><Download className="size-4" />{locale === "he" ? "הורדה" : "Télécharger"}</a>}</div>)}</div> : <p className="mt-5 rounded-2xl bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-500">{locale === "he" ? "אין עדיין חשבוניות. הן יופיעו כאן לאחר התשלום הראשון." : "Aucune facture pour le moment. Elles apparaîtront ici après votre premier paiement."}</p>}</section>

      <section className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-lg font-black text-slate-950">{locale === "he" ? "מה כלול" : "Ce qui est inclus"}</h3><div className="mt-4 grid gap-3 sm:grid-cols-2">{FEATURES.map((feature, index) => <div key={feature} className="flex items-center gap-2 text-sm font-semibold text-slate-700"><CheckCircle2 className="size-4 shrink-0 text-emerald-500" />{locale === "he" ? ["אוטומציות AI ללא הגבלה", "מודעות, פרסומים ושליחות", "עלון שבת מודפס ו־PDF", "אימייל, ביקורות Google ו־WhatsApp"][index] : feature}</div>)}</div></section>
      <p className="flex items-center justify-center gap-2 text-center text-xs text-slate-400"><Shield className="size-3.5" />{locale === "he" ? "תשלומים מאובטחים על ידי Stripe · ביטול בכל עת." : "Paiements sécurisés par Stripe · annulation à tout moment."}</p>
    </div>
  );
}
