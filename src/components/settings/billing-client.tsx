"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, CreditCard, ExternalLink, Shield, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import type { BillingConfig } from "@/lib/billing";
import { createBillingPortal, createSubscriptionCheckout } from "@/lib/billing/checkout-client";

interface Community { plan: string; stripeCustomerId: string | null; planExpiresAt: Date | null; }
interface Subscription { id: string; plan: string; status: string; currentPeriodEnd: Date; cancelAtPeriodEnd: boolean; trialEnd: Date | null; }
interface Props { community: Community; subscription: Subscription | null; billingConfig: BillingConfig; }

const FEATURES = ["Automatisations IA sans limite", "Affiches, publications et envois", "Newsletter papier Chabbat et PDF", "Email, avis Google et WhatsApp"];

function formatPrice(cents: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(cents / 100);
}

export function BillingClient({ community, subscription, billingConfig }: Props) {
  const [loading, setLoading] = useState<"checkout" | "portal" | null>(null);
  const isPaid = community.plan !== "FREE_TRIAL";

  async function checkout() {
    setLoading("checkout");
    try {
      const url = await createSubscriptionCheckout({ tier: "PROFESSIONAL", applyLaunchOffer: true, successUrl: `${window.location.origin}/dashboard/settings/billing?success=true`, cancelUrl: window.location.href });
      window.location.assign(url);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Impossible d'ouvrir le paiement.");
      setLoading(null);
    }
  }

  async function portal() {
    setLoading("portal");
    try { window.location.assign(await createBillingPortal(window.location.href)); }
    catch (error) { alert(error instanceof Error ? error.message : "Impossible d'ouvrir la facturation."); setLoading(null); }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-3 pb-10 pt-3 sm:px-6 md:py-6">
      <div className="hidden items-center gap-3 md:flex"><Link href="/dashboard/settings"><Button variant="ghost" size="sm"><ArrowLeft className="size-4" />Paramètres</Button></Link><div><h1 className="text-2xl font-black text-slate-950">Abonnement</h1><p className="mt-1 text-sm text-slate-500">Une offre simple, sans engagement.</p></div></div>
      <section className="overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_90%_10%,#8b5cf6_0%,transparent_29%),linear-gradient(135deg,#140735,#421388_55%,#075ce5)] p-5 text-white shadow-[0_24px_58px_-30px_rgba(66,19,136,0.75)] sm:p-7">
        <div className="flex items-start justify-between gap-4"><div><div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-black"><Sparkles className="size-3.5" />EASYCOM IA</div><h2 className="mt-4 text-3xl font-black tracking-tight">Tout EasyCom IA.<br />Un seul tarif.</h2><p className="mt-3 max-w-lg text-sm leading-6 text-white/80">Explorez librement l’application. Le paiement est demandé uniquement lorsque vous lancez une action réelle.</p></div><CreditCard className="size-9 shrink-0 text-white/85" /></div>
        <div className="mt-6 grid gap-3 rounded-[1.5rem] bg-white p-4 text-slate-950 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-violet-700">Offre de bienvenue</p><p className="mt-1 text-lg font-black">Premier mois à {formatPrice(billingConfig.launchPriceCents)} TTC</p><p className="text-sm font-semibold text-slate-500">au lieu de {formatPrice(billingConfig.basePriceCents)} TTC, puis {formatPrice(billingConfig.basePriceCents)} TTC/mois.</p></div>{isPaid ? <Badge variant="published" className="justify-center px-3 py-2">Abonnement actif</Badge> : <Button onClick={checkout} loading={loading === "checkout"} className="min-h-11 rounded-2xl bg-[#421388] px-5 font-black text-white hover:bg-[#2f0d70]">Commencer à 8,99 €</Button>}</div>
      </section>
      {subscription && <section className="rounded-[1.5rem] border border-blue-100 bg-blue-50 p-4 text-sm text-slate-700"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-black text-slate-950">EasyCom IA <Badge variant="published" className="ml-2">Actif</Badge></p><p className="mt-1">{subscription.cancelAtPeriodEnd ? `Se termine le ${formatDateTime(subscription.currentPeriodEnd)}` : `Renouvellement le ${formatDateTime(subscription.currentPeriodEnd)}`}</p></div>{community.stripeCustomerId && <Button variant="outline" onClick={portal} loading={loading === "portal"} className="rounded-xl"><ExternalLink className="size-4" />Gérer l’abonnement</Button>}</div></section>}
      <section className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-lg font-black text-slate-950">Ce qui est inclus</h3><div className="mt-4 grid gap-3 sm:grid-cols-2">{FEATURES.map((feature) => <div key={feature} className="flex items-center gap-2 text-sm font-semibold text-slate-700"><CheckCircle2 className="size-4 shrink-0 text-emerald-500" />{feature}</div>)}</div></section>
      {!isPaid && <p className="rounded-2xl bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-800">Vous pouvez parcourir toutes les pages gratuitement. L’abonnement est demandé seulement avant une génération, publication, envoi ou automatisation.</p>}
      <p className="flex items-center justify-center gap-2 text-center text-xs text-slate-400"><Shield className="size-3.5" />Paiements sécurisés par Stripe · annulation à tout moment.</p>
    </div>
  );
}
