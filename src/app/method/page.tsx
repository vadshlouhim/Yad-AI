import type { Metadata } from "next";
import Link from "next/link";
import { HeroAnimation } from "@/components/home/hero-animation";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicNavbar } from "@/components/layout/public-navbar";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  DatabaseZap,
  Inbox,
  LogIn,
  Megaphone,
  Send,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";

const STEPS = [
  { number: "01", title: "Votre contexte", description: "On pose vos canaux, votre ton, vos habitudes et les publics à informer.", icon: UserCheck, tone: "border-blue-200 bg-blue-50 text-blue-800", line: "bg-blue-700" },
  { number: "02", title: "Tout au même endroit", description: "Réseaux, emails, avis, contacts, ressources et événements sont centralisés.", icon: DatabaseZap, tone: "border-violet-200 bg-violet-50 text-violet-800", line: "bg-violet-600" },
  { number: "03", title: "Les agents préparent", description: "Chaque agent IA prend son sujet et prépare des actions prêtes à valider.", icon: Sparkles, tone: "border-emerald-200 bg-emerald-50 text-emerald-800", line: "bg-emerald-600" },
  { number: "04", title: "Vous validez", description: "Vous publiez, envoyez, automatisez ou ajustez en gardant le contrôle.", icon: Send, tone: "border-amber-200 bg-amber-50 text-amber-800", line: "bg-amber-500" },
];

const METHOD_POINTS = [
  "Une IA qui apprend votre ton et votre manière de communiquer.",
  "Une organisation simple pour ne plus courir entre les outils.",
  "Des contenus prêts à publier, relire ou automatiser.",
  "Une communication régulière, même pendant les semaines chargées.",
];

const COMMUNICATION_CARDS = [
  { label: "Publications automatisées", description: "Vos posts et rappels récurrents restent prêts au bon moment.", icon: Megaphone, tone: "border-blue-200 text-blue-900 bg-blue-50", line: "bg-gradient-to-r from-blue-950 via-blue-800 to-cyan-600" },
  { label: "Communication centralisée", description: "Facebook, Instagram, WhatsApp, emails et avis dans un seul espace.", icon: Inbox, tone: "border-violet-200 text-violet-800 bg-violet-50", line: "bg-violet-600" },
  { label: "Réponses intelligentes", description: "L’IA prépare des réponses utiles, vous gardez le dernier mot.", icon: Sparkles, tone: "border-emerald-200 text-emerald-800 bg-emerald-50", line: "bg-emerald-600" },
];

export const metadata: Metadata = {
  title: "Notre méthode",
  description:
    "Découvrez comment EasyCom IA aide les communautés, associations et structures locales à centraliser, préparer et automatiser leur communication.",
  alternates: { canonical: "/method" },
};

export default function MethodPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <PublicNavbar />

      <section className="border-b border-slate-200 bg-white px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-blue-700">Notre méthode</p>
          <h1 className="mt-4 text-[clamp(2.35rem,7vw,4.7rem)] font-black leading-[1.02] tracking-tight">
            Une méthode claire pour faire avancer toute votre communication
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            EasyCom IA transforme vos idées, événements et messages importants en actions organisées, prêtes à publier ou à automatiser.
          </p>
          <div className="mt-8 flex justify-center">
            <Link href="/auth/login" className="inline-flex h-12 items-center justify-center rounded-full bg-blue-700 px-7 text-sm font-black text-white shadow-lg shadow-blue-900/20 transition hover:bg-blue-800">
              Démarrer maintenant <ArrowRight className="ml-2 size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-14 text-center sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <article key={step.number} className={`rounded-3xl border bg-white p-6 shadow-sm ${step.tone}`}>
              <div className={`mx-auto mb-5 h-1.5 w-12 rounded-full ${step.line}`} />
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border bg-white shadow-sm">
                <step.icon className="size-6" />
              </div>
              <p className="mt-5 text-3xl font-black opacity-25">{step.number}</p>
              <h2 className="mt-2 text-lg font-black">{step.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-slate-200 bg-white">
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-blue-50 to-white" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 text-center sm:px-6 lg:grid-cols-[1fr_0.92fr] lg:px-8 lg:py-20">
          <div className="flex flex-col items-center justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 px-3 py-1.5 text-xs font-black text-blue-900">
              <Bot className="size-4" />
              Une équipe d&apos;agents IA à vos côtés
            </div>
            <h2 className="mt-5 max-w-3xl text-[clamp(2rem,8vw,3.75rem)] font-black leading-[1.04] tracking-tight">
              Votre communication avance, <span className="bg-gradient-to-r from-blue-950 via-blue-800 to-cyan-600 bg-clip-text text-transparent">même quand vous êtes occupé</span>
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              Les agents préparent vos contenus, organisent vos automatisations, suivent vos emails et vos avis, puis vous aident à publier sur les bons canaux.
            </p>
            <div className="mt-8 grid max-w-2xl gap-4 sm:grid-cols-3">
              {COMMUNICATION_CARDS.map(({ label, description, icon: Icon, tone, line }) => (
                <article key={label} className={`rounded-2xl border bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${tone}`}>
                  <div className={`mx-auto mb-4 h-1 w-12 rounded-full ${line}`} />
                  <div className={`mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl border bg-white ${tone}`}>
                    <Icon className="size-5" />
                  </div>
                  <h3 className="text-sm font-black">{label}</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-600">{description}</p>
                </article>
              ))}
            </div>
            <Link href="/auth/login" className="animate-home-shimmer mt-8 inline-flex h-12 items-center justify-center rounded-full bg-[linear-gradient(110deg,#172554,#1e3a8a,#2563eb,#1e3a8a,#172554)] bg-[length:220%_100%] px-7 text-sm font-bold text-white shadow-lg shadow-blue-950/30">
              <LogIn className="mr-2 size-4" />
              Essayer maintenant
            </Link>
          </div>
          <div className="relative flex items-center">
            <HeroAnimation />
          </div>
        </div>
      </section>

      <section className="bg-slate-950 px-4 py-16 text-center text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-blue-300">Pourquoi ça change tout</p>
          <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-black sm:text-4xl">
            Une méthode pensée pour les équipes qui ont peu de temps, mais beaucoup à communiquer
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {METHOD_POINTS.map((point) => (
              <div key={point} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <CheckCircle2 className="mx-auto size-7 text-blue-300" />
                <p className="mt-4 text-sm font-semibold leading-7 text-slate-200">{point}</p>
              </div>
            ))}
          </div>
          <div className="mx-auto mt-8 max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-6">
            <ShieldCheck className="mx-auto size-8 text-emerald-300" />
            <h3 className="mt-4 text-xl font-black">Votre contrôle reste central</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              L’IA propose, vous validez. Le ton, les délais, les canaux et le niveau d’automatisation restent entre vos mains.
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-black">Prêt à simplifier votre communication ?</h2>
        <Link href="/auth/login" className="mt-8 inline-flex items-center gap-2 rounded-full bg-blue-700 px-8 py-4 font-black text-white shadow-xl shadow-blue-600/20 transition hover:bg-blue-800">
          Créer mon compte gratuitement <ArrowRight className="size-5" />
        </Link>
      </section>

      <PublicFooter />
    </main>
  );
}
