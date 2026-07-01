import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Clock3,
  CreditCard,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { PublicNavbar } from "@/components/layout/public-navbar";
import {
  DEFAULT_BILLING_CONFIG,
  FREE_LIMITS,
  formatEuroCents,
  isLaunchOfferActive,
} from "@/lib/billing";

export const metadata: Metadata = {
  title: "Tarification EasyCom IA - Offre de lancement et abonnement",
  description:
    "Découvrez la tarification EasyCom IA : essai gratuit, offre de lancement, abonnement mensuel et accompagnement pour centraliser votre communication avec l'IA.",
  alternates: { canonical: "/tarification" },
};

const config = DEFAULT_BILLING_CONFIG;
const launchIsActive = isLaunchOfferActive(config);
const activePrice = launchIsActive ? config.launchPriceCents : config.basePriceCents;

const INCLUDED_FEATURES = [
  "Assistant IA pour rédiger, adapter et améliorer vos messages",
  "Centralisation des canaux : WhatsApp, Instagram, Facebook, Telegram, Email et avis Google",
  "Publications, rappels et automatisations pour gagner du temps chaque semaine",
  "Calendrier éditorial, contenus récurrents et notifications importantes",
  "Interface pensée pour les communautés, associations et structures locales",
  "Accès aux évolutions produit sans complexité technique",
];

const TRIAL_ITEMS = [
  `${FREE_LIMITS.assistantMessages} messages assistant IA inclus`,
  `${FREE_LIMITS.posterGenerations} génération d'affiche incluse`,
  `${FREE_LIMITS.automations} automatisation active incluse`,
  `${FREE_LIMITS.socialPublications} publication sociale incluse`,
];

const FAQ_ITEMS = [
  {
    question: "Puis-je commencer sans carte bancaire ?",
    answer:
      "Oui. L'essai permet de tester les fonctionnalités principales avant de passer sur l'offre complète.",
  },
  {
    question: "L'offre de lancement est-elle limitée dans le temps ?",
    answer:
      "Oui. Elle est prévue jusqu'à la date indiquée dans les paramètres de facturation, puis le tarif standard s'applique aux nouveaux abonnements.",
  },
  {
    question: "Puis-je me faire accompagner pour configurer mon espace ?",
    answer:
      "Oui. Le formulaire de contact permet de demander une aide à la configuration ou une offre adaptée à votre structure.",
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <PublicNavbar />

      <section className="relative overflow-hidden border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,#dbeafe_0,transparent_32%),linear-gradient(180deg,#f8fafc_0%,#ffffff_72%)] px-4 py-16 sm:px-6 lg:px-8">
        <div className="absolute right-[-8rem] top-10 h-72 w-72 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-[-5rem] h-72 w-72 rounded-full bg-emerald-200/35 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-black text-blue-700 shadow-sm">
              <CreditCard className="size-4" />
              Tarification simple et transparente
            </div>

            <h1 className="mt-6 max-w-4xl text-[clamp(2.25rem,7vw,4.5rem)] font-black leading-[1.02] tracking-tight text-slate-950">
              Un abonnement pour centraliser toute votre{" "}
              <span className="text-blue-600">communication IA</span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              Essayez EasyCom IA, gardez vos messages, publications, avis et automatisations dans un même espace,
              puis passez à l&apos;offre complète quand vous voulez accélérer.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/auth/register"
                className="inline-flex h-12 items-center justify-center rounded-full bg-blue-600 px-6 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
              >
                Commencer maintenant
                <ArrowRight className="ml-2 size-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-black text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
              >
                Parler à un conseiller
              </Link>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <Clock3 className="size-6" />
              </div>
              <h2 className="mt-5 text-2xl font-black">Essai gratuit</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Idéal pour découvrir l&apos;assistant et vérifier que l&apos;outil correspond à votre quotidien.
              </p>
              <div className="mt-6">
                <span className="text-4xl font-black">0 €</span>
                <span className="ml-2 text-sm font-bold text-slate-500">pour commencer</span>
              </div>
              <div className="mt-6 grid gap-3">
                {TRIAL_ITEMS.map((item) => (
                  <p key={item} className="flex items-start gap-3 text-sm font-semibold text-slate-700">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    {item}
                  </p>
                ))}
              </div>
            </article>

            <article className="relative overflow-hidden rounded-[2rem] border border-blue-200 bg-blue-600 p-6 text-white shadow-xl shadow-blue-600/25">
              <div className="absolute right-[-3rem] top-[-3rem] h-36 w-36 rounded-full bg-white/20 blur-2xl" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-blue-50">
                  <Sparkles className="size-3.5" />
                  Offre recommandée
                </div>
                <h2 className="mt-5 text-2xl font-black">EasyCom IA Pro</h2>
                <p className="mt-2 text-sm leading-6 text-blue-50">
                  Pour utiliser EasyCom IA au quotidien avec les fonctionnalités avancées et les automatisations.
                </p>
                <div className="mt-6">
                  <span className="text-5xl font-black">{formatEuroCents(activePrice)}</span>
                  <span className="ml-2 text-sm font-bold text-blue-100">/ mois HT</span>
                </div>
                {launchIsActive ? (
                  <p className="mt-3 text-sm font-bold text-blue-50">
                    Prix standard : {formatEuroCents(config.basePriceCents)} / mois HT.
                  </p>
                ) : null}
                <Link
                  href="/auth/register"
                  className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-white px-5 text-sm font-black text-blue-700 transition hover:bg-blue-50"
                >
                  Activer l&apos;offre
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-blue-600">Inclus</p>
            <h2 className="mt-3 text-[clamp(1.75rem,5vw,2.75rem)] font-black leading-tight tracking-tight">
              Tout ce qu&apos;il faut pour communiquer régulièrement, sans usine à gaz.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              La tarification est pensée pour rester lisible : vous commencez gratuitement, puis vous passez à
              l&apos;abonnement quand EasyCom IA devient votre copilote quotidien.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {INCLUDED_FEATURES.map((feature) => (
              <div key={feature} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
                  <BadgeCheck className="size-5" />
                </div>
                <p className="text-sm font-bold leading-6 text-slate-700">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <Zap className="size-7 text-amber-500" />
            <h3 className="mt-4 text-xl font-black">Mise en route rapide</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Connectez vos canaux, ajoutez vos habitudes de communication, puis laissez l&apos;IA préparer les contenus.
            </p>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <ShieldCheck className="size-7 text-emerald-600" />
            <h3 className="mt-4 text-xl font-black">Contrôle humain</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              L&apos;IA propose, vous validez. Vos publications et messages restent sous votre contrôle.
            </p>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <MessageCircle className="size-7 text-blue-600" />
            <h3 className="mt-4 text-xl font-black">Besoin spécifique ?</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Une structure plus grande ou plusieurs espaces à gérer ? Contactez-nous pour une configuration adaptée.
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-blue-600">Questions fréquentes</p>
            <h2 className="mt-3 text-[clamp(1.75rem,5vw,2.5rem)] font-black tracking-tight">
              Une tarification lisible avant tout
            </h2>
          </div>

          <div className="mt-10 grid gap-4">
            {FAQ_ITEMS.map((item) => (
              <article key={item.question} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-black text-slate-950">{item.question}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
