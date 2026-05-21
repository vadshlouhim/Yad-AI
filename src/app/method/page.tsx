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
  Globe
} from "lucide-react";

const STEPS = [
  {
    number: "01",
    title: "Profil & Contexte",
    description: "Nous définissons qui vous êtes, vos cibles et votre ton de voix unique.",
    icon: UserCheck,
    color: "text-blue-600",
    bg: "bg-blue-50"
  },
  {
    number: "02",
    title: "Connexion des Canaux",
    description: "Liez WhatsApp, Instagram, Facebook et vos emails en quelques secondes.",
    icon: Smartphone,
    color: "text-emerald-600",
    bg: "bg-emerald-50"
  },
  {
    number: "03",
    title: "Apprentissage IA",
    description: "L'IA analyse vos anciens contenus pour comprendre votre style.",
    icon: Zap,
    color: "text-amber-600",
    bg: "bg-amber-50"
  },
  {
    number: "04",
    title: "Première Demande",
    description: "Décrivez ce que vous voulez publier ou le rappel à créer.",
    icon: MessageCircle,
    color: "text-indigo-600",
    bg: "bg-indigo-50"
  },
  {
    number: "05",
    title: "Validation & Ajustement",
    description: "Relisez la proposition de l'IA et demandez des modifications si besoin.",
    icon: CheckCircle2,
    color: "text-cyan-600",
    bg: "bg-cyan-50"
  },
  {
    number: "06",
    title: "Diffusion & Analyse",
    description: "Publiez en un clic et suivez l'impact sur votre communauté.",
    icon: BarChart3,
    color: "text-violet-600",
    bg: "bg-violet-50"
  }
];

export default function MethodPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/easycom-ai-logo.png" alt="Logo" width={32} height={32} className="rounded-lg" />
            <span className="font-black text-slate-950">EasyCom AI</span>
          </Link>
          <nav className="hidden gap-8 md:flex">
            <Link href="/features" className="text-sm font-bold text-slate-600 hover:text-blue-600 transition">Fonctionnalités</Link>
            <Link href="/method" className="text-sm font-bold text-blue-600">Méthode</Link>
            <Link href="/blog" className="text-sm font-bold text-slate-600 hover:text-blue-600 transition">Blog</Link>
            <Link href="/contact" className="text-sm font-bold text-slate-600 hover:text-blue-600 transition">Contact</Link>
          </nav>
          <Link href="/auth/login" className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 transition">
            Connexion
          </Link>
        </div>
      </header>

      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center mb-20">
          <p className="text-blue-600 font-black uppercase tracking-widest text-sm mb-4">Notre Méthode</p>
          <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-6xl mb-6">
            Passez du chaos à la <span className="text-blue-600">clarté</span> en 6 étapes.
          </h1>
          <p className="text-lg text-slate-600">
            Une mise en place rapide, une IA qui apprend de vous, et une communication qui tourne enfin à plein régime.
          </p>
        </div>

        <div className="mx-auto max-w-7xl grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.number} className="relative group rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition hover:shadow-xl hover:-translate-y-1">
              <div className="flex items-center justify-between mb-6">
                <div className={`p-4 rounded-2xl ${step.bg}`}>
                  <step.icon className={`size-6 ${step.color}`} />
                </div>
                <span className="text-4xl font-black text-slate-100 group-hover:text-slate-200 transition">{step.number}</span>
              </div>
              <h3 className="text-xl font-black text-slate-950 mb-3">{step.title}</h3>
              <p className="text-slate-600 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-950 py-20 px-4 sm:px-6 lg:px-8 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full" />
        <div className="mx-auto max-w-7xl relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-black mb-6">Pourquoi notre méthode fonctionne ?</h2>
              <div className="space-y-8">
                {[
                  { t: "Adaptation Totale", d: "Contrairement aux outils génériques, notre IA est configurée spécifiquement pour VOTRE métier et votre ton." },
                  { t: "Gain de temps immédiat", d: "Dès la première semaine, nos clients économisent en moyenne 8 à 12 heures de travail manuel." },
                  { t: "Cohérence Multi-canal", d: "Un seul message, décliné parfaitement pour chaque réseau social sans effort supplémentaire." }
                ].map(item => (
                  <div key={item.t} className="flex gap-4">
                    <div className="h-6 w-6 rounded-full bg-blue-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-black text-lg mb-1">{item.t}</p>
                      <p className="text-slate-400">{item.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur">
              <h3 className="text-xl font-black mb-8 text-center">FAQ Méthode</h3>
              <div className="space-y-6">
                {[
                  { q: "Combien de temps prend la configuration ?", a: "Moins de 10 minutes pour les étapes de base. L'IA continue ensuite d'apprendre chaque jour de vos interactions." },
                  { q: "Puis-je changer mon profil plus tard ?", a: "Bien sûr. Votre espace de paramètres vous permet de faire évoluer votre ton de voix ou vos objectifs à tout moment." },
                  { q: "L'IA publie-t-elle sans mon accord ?", a: "Jamais. Vous gardez le contrôle total : l'IA propose, vous validez ou modifiez avant chaque envoi." }
                ].map(faq => (
                  <div key={faq.q} className="border-b border-white/10 pb-6 last:border-0 last:pb-0">
                    <p className="font-bold text-blue-400 mb-2">{faq.q}</p>
                    <p className="text-sm text-slate-300">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-20 px-4 text-center">
        <h2 className="text-3xl font-black mb-8">Prêt à simplifier votre communication ?</h2>
        <Link href="/auth/login" className="inline-flex items-center gap-2 bg-blue-600 text-white px-10 py-5 rounded-full font-black shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition">
          Créer mon compte gratuitement <ArrowRight className="size-5" />
        </Link>
      </footer>
    </main>
  );
}
