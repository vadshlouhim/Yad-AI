import Link from "next/link";
import Image from "next/image";
import {
  CheckCircle2,
  ArrowRight,
  MessageCircle,
  Zap,
  UserCheck,
  Smartphone,
  BarChart3,
} from "lucide-react";

const STEPS = [
  {
    number: "01",
    title: "Profil & Contexte",
    description: "Nous définissons qui vous êtes, vos cibles et votre ton de voix unique.",
    icon: UserCheck,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    number: "02",
    title: "Connexion des Canaux",
    description: "Liez WhatsApp, Instagram, Facebook et vos emails en quelques secondes.",
    icon: Smartphone,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    number: "03",
    title: "Apprentissage IA",
    description: "L'IA analyse vos anciens contenus pour comprendre votre style.",
    icon: Zap,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    number: "04",
    title: "Première Demande",
    description: "Décrivez ce que vous voulez publier ou le rappel à créer.",
    icon: MessageCircle,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  {
    number: "05",
    title: "Validation & Ajustement",
    description: "Relisez la proposition de l'IA et demandez des modifications si besoin.",
    icon: CheckCircle2,
    color: "text-cyan-600",
    bg: "bg-cyan-50",
  },
  {
    number: "06",
    title: "Diffusion & Analyse",
    description: "Publiez en un clic et suivez l'impact sur votre communauté.",
    icon: BarChart3,
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
];

export default function MethodPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/easycom-ai-logo.png" alt="Logo" width={32} height={32} className="rounded-lg" />
            <span className="font-black text-slate-950">EasyCom AI</span>
          </Link>
          <nav className="hidden gap-8 md:flex">
            <Link href="/features" className="text-sm font-bold text-slate-600 transition hover:text-blue-600">Fonctionnalités</Link>
            <Link href="/method" className="text-sm font-bold text-blue-600">Méthode</Link>
            <Link href="/blog" className="text-sm font-bold text-slate-600 transition hover:text-blue-600">Blog</Link>
            <Link href="/contact" className="text-sm font-bold text-slate-600 transition hover:text-blue-600">Contact</Link>
          </nav>
          <Link href="/auth/login" className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700">
            Connexion
          </Link>
        </div>
      </header>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto mb-20 max-w-4xl text-center">
          <p className="mb-4 text-sm font-black uppercase tracking-widest text-blue-600">Notre Méthode</p>
          <h1 className="mb-6 text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">
            Une mise en place rapide, une IA qui apprend de vous, et une communication qui tourne enfin à plein régime
          </h1>
        </div>

        <div className="mx-auto mb-14 max-w-5xl rounded-3xl border border-slate-200 bg-gradient-to-r from-blue-50 via-white to-emerald-50 p-6 sm:p-8">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { t: "1. Connexion rapide", d: "Branchez vos canaux et vos sources en quelques minutes.", c: "bg-blue-600" },
              { t: "2. IA qui apprend", d: "L'IA observe vos retours et affine automatiquement ses propositions.", c: "bg-emerald-600" },
              { t: "3. Diffusion continue", d: "Vos contenus sortent au bon moment, sur les bons canaux.", c: "bg-amber-500" },
            ].map((item, i) => (
              <div
                key={item.t}
                className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 animate-pulse ${
                  i === 0 ? "[animation-delay:0ms]" : i === 1 ? "[animation-delay:220ms]" : "[animation-delay:440ms]"
                }`}
              >
                <div className={`mb-3 h-1.5 w-12 rounded-full ${item.c}`} />
                <p className="text-sm font-black text-slate-900">{item.t}</p>
                <p className="mt-1.5 text-sm text-slate-600">{item.d}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.number} className="group relative rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="mb-6 flex items-center justify-between">
                <div className={`rounded-2xl p-4 ${step.bg}`}>
                  <step.icon className={`size-6 ${step.color}`} />
                </div>
                <span className="text-4xl font-black text-slate-100 transition group-hover:text-slate-200">{step.number}</span>
              </div>
              <h3 className="mb-3 text-xl font-black text-slate-950">{step.title}</h3>
              <p className="leading-relaxed text-slate-600">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden bg-slate-950 px-4 py-20 text-white sm:px-6 lg:px-8">
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <h2 className="mb-6 text-3xl font-black">Pourquoi notre méthode fonctionne ?</h2>
              <div className="space-y-8">
                {[
                  { t: "Adaptation Totale", d: "Contrairement aux outils génériques, notre IA est configurée spécifiquement pour votre métier et votre ton." },
                  { t: "Gain de temps immédiat", d: "Dès la première semaine, nos clients économisent en moyenne 8 à 12 heures de travail manuel." },
                  { t: "Cohérence Multi-canal", d: "Un seul message, décliné parfaitement pour chaque réseau social sans effort supplémentaire." },
                ].map((item) => (
                  <div key={item.t} className="flex gap-4">
                    <div className="mt-1 h-6 w-6 flex-shrink-0 rounded-full bg-blue-600" />
                    <div>
                      <p className="mb-1 text-lg font-black">{item.t}</p>
                      <p className="text-slate-400">{item.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
              <h3 className="mb-8 text-center text-xl font-black">FAQ Méthode</h3>
              <div className="space-y-6">
                {[
                  { q: "Combien de temps prend la configuration ?", a: "Moins de 10 minutes pour les étapes de base. L'IA continue ensuite d'apprendre chaque jour de vos interactions." },
                  { q: "Puis-je changer mon profil plus tard ?", a: "Bien sûr. Votre espace de paramètres vous permet de faire évoluer votre ton de voix ou vos objectifs à tout moment." },
                  { q: "L'IA publie-t-elle sans mon accord ?", a: "Jamais. Vous gardez le contrôle total : l'IA propose, vous validez ou modifiez avant chaque envoi." },
                ].map((faq) => (
                  <div key={faq.q} className="border-b border-white/10 pb-6 last:border-0 last:pb-0">
                    <p className="mb-2 font-bold text-blue-400">{faq.q}</p>
                    <p className="text-sm text-slate-300">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="px-4 py-20 text-center">
        <h2 className="mb-8 text-3xl font-black">Prêt à simplifier votre communication ?</h2>
        <Link href="/auth/login" className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-10 py-5 font-black text-white shadow-xl shadow-blue-600/20 transition hover:bg-blue-700">
          Créer mon compte gratuitement <ArrowRight className="size-5" />
        </Link>
      </footer>
    </main>
  );
}
