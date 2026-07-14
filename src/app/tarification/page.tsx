import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Check, Clock3, CreditCard, MessageCircle, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicNavbar } from "@/components/layout/public-navbar";

export const metadata: Metadata = {
  title: "Tarification EasyCom IA - Gratuit, Pro et Business",
  description:
    "Découvrez la tarification EasyCom IA : essai gratuit, offre Pro et offre Business pour centraliser votre communication avec l'IA.",
  alternates: { canonical: "/tarification" },
};

const PLANS = [
  {
    name: "Gratuit",
    price: "0 €",
    suffix: "pour commencer",
    description: "Pour découvrir l’assistant et tester les bases avant de passer plus loin.",
    icon: Clock3,
    style: "border-slate-200 bg-white text-slate-950",
    button: "border border-slate-200 bg-white text-slate-950 hover:border-blue-200 hover:text-blue-800",
    href: "/auth/register",
    cta: "Commencer gratuitement",
    items: ["Tableau de bord et aperçu", "5 publications sociales manuelles / mois", "0 automatisation IA", "20 messages Agent IA", "WhatsApp bloqué", "Affiches limitées"],
  },
  {
    name: "Pro",
    price: "29,99 €",
    suffix: "/ mois",
    description: "Pour utiliser EasyCom IA au quotidien avec les automatisations essentielles.",
    icon: Sparkles,
    style: "border-blue-200 bg-blue-700 text-white shadow-blue-700/20",
    button: "bg-white text-blue-800 hover:bg-blue-50",
    href: "/auth/register",
    cta: "Activer Pro",
    badge: "Offre recommandée",
    items: ["WhatsApp débloqué", "Affiches illimitées", "20 publications sociales / mois", "3 automatisations IA", "50 messages Agent IA"],
  },
  {
    name: "Business",
    price: "59,99 €",
    suffix: "/ mois",
    description: "Pour les structures qui gèrent aussi emails, avis Google et volume plus élevé.",
    icon: ShieldCheck,
    style: "border-slate-800 bg-slate-950 text-white shadow-slate-900/20",
    button: "bg-blue-600 text-white hover:bg-blue-500",
    href: "/auth/register",
    cta: "Activer Business",
    badge: "Pour aller plus loin",
    items: ["WhatsApp débloqué", "Affiches illimitées", "50 publications sociales / mois", "5 automatisations IA", "Messages Agent IA illimités", "Gestion des emails", "Gestion des avis Google"],
  },
];

const INCLUDED_FEATURES = [
  "Assistant IA pour rédiger, adapter et améliorer vos messages",
  "Centralisation : WhatsApp, Instagram, Facebook, Telegram, Email et avis Google",
  "Publications, rappels et automatisations pour gagner du temps",
  "Calendrier éditorial, contenus récurrents et notifications",
  "Interface pensée pour les communautés et structures locales",
  "Accès aux évolutions produit sans complexité technique",
];

const FAQ_ITEMS = [
  { question: "Puis-je commencer sans carte bancaire ?", answer: "Oui. L’essai permet de tester les fonctionnalités principales avant de passer sur l’offre complète." },
  { question: "Puis-je changer d’offre à tout moment ?", answer: "Oui. Vous pouvez passer de Gratuit à Pro ou Business depuis la facturation." },
  { question: "Puis-je me faire accompagner ?", answer: "Oui. Le formulaire de contact permet de demander une aide à la configuration ou une offre adaptée." },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <PublicNavbar />

      <section className="border-b border-slate-200 bg-white px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-4xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-blue-700">
            <CreditCard className="size-4" />
            Tarification simple et transparente
          </p>
          <h1 className="mx-auto mt-5 max-w-4xl text-[clamp(2.3rem,7vw,4.6rem)] font-black leading-[1.02] tracking-tight">
            Choisissez l’offre qui correspond à votre rythme de communication
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            Commencez gratuitement, puis passez à l’offre adaptée quand EasyCom IA devient votre équipe de communication au quotidien.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-7xl gap-5 md:grid-cols-3">
          {PLANS.map((plan) => (
            <article key={plan.name} className={`rounded-[2rem] border p-6 text-center shadow-xl ${plan.style}`}>
              {plan.badge ? (
                <p className="mb-5 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-[0.14em]">
                  {plan.badge}
                </p>
              ) : null}
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white/15 text-current ring-1 ring-current/10">
                <plan.icon className="size-6" />
              </div>
              <h2 className="mt-5 text-2xl font-black">{plan.name}</h2>
              <p className={`mt-2 text-sm leading-6 ${plan.name === "Gratuit" ? "text-slate-600" : "text-white/80"}`}>{plan.description}</p>
              <div className="mt-6">
                <span className="text-5xl font-black">{plan.price}</span>
                <span className={`ml-2 text-sm font-bold ${plan.name === "Gratuit" ? "text-slate-500" : "text-white/70"}`}>{plan.suffix}</span>
              </div>
              <div className="mt-6 grid gap-3 text-left">
                {plan.items.map((item) => (
                  <p key={item} className={`flex items-start gap-3 text-sm font-semibold ${plan.name === "Gratuit" ? "text-slate-700" : "text-white/90"}`}>
                    <Check className="mt-0.5 size-4 shrink-0" />
                    {item}
                  </p>
                ))}
              </div>
              <Link href={plan.href} className={`mt-7 inline-flex h-12 w-full items-center justify-center rounded-full px-5 text-sm font-black transition ${plan.button}`}>
                {plan.cta}
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-blue-700">Inclus</p>
          <h2 className="mt-3 text-[clamp(1.9rem,5vw,3rem)] font-black leading-tight">Tout ce qu’il faut pour communiquer régulièrement</h2>
        </div>
        <div className="mx-auto mt-10 grid max-w-7xl gap-4 md:grid-cols-2 lg:grid-cols-3">
          {INCLUDED_FEATURES.map((feature) => (
            <div key={feature} className="rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-sm">
              <BadgeCheck className="mx-auto size-7 text-blue-700" />
              <p className="mt-4 text-sm font-bold leading-6 text-slate-700">{feature}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3">
          {[
            { icon: Zap, title: "Mise en route rapide", text: "Connectez vos canaux et laissez l’IA préparer les contenus." },
            { icon: ShieldCheck, title: "Contrôle humain", text: "L’IA propose, vous validez. Rien ne part sans votre accord." },
            { icon: MessageCircle, title: "Besoin spécifique ?", text: "Contactez-nous pour une configuration adaptée à votre structure." },
          ].map((item) => (
            <article key={item.title} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <item.icon className="mx-auto size-7 text-blue-700" />
              <h3 className="mt-4 text-xl font-black">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-blue-700">Questions fréquentes</p>
          <h2 className="mt-3 text-[clamp(1.9rem,5vw,2.75rem)] font-black">Une tarification lisible avant tout</h2>
          <div className="mt-10 grid gap-4">
            {FAQ_ITEMS.map((item) => (
              <article key={item.question} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-black">{item.question}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
