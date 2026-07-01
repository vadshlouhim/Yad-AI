import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PublicFooter } from "@/components/layout/public-footer";
import {
  ArrowRight,
  Home,
  CheckCircle2,
  DatabaseZap,
  MessageCircle,
  Send,
  SlidersHorizontal,
  Sparkles,
  UserCheck,
} from "lucide-react";

const STEPS = [
  {
    number: "01",
    title: "Profil & contexte",
    description: "Nous définissons qui vous êtes, vos cibles, vos canaux et votre ton de voix unique.",
    icon: UserCheck,
    tone: "border-blue-200 bg-blue-50 text-blue-700",
    line: "bg-blue-600",
  },
  {
    number: "02",
    title: "Centralisez tout",
    description: "Réseaux sociaux, emails, avis Google, contacts, ressources et événements sont réunis dans un seul espace intelligent.",
    icon: DatabaseZap,
    tone: "border-violet-200 bg-violet-50 text-violet-700",
    line: "bg-violet-600",
  },
  {
    number: "03",
    title: "L’IA prépare vos actions",
    description: "Publications réseaux, messages, emails, avis Google, ressources et clips vidéo sont préparés avec l’aide de l’IA.",
    icon: Sparkles,
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    line: "bg-emerald-600",
  },
  {
    number: "04",
    title: "Vous validez ou automatisez",
    description: "Publiez, envoyez, répondez ou partagez en un clic — avec validation ou automatisation selon vos paramètres.",
    icon: Send,
    tone: "border-amber-200 bg-amber-50 text-amber-700",
    line: "bg-amber-500",
  },
];

const METHOD_POINTS = [
  {
    title: "Une IA qui s’adapte à vous",
    description: "EasyCom IA apprend votre métier, votre ton, vos habitudes et vos préférences pour créer une communication qui vous ressemble.",
  },
  {
    title: "Toute votre communication centralisée",
    description: "Réseaux sociaux, emails, avis Google, messages, ressources et événements sont réunis dans un seul espace intelligent.",
  },
  {
    title: "Des actions prêtes à envoyer",
    description: "L’IA prépare vos publications, réponses, messages, rappels et contenus, puis vous choisissez de valider ou d’automatiser.",
  },
  {
    title: "Une communication régulière sans effort",
    description: "EasyCom IA vous aide à rester visible avec des publications et automatisations programmées au bon moment.",
  },
  {
    title: "Un gain de temps immédiat",
    description: "Moins de tâches manuelles, moins d’oublis, plus de réactivité : vous communiquez mieux, plus vite et plus simplement.",
  },
];

export const metadata: Metadata = {
  title: "Notre méthode",
  description:
    "Découvrez comment EasyCom IA accompagne les communautés juives, synagogues et Beth Habad pour préparer, planifier et diffuser leur communication avec l'intelligence artificielle.",
  alternates: { canonical: "/method" },
};

export default function MethodPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/easycom-ai-logo.png" alt="Logo EasyCom IA" width={32} height={32} className="rounded-lg" />
            <div className="leading-tight">
              <p className="font-black text-slate-950">EasyCom IA</p>
              <p className="text-xs font-medium text-slate-500">Votre assistant communication IA</p>
            </div>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 md:flex">
            <Link href="/" className="inline-flex h-9 items-center gap-2 rounded-full px-1 transition hover:text-blue-700">
              <Home className="size-4" />
              Accueil
            </Link>
            <Link href="/method" className="inline-flex h-9 items-center gap-2 rounded-full px-1 text-blue-700">
              <CheckCircle2 className="size-4" />
              Notre Méthode
            </Link>
            <Link href="/contact" className="inline-flex h-9 items-center gap-2 rounded-full px-1 transition hover:text-indigo-700">
              <MessageCircle className="size-4" />
              Contact
            </Link>
          </nav>
          <Link href="/auth/login" className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700">
            Connexion
          </Link>
        </div>
      </header>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-4xl text-center">
          <p className="mb-4 text-sm font-black uppercase tracking-widest text-blue-600">Notre Méthode</p>
          <h1 className="mb-6 text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">
            Une mise en place rapide, une IA qui apprend de vous, et une{" "}
            <span className="text-blue-600">communication qui tourne enfin à plein régime</span>
          </h1>
        </div>

        <div className="mx-auto mb-14 max-w-5xl rounded-3xl border border-slate-200 bg-gradient-to-r from-blue-50 via-white to-emerald-50 p-6 sm:p-8">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { title: "Centralisation", text: "Tous vos canaux et contenus réunis dans un espace clair.", line: "bg-blue-600" },
              { title: "Préparation IA", text: "L’IA prépare les messages, réponses et publications à votre place.", line: "bg-violet-600" },
              { title: "Validation simple", text: "Vous gardez le contrôle : validation en un clic ou automatisation.", line: "bg-emerald-600" },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className={`mb-3 h-1.5 w-12 rounded-full ${item.line}`} />
                <p className="text-sm font-black text-slate-900">{item.title}</p>
                <p className="mt-1.5 text-sm text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-4">
          {STEPS.map((step) => (
            <div key={step.number} className={`rounded-3xl border bg-white p-6 shadow-sm ${step.tone}`}>
              <div className={`mb-5 h-1.5 w-12 rounded-full ${step.line}`} />
              <div className="mb-5 flex items-center justify-between">
                <div className={`rounded-2xl border bg-white p-3 ${step.tone}`}>
                  <step.icon className="size-6" />
                </div>
                <span className="text-3xl font-black opacity-25">{step.number}</span>
              </div>
              <h3 className="mb-3 text-lg font-black">{step.title}</h3>
              <p className="text-sm leading-6 text-slate-600">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden bg-slate-950 px-4 py-20 text-white sm:px-6 lg:px-8">
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1fr_0.82fr]">
          <div>
            <h2 className="mb-8 text-3xl font-black sm:text-4xl">
              Pourquoi notre méthode est véritablement révolutionnaire
            </h2>
            <div className="space-y-6">
              {METHOD_POINTS.map((item) => (
                <div key={item.title} className="flex gap-4">
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600">
                    <CheckCircle2 className="size-4" />
                  </div>
                  <div>
                    <p className="mb-1 text-lg font-black">{item.title}</p>
                    <p className="leading-7 text-slate-300">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-blue-500/15 p-3 text-blue-300">
                <SlidersHorizontal className="size-6" />
              </div>
              <div>
                <h3 className="text-xl font-black">Votre contrôle reste central</h3>
                <p className="text-sm text-slate-400">Validation, automatisation, ton et délai restent configurables.</p>
              </div>
            </div>
            <div className="space-y-3">
              {["Messages préparés par l’IA", "Canaux centralisés", "Validation en un clic", "Automatisations au bon moment"].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 text-center">
        <h2 className="mb-8 text-3xl font-black">Prêt à simplifier votre communication ?</h2>
        <Link href="/auth/login" className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-10 py-5 font-black text-white shadow-xl shadow-blue-600/20 transition hover:bg-blue-700">
          Créer mon compte gratuitement <ArrowRight className="size-5" />
        </Link>
      </section>

      <PublicFooter />
    </main>
  );
}
