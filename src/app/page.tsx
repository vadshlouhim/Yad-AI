import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { AgentShowcase } from "@/components/home/agent-showcase";
import { InstallAppGuide } from "@/components/home/install-app-guide";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { AGENTS_GROUP_IMAGE, HOME_EASYCOM_AGENTS } from "@/lib/agents";
import {
  ArrowRight,
  BrainCircuit,
  CalendarDays,
  ClipboardCheck,
  HeartHandshake,
  ImageIcon,
  LogIn,
  MailCheck,
  Newspaper,
  Send,
  Share2,
  WandSparkles,
} from "lucide-react";

const FEATURES = [
  {
    label: "Agenda IA connecté",
    description: "Vos rappels, événements et automatisations sont centralisés dans un agenda intelligent avec notifications au bon moment.",
    icon: CalendarDays,
    tone: "border-cyan-200 text-cyan-700 bg-cyan-50",
    line: "bg-cyan-500",
  },
  {
    label: "Envoi en un clic",
    description: "Vos messages et publications partent sur les bons canaux en quelques secondes.",
    icon: Send,
    tone: "border-indigo-200 text-indigo-700 bg-indigo-50",
    line: "bg-indigo-500",
  },
  {
    label: "Automatisations intelligentes",
    description: "Créez des routines de communication pour publier, rappeler, et envoyer au bon moment.",
    icon: BrainCircuit,
    tone: "border-cyan-200 text-cyan-700 bg-cyan-50",
    line: "bg-cyan-500",
  },
  {
    label: "Communication régulière",
    description: "EasyCom IA vous aide à rester actif, visible et cohérent sur tous vos canaux de communication.",
    icon: Share2,
    tone: "border-indigo-200 text-indigo-700 bg-indigo-50",
    line: "bg-indigo-500",
  },
];

const PLATFORM_FEATURES = [
  ...FEATURES.slice(0, 4),
  {
    label: "Affiches & visuels",
    description: "Personnalisez vos affiches et creez des visuels prets a partager pour chaque evenement.",
    icon: ImageIcon,
    tone: "border-cyan-200 text-cyan-700 bg-cyan-50",
    line: "bg-cyan-500",
  },
  {
    label: "Campagnes de dons",
    description: "Planifiez les etapes, preparez les contenus et suivez votre campagne au meme endroit.",
    icon: HeartHandshake,
    tone: "border-indigo-200 text-indigo-700 bg-indigo-50",
    line: "bg-indigo-500",
  },
  {
    label: "Newsletter IA",
    description: "Creez une newsletter a partir de vos evenements et programmez son envoi au bon moment.",
    icon: Newspaper,
    tone: "border-cyan-200 text-cyan-700 bg-cyan-50",
    line: "bg-cyan-500",
  },
  {
    label: "Emails & avis Google",
    description: "Classez les messages importants et preparez des reponses qui respectent votre ton.",
    icon: MailCheck,
    tone: "border-indigo-200 text-indigo-700 bg-indigo-50",
    line: "bg-indigo-500",
  },
];

const SOCIAL_CHANNELS = [
  { name: "WhatsApp", src: "/logo/whatsapp-svgrepo-com.svg", color: "text-emerald-600" },
  { name: "Instagram", src: "/logo/instagram-2-1-logo-svgrepo-com%20(1).svg", color: "text-pink-600" },
  { name: "Facebook", src: "/logo/facebook-3-logo-svgrepo-com.svg", color: "text-blue-600" },
  { name: "Telegram", src: "/logo/telegram-svgrepo-com.svg", color: "text-sky-600" },
  { name: "Gmail", src: "/logo/gmail-svgrepo-com.svg", color: "text-red-600" },
];

const PROCESS_STEPS = [
  {
    label: "Préparer",
    description: "Vos contenus et réponses.",
    icon: ClipboardCheck,
  },
  {
    label: "Automatiser",
    description: "Vos routines au bon moment.",
    icon: WandSparkles,
  },
  {
    label: "Publier",
    description: "Sur les canaux adaptés.",
    icon: Send,
  },
];

const TESTIMONIALS = [
  { name: "Marc L.", role: "Gérant de restaurant", content: "EasyCom IA m'aide à garder une communication régulière sans y passer mes soirées.", avatar: "ML", color: "bg-cyan-100 text-cyan-800" },
  { name: "Sarah J.", role: "Coach sportive", content: "Je prépare mes annonces, mes rappels et mes réponses beaucoup plus vite.", avatar: "SJ", color: "bg-indigo-100 text-indigo-800" },
  { name: "Thomas D.", role: "Agent immobilier", content: "Les publications et relances sont mieux organisées, et je gagne plusieurs heures par semaine.", avatar: "TD", color: "bg-cyan-100 text-cyan-800" },
  { name: "Nadia B.", role: "Responsable association", content: "Tout est centralisé : réseaux sociaux, emails, avis et messages importants.", avatar: "NB", color: "bg-indigo-100 text-indigo-800" },
  { name: "Julien R.", role: "Consultant indépendant", content: "L'IA comprend mon ton et me propose des messages qui me ressemblent vraiment.", avatar: "JR", color: "bg-cyan-100 text-cyan-800" },
  { name: "Camille P.", role: "Boutique locale", content: "Je publie plus souvent, sans devoir repartir de zéro à chaque fois.", avatar: "CP", color: "bg-indigo-100 text-indigo-800" },
  { name: "Hugo M.", role: "Organisateur d'événements", content: "L'agenda IA et les notifications m'évitent les oublis avant les temps forts.", avatar: "HM", color: "bg-cyan-100 text-cyan-800" },
  { name: "Leïla A.", role: "Formatrice", content: "Les réponses préparées aux emails et avis me font gagner un temps énorme.", avatar: "LA", color: "bg-indigo-100 text-indigo-800" },
  { name: "Olivier G.", role: "Artisan", content: "Je peux créer une routine de communication simple, visible et cohérente.", avatar: "OG", color: "bg-cyan-100 text-cyan-800" },
  { name: "Emma V.", role: "Créatrice de contenu", content: "Les ressources et vidéos IA m'aident à publier rapidement sur les bons canaux.", avatar: "EV", color: "bg-indigo-100 text-indigo-800" },
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

      <section id="agents" className="relative overflow-hidden bg-[#070b1d] px-4 py-16 text-white sm:px-6 lg:px-8 lg:py-24">
        <div className="home-ai-grid absolute inset-0" aria-hidden="true" />
        <div className="home-ai-beam absolute inset-x-0 top-[26%]" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mt-3 text-[clamp(2.1rem,7vw,4.1rem)] font-black leading-[1.02] tracking-tight text-white">
              Une équipe d&apos;agents IA qui <span className="text-cyan-300">s&apos;occupe de tout</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-center text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
              Plus besoin de jongler entre les outils ou de repartir d&apos;une page blanche. Choisissez l&apos;activité à gérer : un agent dédié vous accompagne, prépare le travail et vous laisse valider quand c&apos;est nécessaire.
            </p>
          </div>

          <div className="flex flex-col items-center gap-8">
            <div className="relative mx-auto mt-7 flex w-full max-w-3xl flex-col items-center justify-center lg:mt-8">
              <div className="relative flex w-full items-center justify-center overflow-visible">
                <Image
                  src={AGENTS_GROUP_IMAGE}
                  alt="L'équipe des agents IA EasyCom IA"
                  width={900}
                  height={675}
                  preload
                  sizes="(max-width: 1024px) 100vw, 56vw"
                  className="h-auto w-full object-contain drop-shadow-[0_28px_42px_rgba(0,229,255,0.18)]"
                />
              </div>
              <div className="relative -mt-3 flex w-full flex-wrap items-center justify-center gap-2 sm:-mt-5 lg:gap-2.5">
                {SOCIAL_CHANNELS.map((channel, index) => (
                  <div
                    key={channel.name}
                    className="animate-home-float flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/95 shadow-lg shadow-cyan-950/30 transition duration-300 hover:-translate-y-1 hover:scale-110 hover:border-cyan-300 hover:shadow-cyan-400/20 lg:h-11 lg:w-11"
                    style={{ animationDelay: `${index * 130}ms` }}
                    title={channel.name}
                  >
                    <Image src={channel.src} alt={`Logo ${channel.name}`} width={24} height={24} sizes="24px" className="h-6 w-6 object-contain" />
                  </div>
                ))}
              </div>
            </div>

            <div className="mx-auto w-full max-w-3xl">
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {PROCESS_STEPS.map(({ label, description, icon: Icon }, index) => (
                  <div key={label} className="group rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-center shadow-lg shadow-black/10 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-cyan-300/50 hover:bg-white/[0.1] sm:p-4">
                    <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl border border-white/50 text-white shadow-md shadow-cyan-400/20 transition duration-300 group-hover:-translate-y-1 group-hover:rotate-3">
                      <Icon className="size-5" />
                    </span>
                    <span className="mt-3 block text-[10px] font-black text-white sm:text-xs">0{index + 1}</span>
                    <p className="mt-1 text-xs font-black text-white sm:text-sm">{label}</p>
                    <p className="mt-1 text-[10px] leading-4 text-slate-400 sm:text-xs sm:leading-5">{description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mx-auto mt-24 max-w-3xl text-center lg:mt-32">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-cyan-300">Découvrez vos agents IA</p>
            <h2 className="mx-auto mt-4 max-w-4xl text-[clamp(1.65rem,4.5vw,2.8rem)] font-black leading-tight tracking-tight text-white">
              Instagram, Facebook, WhatsApp, Email, Avis Google, Automatisations, Dons et Contenus...
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-300">
              Chaque agent a sa mission, pour simplifier toute votre communication communautaire !
            </p>
          </div>

          <AgentShowcase agents={HOME_EASYCOM_AGENTS} />

          <div className="hidden">
            {HOME_EASYCOM_AGENTS.map((agent) => (
              <details
                key={agent.slug}
                className="group text-center"
              >
                <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <div className="relative h-44 overflow-hidden sm:h-60 lg:h-80 xl:h-[24rem]">
                    <Image
                      src={agent.image}
                      alt={`${agent.name}, agent IA ${agent.role} d'EasyCom IA`}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-contain object-bottom drop-shadow-[0_22px_24px_rgba(15,23,42,0.14)] transition duration-500 group-open:scale-[1.04] group-hover:scale-[1.035]"
                    />
                  </div>
                  <div className="px-1 pt-3 text-center">
                    <h3 className="text-base font-black leading-tight text-slate-950 lg:text-xl">{agent.name}</h3>
                    <p className="mt-1 text-[11px] font-bold leading-4 text-cyan-300 lg:text-sm">{agent.role}</p>
                    <span className="mx-auto mt-3 inline-flex h-10 items-center justify-center rounded-full border border-cyan-300/50 bg-cyan-300 px-5 text-xs font-black text-[#070b1d] shadow-lg shadow-cyan-950/20 transition group-hover:-translate-y-0.5 group-hover:bg-white lg:h-11 lg:px-7 lg:text-sm">
                      Découvrez
                    </span>
                  </div>
                </summary>
                <div className="mx-auto mt-4 max-w-xs rounded-2xl border border-cyan-300/20 bg-white/5 px-4 py-4 text-center text-xs leading-5 text-slate-300 shadow-sm lg:text-sm lg:leading-6">
                  <p>{agent.shortDescription}</p>
                  <p className="mt-3 border-t border-cyan-300/20 pt-3">{agent.details}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <InstallAppGuide />

      <section id="fonctionnalites" className="bg-[#f6f8fc] px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-[clamp(1.75rem,6vw,2.5rem)] font-black leading-tight tracking-tight text-slate-950">
              <span className="text-indigo-700">Votre temps est précieux</span> EasyCom IA centralise, prépare et{" "}
              <span className="text-cyan-700">automatise votre communication</span>
            </h2>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {PLATFORM_FEATURES.map(({ label, description, icon: Icon, tone, line }) => (
              <article key={label} className={`rounded-2xl border bg-white p-4 text-center shadow-sm ${tone}`}>
                <div className={`mx-auto mb-4 h-1 w-10 rounded-full ${line}`} />
                <div className={`mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl border bg-white ${tone}`}>
                  <Icon className="size-5" />
                </div>
                <h3 className="text-sm font-black">{label}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-cyan-700">Témoignages</p>
            <h2 className="mt-3 text-[clamp(1.75rem,6vw,2.25rem)] font-black tracking-tight text-slate-950">
              EasyCom IA les aide à mieux gérer leur communication au quotidien
            </h2>
          </div>

          <div className="mt-12 overflow-hidden">
            <div className="flex w-max gap-6 animate-testimonial-marquee hover:[animation-play-state:paused]">
              {[...TESTIMONIALS, ...TESTIMONIALS].map((testimonial, index) => (
                <article key={`${testimonial.name}-${index}`} className="w-[19rem] shrink-0 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                  <div className="mb-4 flex flex-col items-center gap-3">
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

      <section className="bg-[#f6f8fc] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 text-left shadow-sm transition hover:border-cyan-300 [&::-webkit-details-marker]:hidden sm:px-6">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.16em] text-indigo-700">FAQ</p>
                <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">Questions fréquentes</h2>
              </div>
              <ArrowRight className="size-5 shrink-0 text-cyan-700 transition group-open:rotate-90" />
            </summary>

            <div className="mt-4 space-y-4">
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
              <details key={item.q} className="group rounded-2xl border border-slate-200 bg-white p-6 transition open:border-cyan-300 open:shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-black text-slate-950 [&::-webkit-details-marker]:hidden">
                  <span>{item.q}</span>
                  <ArrowRight className="size-4 shrink-0 text-cyan-700 transition group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.a}</p>
              </details>
            ))}
            </div>
          </details>
        </div>
      </section>

      <section className="border-t border-cyan-400/20 bg-[#070b1d] px-4 py-12 text-center text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6">
          <div>
            <p className="text-sm font-bold text-cyan-300">EasyCom IA</p>
            <h2 className="mt-2 text-[clamp(1.5rem,5.4vw,1.875rem)] font-black tracking-tight">
              Concentrez-vous sur l&apos;essentiel. EasyCom IA s&apos;occupe du reste !
            </h2>
          </div>
          <Link
            href="/auth/login"
            className="inline-flex h-11 items-center justify-center rounded-full bg-cyan-300 px-5 text-sm font-bold text-[#070b1d] transition hover:bg-cyan-200"
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
