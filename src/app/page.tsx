import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { HeroAnimation } from "@/components/home/hero-animation";
import { InstallAppGuide } from "@/components/home/install-app-guide";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicNavbar } from "@/components/layout/public-navbar";
import {
  BrainCircuit,
  CalendarDays,
  Clapperboard,
  Inbox,
  LogIn,
  Megaphone,
  Search,
  Send,
  Share2,
  Sparkles,
} from "lucide-react";

const TOP_CARDS = [
  {
    label: "Publications automatisées",
    description: "Programmez vos publications récurrentes et restez visible sur vos réseaux sociaux sans tout refaire chaque semaine.",
    icon: Megaphone,
    tone: "border-blue-200 text-blue-700 bg-blue-50",
    line: "bg-blue-600",
  },
  {
    label: "Communication centralisée",
    description: "Facebook, Instagram, WhatsApp, emails et avis Google réunis dans un seul espace pour tout gérer plus simplement.",
    icon: Inbox,
    tone: "border-violet-200 text-violet-700 bg-violet-50",
    line: "bg-violet-600",
  },
  {
    label: "Réponses intelligentes",
    description: "L’IA trie vos emails et avis Google, prépare des réponses adaptées et vous aide à répondre plus vite.",
    icon: Sparkles,
    tone: "border-emerald-200 text-emerald-700 bg-emerald-50",
    line: "bg-emerald-600",
  },
];

const FEATURES = [
  {
    label: "Agenda IA connecté",
    description: "Vos rappels, événements et automatisations sont centralisés dans un agenda intelligent avec notifications au bon moment.",
    icon: CalendarDays,
    tone: "border-amber-200 text-amber-700 bg-amber-50",
    line: "bg-amber-500",
  },
  {
    label: "Envoi en un clic",
    description: "Vos messages et publications partent sur les bons canaux en quelques secondes.",
    icon: Send,
    tone: "border-cyan-200 text-cyan-700 bg-cyan-50",
    line: "bg-cyan-600",
  },
  {
    label: "Automatisations intelligentes",
    description: "Créez des routines de communication pour publier, rappeler, et envoyer au bon moment.",
    icon: BrainCircuit,
    tone: "border-indigo-200 text-indigo-700 bg-indigo-50",
    line: "bg-indigo-600",
  },
  {
    label: "Communication régulière",
    description: "EasyCom IA vous aide à rester actif, visible et cohérent sur tous vos canaux de communication.",
    icon: Share2,
    tone: "border-teal-200 text-teal-700 bg-teal-50",
    line: "bg-teal-600",
  },
  {
    label: "Ressources & vidéos IA",
    description: "Téléversez vos ressources, photos et vidéos, créez des clips en quelques secondes, puis publiez-les directement sur vos réseaux.",
    icon: Clapperboard,
    tone: "border-red-200 text-red-700 bg-red-50",
    line: "bg-red-600",
  },
];

const SOCIAL_CHANNELS = [
  { name: "WhatsApp", src: "/logo/whatsapp-svgrepo-com.svg", color: "text-emerald-600" },
  { name: "Instagram", src: "/logo/instagram-2-1-logo-svgrepo-com%20(1).svg", color: "text-pink-600" },
  { name: "Facebook", src: "/logo/facebook-3-logo-svgrepo-com.svg", color: "text-blue-600" },
  { name: "Telegram", src: "/logo/telegram-svgrepo-com.svg", color: "text-sky-600" },
  { name: "Gmail", src: "/logo/gmail-svgrepo-com.svg", color: "text-red-600" },
];

const TESTIMONIALS = [
  { name: "Marc L.", role: "Gérant de restaurant", content: "EasyCom IA m'aide à garder une communication régulière sans y passer mes soirées.", avatar: "ML", color: "bg-blue-100 text-blue-700" },
  { name: "Sarah J.", role: "Coach sportive", content: "Je prépare mes annonces, mes rappels et mes réponses beaucoup plus vite.", avatar: "SJ", color: "bg-emerald-100 text-emerald-700" },
  { name: "Thomas D.", role: "Agent immobilier", content: "Les publications et relances sont mieux organisées, et je gagne plusieurs heures par semaine.", avatar: "TD", color: "bg-amber-100 text-amber-700" },
  { name: "Nadia B.", role: "Responsable association", content: "Tout est centralisé : réseaux sociaux, emails, avis et messages importants.", avatar: "NB", color: "bg-violet-100 text-violet-700" },
  { name: "Julien R.", role: "Consultant indépendant", content: "L'IA comprend mon ton et me propose des messages qui me ressemblent vraiment.", avatar: "JR", color: "bg-cyan-100 text-cyan-700" },
  { name: "Camille P.", role: "Boutique locale", content: "Je publie plus souvent, sans devoir repartir de zéro à chaque fois.", avatar: "CP", color: "bg-rose-100 text-rose-700" },
  { name: "Hugo M.", role: "Organisateur d'événements", content: "L'agenda IA et les notifications m'évitent les oublis avant les temps forts.", avatar: "HM", color: "bg-indigo-100 text-indigo-700" },
  { name: "Leïla A.", role: "Formatrice", content: "Les réponses préparées aux emails et avis me font gagner un temps énorme.", avatar: "LA", color: "bg-teal-100 text-teal-700" },
  { name: "Olivier G.", role: "Artisan", content: "Je peux créer une routine de communication simple, visible et cohérente.", avatar: "OG", color: "bg-orange-100 text-orange-700" },
  { name: "Emma V.", role: "Créatrice de contenu", content: "Les ressources et vidéos IA m'aident à publier rapidement sur les bons canaux.", avatar: "EV", color: "bg-fuchsia-100 text-fuchsia-700" },
];

const BLOG_TEASERS = [
  {
    href: "/blog/communication-ia-communautes",
    title: "Comment l'IA transforme la communication des communautés",
    description: "Centraliser messages, réseaux sociaux et rappels sans perdre l'identité humaine.",
    tone: "border-blue-200 bg-blue-50 text-blue-700",
  },
  {
    href: "/blog/planification-instagram-facebook-whatsapp",
    title: "Planifier Instagram, Facebook et WhatsApp sans multiplier les outils",
    description: "Une stratégie multicanale simple pour rester visible sans charge mentale.",
    tone: "border-pink-200 bg-pink-50 text-pink-700",
  },
  {
    href: "/blog/seo-local-ia-communication",
    title: "SEO local et IA : rendre votre structure plus visible",
    description: "Contenus utiles, avis Google, sitemap et données structurées au service de la visibilité.",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
];

export const metadata: Metadata = {
  title: "EasyCom IA - Le copilote IA de communication de votre communauté",
  description:
    "Centralisez et automatisez la communication de votre synagogue, Beth Habad ou association : affiches, horaires de Chabbat, rappels d'événements et récaps, publiés sur Instagram, Facebook, WhatsApp et email.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <PublicNavbar />

      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-blue-50/80 to-white" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-18 lg:grid-cols-[1fr_0.92fr] lg:px-8 lg:py-20">
          <div className="flex flex-col justify-center">
            <h1 className="max-w-3xl text-[clamp(2rem,8vw,3.75rem)] font-black leading-[1.04] tracking-tight text-slate-950">
              Toute votre <span className="text-blue-600">communication</span> dans un seul espace
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              EasyCom IA centralise{" "}
              <span className="font-bold text-blue-600">Facebook</span>,{" "}
              <span className="font-bold text-pink-600">Instagram</span>,{" "}
              <span className="font-bold text-emerald-600">WhatsApp</span>,{" "}
              <span className="font-bold text-red-600">Email</span> et{" "}
              <span className="font-bold text-amber-600">Avis Google</span> dans une seule application.
              Publiez automatiquement et régulièrement sur vos réseaux sociaux, recevez vos emails et avis triés par l’IA,
              puis rédigez et envoyez vos messages en un clic.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              {SOCIAL_CHANNELS.map((channel) => (
                <div
                  key={channel.name}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  title={channel.name}
                >
                  <Image
                    src={channel.src}
                    alt={`Logo ${channel.name}`}
                    width={24}
                    height={24}
                    sizes="24px"
                    className="h-6 w-6 object-contain"
                  />
                </div>
              ))}
            </div>

            <div className="mt-8 grid max-w-2xl gap-4 sm:grid-cols-3">
              {TOP_CARDS.map(({ label, description, icon: Icon, tone, line }) => (
                <div key={label} className={`rounded-2xl border bg-white p-5 shadow-sm ${tone}`}>
                  <div className={`mb-4 h-1 w-12 rounded-full ${line}`} />
                  <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl border bg-white ${tone}`}>
                    <Icon className="size-5" />
                  </div>
                  <p className="text-sm font-black">{label}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-600">{description}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              <Link
                href="/auth/login"
                className="inline-flex h-12 items-center justify-center rounded-full bg-blue-600 px-7 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
              >
                <LogIn className="mr-2 size-4" />
                Essayer maintenant
              </Link>
            </div>
          </div>

          <div className="relative flex items-center">
            <div className="absolute -right-6 top-10 h-28 w-28 rounded-full bg-blue-100/70 blur-3xl" />
            <div className="absolute -bottom-6 left-8 h-24 w-24 rounded-full bg-emerald-100/80 blur-3xl" />
            <div className="relative w-full">
              <HeroAnimation />
            </div>
          </div>
        </div>
      </section>

      <section id="fonctionnalites" className="bg-slate-50 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-[clamp(1.75rem,6vw,2.5rem)] font-black leading-tight tracking-tight text-slate-950">
              <span className="text-blue-600">Votre temps est précieux</span> EasyCom IA centralise, prépare et{" "}
              <span className="text-blue-600">automatise votre communication</span>
            </h2>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {FEATURES.map(({ label, description, icon: Icon, tone, line }) => (
              <article key={label} className={`rounded-2xl border bg-white p-4 shadow-sm ${tone}`}>
                <div className={`mb-4 h-1 w-10 rounded-full ${line}`} />
                <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl border bg-white ${tone}`}>
                  <Icon className="size-5" />
                </div>
                <h3 className="text-sm font-black">{label}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <InstallAppGuide />

      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-blue-600">Témoignages</p>
            <h2 className="mt-3 text-[clamp(1.75rem,6vw,2.25rem)] font-black tracking-tight text-slate-950">
              EasyCom IA les aide à mieux gérer leur communication au quotidien
            </h2>
          </div>

          <div className="mt-12 overflow-hidden">
            <div className="flex w-max gap-6 animate-testimonial-marquee hover:[animation-play-state:paused]">
              {[...TESTIMONIALS, ...TESTIMONIALS].map((testimonial, index) => (
                <article key={`${testimonial.name}-${index}`} className="w-[19rem] shrink-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${testimonial.color}`}>
                      {testimonial.avatar}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-950">{testimonial.name}</h3>
                      <p className="text-xs font-medium text-slate-500">{testimonial.role}</p>
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-slate-600 italic">&quot;{testimonial.content}&quot;</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-blue-600">Blog</p>
              <h2 className="mt-3 max-w-3xl text-[clamp(1.75rem,6vw,2.5rem)] font-black leading-tight tracking-tight text-slate-950">
                Guides pratiques pour mieux communiquer avec l&apos;IA
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Référencement, WhatsApp, emails, réseaux sociaux et automatisations : des articles pensés pour aider les structures locales à gagner en visibilité.
              </p>
            </div>
            <Link href="/blog" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-blue-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-blue-700">
              <Search className="size-4" />
              Voir tous les articles
            </Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {BLOG_TEASERS.map((article) => (
              <Link key={article.href} href={article.href} className={`rounded-[1.5rem] border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${article.tone}`}>
                <p className="text-xs font-black uppercase tracking-[0.14em] opacity-80">Article SEO</p>
                <h3 className="mt-3 text-lg font-black leading-tight text-slate-950">{article.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{article.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-indigo-600">FAQ</p>
            <h2 className="mt-3 text-[clamp(1.75rem,6vw,2.25rem)] font-black tracking-tight text-slate-950">
              Questions fréquentes
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Est-ce que je peux utiliser EasyCom IA pour n'importe quelle activité ?",
                a: "Absolument. Que vous soyez une association, un commerce de proximité, un coach ou une grande communauté, l'IA s'adapte à votre contexte spécifique dès la configuration.",
              },
              {
                q: "Ai-je besoin de connaissances techniques ?",
                a: "Aucune. L'interface est pensée pour être aussi simple qu'une conversation. Vous demandez, l'IA propose, vous validez.",
              },
              {
                q: "Quels sont les canaux de diffusion supportés ?",
                a: "Nous supportons actuellement WhatsApp, Instagram, Facebook, Telegram et l'envoi d'emails groupés.",
              },
              {
                q: "Mes données sont-elles sécurisées ?",
                a: "La sécurité est notre priorité. Vos données et celles de votre communauté sont chiffrées et nous respectons strictement le RGPD.",
              },
            ].map((item) => (
              <div key={item.q} className="rounded-2xl border border-slate-200 p-6">
                <h3 className="text-base font-black text-slate-950">{item.q}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-950 px-4 py-12 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold text-blue-300">EasyCom IA</p>
            <h2 className="mt-2 text-[clamp(1.5rem,5.4vw,1.875rem)] font-black tracking-tight">
              Concentrez-vous sur l&apos;essentiel. EasyCom IA s&apos;occupe du reste !
            </h2>
          </div>
          <Link
            href="/auth/login"
            className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-bold text-slate-950 transition hover:bg-blue-50"
          >
            <LogIn className="mr-2 size-4" />
            Essayer maintenant
          </Link>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
