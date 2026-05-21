import Link from "next/link";
import Image from "next/image";
import { 
  Share2, 
  Bot, 
  PenLine, 
  MessageCircle, 
  ImageIcon, 
  CalendarDays,
  CheckCircle2,
  LogIn,
  ArrowRight
} from "lucide-react";

const FEATURE_DETAILS = [
  {
    title: "Gestion des réseaux sociaux",
    description: "Pilotez WhatsApp, Instagram, Facebook, Telegram et email depuis un seul espace.",
    details: [
      "Publication multi-canaux simultanée",
      "Centralisation des messages entrants",
      "Statistiques de performance par canal",
      "Planification de posts sur 30 jours"
    ],
    icon: Share2,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-100"
  },
  {
    title: "Assistant IA personnalisé",
    description: "Un agent qui connaît votre ton, vos valeurs et votre historique.",
    details: [
      "Apprentissage continu de votre style",
      "Génération de réponses intelligentes",
      "Rédaction de newsletters et annonces",
      "Traduction automatique multilingue"
    ],
    icon: Bot,
    color: "text-cyan-600",
    bg: "bg-cyan-50",
    border: "border-cyan-100"
  },
  {
    title: "Banque visuelle Intelligente",
    description: "Centralisez et générez vos supports de communication.",
    details: [
      "Stockage cloud sécurisé",
      "Génération d'images par IA",
      "Modèles d'affiches personnalisables",
      "Recherche par mots-clés intelligents"
    ],
    icon: ImageIcon,
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-100"
  }
];

export default function FeaturesPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      {/* Header simple */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/easycom-ai-logo.png" alt="Logo" width={32} height={32} className="rounded-lg" />
            <span className="font-black text-slate-950">EasyCom AI</span>
          </Link>
          <nav className="hidden gap-8 md:flex">
            <Link href="/features" className="text-sm font-bold text-blue-600">Fonctionnalités</Link>
            <Link href="/method" className="text-sm font-bold text-slate-600 hover:text-blue-600 transition">Méthode</Link>
            <Link href="/blog" className="text-sm font-bold text-slate-600 hover:text-blue-600 transition">Blog</Link>
            <Link href="/contact" className="text-sm font-bold text-slate-600 hover:text-blue-600 transition">Contact</Link>
          </nav>
          <Link href="/auth/login" className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 transition">
            Connexion
          </Link>
        </div>
      </header>

      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center mb-16">
          <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-6xl mb-6">
            Tout ce dont vous avez besoin pour <span className="text-blue-600">rayonner</span>.
          </h1>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto">
            EasyCom AI regroupe les outils de communication les plus puissants dans une interface unique et intuitive.
          </p>
        </div>

        <div className="mx-auto max-w-7xl grid gap-12">
          {FEATURE_DETAILS.map((f, i) => (
            <div key={f.title} className={`flex flex-col gap-12 items-center ${i % 2 === 1 ? 'md:flex-row-reverse' : 'md:flex-row'}`}>
              <div className="flex-1 space-y-6">
                <div className={`inline-flex p-3 rounded-2xl ${f.bg} ${f.border} border`}>
                  <f.icon className={`size-8 ${f.color}`} />
                </div>
                <h2 className="text-3xl font-black text-slate-950">{f.title}</h2>
                <p className="text-slate-600 text-lg">{f.description}</p>
                <ul className="space-y-4">
                  {f.details.map(detail => (
                    <li key={detail} className="flex items-center gap-3 text-slate-700 font-medium">
                      <CheckCircle2 className="size-5 text-emerald-500" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 w-full aspect-video rounded-3xl bg-slate-100 border border-slate-200 shadow-inner flex items-center justify-center">
                <p className="text-slate-400 font-bold italic">[Aperçu interface {f.title}]</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-black text-center mb-12">FAQ Fonctionnalités</h2>
          <div className="space-y-4">
            {[
              { q: "Puis-je connecter plusieurs comptes WhatsApp ?", a: "Oui, notre solution permet de gérer plusieurs canaux de communication au sein du même tableau de bord." },
              { q: "L'IA peut-elle apprendre mon style d'écriture ?", a: "C'est sa spécialité. Plus vous l'utilisez, plus elle affine son ton pour correspondre exactement à votre façon de communiquer." },
              { q: "Est-il possible de programmer des messages à l'avance ?", a: "Absolument, vous pouvez planifier vos publications et rappels sur tous vos canaux en quelques clics." }
            ].map(faq => (
              <div key={faq.q} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-black text-slate-950 mb-2">{faq.q}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-slate-950 py-12 px-4 text-center">
        <p className="text-white font-black text-2xl mb-6">Prêt à passer à la vitesse supérieure ?</p>
        <Link href="/auth/login" className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-full font-bold hover:bg-blue-700 transition">
          Démarrer maintenant <ArrowRight className="size-5" />
        </Link>
      </footer>
    </main>
  );
}
