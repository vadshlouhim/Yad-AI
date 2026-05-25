import Image from "next/image";
import Link from "next/link";
import { HeroAnimation } from "@/components/home/hero-animation";
import {
  BellRing,
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Image as ImageIcon,
  LogIn,
  MessageCircle,
  PenLine,
  RefreshCw,
  Send,
  Share2,
} from "lucide-react";

const FEATURES = [
  {
    label: "Gestion des rÃ©seaux sociaux",
    description: "Pilotez WhatsApp, Instagram, Facebook, Telegram et email depuis un seul espace.",
    icon: Share2,
    tone: "bg-blue-50 text-blue-700 border-blue-100",
  },
  {
    label: "Assistant du quotidien",
    description: "Transformez une demande simple en action claire, contenu prÃªt ou automatisation.",
    icon: Bot,
    tone: "bg-cyan-50 text-cyan-700 border-cyan-100",
  },
  {
    label: "Contenus automatiques",
    description: "PrÃ©parez annonces, textes, affiches et publications avec le contexte de votre communautÃ©.",
    icon: PenLine,
    tone: "bg-amber-50 text-amber-700 border-amber-100",
  },
  {
    label: "Messagerie connectÃ©e",
    description: "Gardez les messages importants, rÃ©ponses et relances au mÃªme endroit.",
    icon: MessageCircle,
    tone: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  {
    label: "Banque visuelle",
    description: "Centralisez vos affiches, modÃ¨les, visuels et contenus rÃ©utilisables.",
    icon: ImageIcon,
    tone: "bg-violet-50 text-violet-700 border-violet-100",
  },
  {
    label: "Agenda intelligent",
    description: "Reliez Ã©vÃ©nements, rappels, horaires et automatisations communautaires.",
    icon: CalendarDays,
    tone: "bg-slate-100 text-slate-700 border-slate-200",
  },
];

const WORKFLOW = [
  {
    label: "Demandez",
    text: "DÃ©crivez ce que vous voulez publier ou prÃ©parer.",
    icon: MessageCircle,
    tone: "border-blue-100 bg-blue-50 text-blue-700",
    numberTone: "text-blue-500",
    accent: "bg-blue-500",
  },
  {
    label: "Validez",
    text: "Lâ€™IA propose un texte, une affiche ou une action.",
    icon: CheckCircle2,
    tone: "border-emerald-100 bg-emerald-50 text-emerald-700",
    numberTone: "text-emerald-500",
    accent: "bg-emerald-500",
  },
  {
    label: "Diffusez",
    text: "Publiez ou programmez sur les bons canaux.",
    icon: Send,
    tone: "border-amber-100 bg-amber-50 text-amber-700",
    numberTone: "text-amber-500",
    accent: "bg-amber-500",
  },
];

const SOCIAL_CHANNELS = [
  { name: "WhatsApp", src: "/logo/whatsapp-svgrepo-com.svg" },
  { name: "Instagram", src: "/logo/instagram-2-1-logo-svgrepo-com%20(1).svg" },
  { name: "Facebook", src: "/logo/facebook-3-logo-svgrepo-com.svg" },
  { name: "Telegram", src: "/logo/telegram-svgrepo-com.svg" },
  { name: "Gmail", src: "/logo/gmail-svgrepo-com.svg" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/easycom-ai-logo.png"
              alt="Logo EasyCom AI"
              width={40}
              height={40}
              className="h-10 w-10 rounded-xl border border-slate-200 bg-white object-cover p-1 shadow-sm"
              priority
            />
            <div className="leading-tight">
              <p className="text-sm font-black tracking-tight text-slate-950">EasyCom AI</p>
              <p className="text-xs font-medium text-slate-500">Communication communautaire</p>
            </div>
          </Link>

          <nav className="hidden rounded-full border border-slate-200 bg-slate-50 p-1 text-sm font-semibold text-slate-600 shadow-sm md:flex">
            <Link
              href="/features"
              className="inline-flex h-9 items-center gap-2 rounded-full px-4 transition hover:bg-white hover:text-blue-700 hover:shadow-sm"
            >
              <Share2 className="size-4" />
              FonctionnalitÃ©s
            </Link>
            <Link
              href="/method"
              className="inline-flex h-9 items-center gap-2 rounded-full px-4 transition hover:bg-white hover:text-emerald-700 hover:shadow-sm"
            >
              <CheckCircle2 className="size-4" />
              MÃ©thode
            </Link>
            <Link
              href="/blog"
              className="inline-flex h-9 items-center gap-2 rounded-full px-4 transition hover:bg-white hover:text-amber-700 hover:shadow-sm"
            >
              <PenLine className="size-4" />
              Blog
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-9 items-center gap-2 rounded-full px-4 transition hover:bg-white hover:text-indigo-700 hover:shadow-sm"
            >
              <MessageCircle className="size-4" />
              Contact
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/email"
              className="hidden sm:inline-flex h-10 items-center justify-center rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 md:mr-2"
            >
              Tableau de bord
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex h-10 items-center justify-center rounded-full bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <LogIn className="mr-2 size-4" />
              Essayer maintenant
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-blue-50/80 to-white" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-18 lg:grid-cols-[1fr_0.92fr] lg:px-8 lg:py-20">
          <div className="flex flex-col justify-center">
            <h1 className="max-w-3xl text-4xl font-black leading-[1.04] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Une{" "}
              <span className="text-blue-600">communication,</span> simplifiÃ©e.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              EasyCom AI centralise vos Ã©vÃ©nements, messages, affiches et canaux de publication pour aider votre Ã©quipe Ã  communiquer plus vite, avec un ton cohÃ©rent et des actions prÃªtes Ã  valider.
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
                    className="h-6 w-6 object-contain"
                  />
                </div>
              ))}
            </div>

            <div className="mt-8 grid max-w-2xl gap-4 sm:grid-cols-3">
              {[
                {
                  title: "1 min Ã  prÃ©parer",
                  text: "Connectez-vous et suivez les 6 Ã©tapes pour nous dire qui vous Ãªtes. Notre agent sâ€™occupera du reste.",
                  icon: Clock3,
                  tone: "bg-blue-50 text-blue-700 border-blue-100",
                },
                {
                  title: "Communication automatisÃ©e",
                  text: "Les contenus rÃ©currents se prÃ©parent sans repartir de zÃ©ro chaque semaine.",
                  icon: RefreshCw,
                  tone: "bg-emerald-50 text-emerald-700 border-emerald-100",
                },
                {
                  title: "Rappels programmÃ©s",
                  text: "Les Ã©vÃ©nements importants restent visibles au bon moment pour lâ€™Ã©quipe.",
                  icon: BellRing,
                  tone: "bg-amber-50 text-amber-700 border-amber-100",
                },
              ].map(({ title, text, icon: Icon, tone }) => (
                <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl border ${tone}`}>
                    <Icon className="size-5" />
                  </div>
                  <p className="text-sm font-black text-slate-950">{title}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-600">{text}</p>
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
          <div className="max-w-2xl">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-blue-600">FonctionnalitÃ©s</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Une interface <span className="text-blue-600">calme</span> pour des journÃ©es chargÃ©es.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Chaque module est pensÃ© pour rÃ©duire les allers-retours entre outils et garder le contexte de votre communautÃ© au mÃªme endroit.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ label, description, icon: Icon, tone }) => (
              <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl border ${tone}`}>
                  <Icon className="size-5" />
                </div>
                <h3 className="text-base font-black text-slate-950">{label}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="bg-white px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-amber-600">MÃ©thode</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Du besoin Ã  la publication, sans perdre le fil.
              </h2>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {WORKFLOW.map(({ label, text, icon: Icon, tone, numberTone, accent }, index) => (
                <div key={label} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className={`absolute inset-x-0 top-0 h-1 ${accent}`} />
                  <div className="flex items-center justify-between">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${tone}`}>
                      <Icon className="size-4" />
                    </div>
                    <span className={`text-sm font-black ${numberTone}`}>0{index + 1}</span>
                  </div>
                  <p className="mt-5 text-sm font-black text-slate-950">{label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-blue-600">TÃ©moignages</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Ils simplifient leur <span className="text-blue-600">quotidien</span> avec EasyCom AI.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                name: "Marc L.",
                role: "GÃ©rant de restaurant",
                content: "EasyCom a rÃ©volutionnÃ© notre gestion de salle. Nos rappels de rÃ©servation WhatsApp partent tout seuls, et l'IA m'aide Ã  rÃ©diger les menus de la semaine en 2 minutes.",
                avatar: "ML",
                color: "bg-blue-100 text-blue-700",
              },
              {
                name: "Sarah J.",
                role: "Coach Sportive",
                content: "Mes Ã©lÃ¨ves reÃ§oivent leurs programmes et encouragements par message sans que j'y passe mes soirÃ©es. C'est comme avoir une assistante personnelle 24h/24.",
                avatar: "SJ",
                color: "bg-emerald-100 text-emerald-700",
              },
              {
                name: "Thomas D.",
                role: "Agent Immobilier",
                content: "Pour gÃ©rer les relances clients et les publications de nouveaux biens sur les rÃ©seaux, c'est l'outil parfait. Je gagne au moins 10h par semaine sur ma communication.",
                avatar: "TD",
                color: "bg-amber-100 text-amber-700",
              },
            ].map((testimonial) => (
              <article key={testimonial.name} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                <div className="flex items-center gap-3 mb-4">
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
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-indigo-600">FAQ</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Questions frÃ©quentes
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Est-ce que je peux utiliser EasyCom AI pour n'importe quelle activitÃ© ?",
                a: "Absolument. Que vous soyez une association, un commerce de proximitÃ©, un coach ou une grande communautÃ©, l'IA s'adapte Ã  votre contexte spÃ©cifique dÃ¨s la configuration.",
              },
              {
                q: "Ai-je besoin de connaissances techniques ?",
                a: "Aucune. L'interface est pensÃ©e pour Ãªtre aussi simple qu'une conversation. Vous demandez, l'IA propose, vous validez.",
              },
              {
                q: "Quels sont les canaux de diffusion supportÃ©s ?",
                a: "Nous supportons actuellement WhatsApp, Instagram, Facebook, Telegram et l'envoi d'emails groupÃ©s.",
              },
              {
                q: "Mes donnÃ©es sont-elles sÃ©curisÃ©es ?",
                a: "La sÃ©curitÃ© est notre prioritÃ©. Vos donnÃ©es et celles de votre communautÃ© sont chiffrÃ©es et nous respectons strictement le RGPD.",
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
            <p className="text-sm font-bold text-blue-300">EasyCom AI</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Donnez Ã  votre Ã©quipe un espace clair pour communiquer.
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

        <div className="mx-auto mt-8 flex max-w-7xl flex-wrap gap-4 text-xs text-slate-400">
          <Link href="/privacy" className="hover:text-white hover:underline">
            Politique de confidentialitÃ©
          </Link>
          <Link href="/legal/terms" className="hover:text-white hover:underline">
            Conditions d&apos;utilisation
          </Link>
          <Link href="/data-deletion" className="hover:text-white hover:underline">
            Suppression des donnÃ©es
          </Link>
        </div>
      </section>
    </main>
  );
}
