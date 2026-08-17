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
  ChevronRight,
} from "lucide-react";

const REGULAR_COMMUNICATION_STATS = [
  {
    value: "5×",
    label: "Plus d’engagement",
    description:
      "Une analyse de plus de 100 000 utilisateurs montre que les comptes qui publient régulièrement peuvent obtenir jusqu’à 5× plus d’engagement.",
    sourceLabel: "Étude Buffer sur la régularité",
    sourceHref: "https://buffer.com/resources/consistent-posting-study/",
    accent: "from-blue-700 to-indigo-600",
    glow: "bg-blue-500/10",
    gridClass: "xl:col-span-2",
  },
  {
    value: "2×",
    label: "Plus de croissance",
    description:
      "Sur Instagram, les comptes publiant 3 à 5 fois par semaine voient leur nombre d’abonnés croître environ 2× plus vite que ceux publiant seulement 1 à 2 fois par semaine.",
    sourceLabel: "Étude Buffer sur Instagram",
    sourceHref: "https://buffer.com/resources/how-often-to-post-on-instagram/",
    accent: "from-violet-700 to-fuchsia-600",
    glow: "bg-violet-500/10",
    gridClass: "xl:col-span-2",
  },
  {
    value: "+12 %",
    label: "Plus de portée par publication",
    description:
      "Publier 3 à 5 fois par semaine est associé à environ 12 % de portée supplémentaire par publication.",
    sourceLabel: "Étude Buffer sur Instagram",
    sourceHref: "https://buffer.com/resources/how-often-to-post-on-instagram/",
    accent: "from-cyan-700 to-blue-600",
    glow: "bg-cyan-500/10",
    gridClass: "xl:col-span-2",
  },
  {
    value: "2×",
    label: "Plus de chances d’atteindre son objectif",
    description:
      "Une campagne de dons partagée 6 à 10 fois pendant ses 3 premiers jours est environ 2× plus susceptible d’atteindre son objectif.",
    sourceLabel: "Guide GoFundMe",
    sourceHref: "https://www.gofundme.com/en-ca/c/fundraising-tips",
    accent: "from-orange-600 to-amber-500",
    glow: "bg-orange-500/10",
    gridClass: "xl:col-span-3",
  },
  {
    value: "Jusqu’à 3×",
    label: "Plus de fonds collectés",
    description:
      "Des mises à jour régulières en texte, photo ou vidéo peuvent aider une campagne de collecte à lever jusqu’à 3× plus.",
    sourceLabel: "Guide GoFundMe",
    sourceHref: "https://www.gofundme.com/en-ca/c/fundraising-tips",
    accent: "from-indigo-700 to-violet-600",
    glow: "bg-indigo-500/10",
    gridClass: "xl:col-span-3",
  },
] as const;

const FAQ = [
  {
    question: "À qui s’adresse EasyCom IA ?",
    answer:
      "EasyCom IA est pensé en priorité pour les synagogues, Beth Habad et associations communautaires qui veulent communiquer régulièrement sans multiplier les outils.",
  },
  {
    question: "Ai-je besoin de connaissances techniques ?",
    answer:
      "Non. Vous décrivez simplement ce que vous souhaitez communiquer. L’IA prépare une proposition claire que vous pouvez modifier et valider.",
  },
  {
    question: "Quels canaux puis-je utiliser ?",
    answer:
      "EasyCom IA réunit notamment WhatsApp, Instagram, Facebook, Telegram et l’email, avec des outils pour les affiches, newsletters, rappels et avis Google.",
  },
  {
    question: "Est-ce que l’IA publie sans mon accord ?",
    answer:
      "Non. Vous choisissez les automatisations et le niveau de validation. Les communications sensibles peuvent toujours être relues avant leur diffusion.",
  },
] as const;

const FEATURED_AGENT_SLUGS = ["david", "israel", "dov", "mendy"] as const;
const LANDING_AGENTS = [
  ...FEATURED_AGENT_SLUGS.flatMap((slug) => HOME_EASYCOM_AGENTS.filter((agent) => agent.slug === slug)),
  ...HOME_EASYCOM_AGENTS.filter((agent) => !FEATURED_AGENT_SLUGS.some((slug) => slug === agent.slug)),
].filter((agent) => !["tsemah", "zalman"].includes(agent.slug));

export const metadata: Metadata = {
  title: "EasyCom IA - La communication de votre communauté, orchestrée par l’IA",
  description:
    "EasyCom IA aide les synagogues, Beth Habad et associations à préparer, valider et diffuser leurs publications, messages, affiches, emails et rappels.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <PublicNavbar />

      <section className="relative isolate overflow-hidden bg-[#070b1d] px-4 py-16 text-white sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_72%_42%,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_16%_12%,rgba(99,102,241,0.14),transparent_24%)]"
          aria-hidden="true"
        />
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-8">
          <div className="max-w-2xl text-center lg:text-left">
            <p className="inline-flex items-center rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
              Le copilote des communautés
            </p>
            <h1 className="mt-6 text-[clamp(2.45rem,4.6vw,4rem)] font-bold leading-[1.04] tracking-[-0.04em] text-white">
              Toute la communication de votre communauté, orchestrée par l’IA.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8 lg:mx-0">
              EasyCom IA prépare vos publications, messages, affiches, emails et rappels. Vous gardez la validation,
              vos agents s’occupent du reste.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Link
                href="/auth/register"
                className="inline-flex h-12 items-center justify-center rounded-full bg-cyan-300 px-6 text-sm font-semibold text-[#070b1d] shadow-lg shadow-cyan-950/30 transition hover:-translate-y-0.5 hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/60"
              >
                Essayer gratuitement
                <ArrowRight className="ml-2 size-4" aria-hidden="true" />
              </Link>
              <Link
                href="/demo"
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 bg-white/[0.06] px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/20"
              >
                Voir la démo
              </Link>
            </div>

            <p className="mx-auto mt-6 max-w-xl text-center text-sm leading-6 text-slate-400">
              Pensé pour les synagogues, Beth Habad et associations
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-3xl lg:max-w-none">
            <div className="pointer-events-none absolute bottom-[5%] left-1/2 aspect-square w-[72%] -translate-x-1/2 rounded-full bg-cyan-200/20 blur-3xl" aria-hidden="true" />
            <Image
              src={AGENTS_GROUP_IMAGE}
              alt="Les agents IA spécialisés d’EasyCom IA"
              width={1672}
              height={810}
              preload
              sizes="(max-width: 1024px) 100vw, 56vw"
              className="relative h-auto w-full object-contain drop-shadow-[0_28px_42px_rgba(2,6,23,0.42)]"
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="regular-communication-title" className="relative isolate overflow-hidden bg-[#f7f8fc] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_8%_18%,rgba(99,102,241,0.10),transparent_24%),radial-gradient(circle_at_92%_80%,rgba(249,115,22,0.09),transparent_22%)]"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Pensé pour votre quotidien</p>
            <h2 id="regular-communication-title" className="mt-4 text-3xl font-bold tracking-[-0.03em] text-[#0b1230] sm:text-4xl lg:text-5xl">
              Pourquoi communiquer régulièrement&nbsp;?
            </h2>
            <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
              La régularité de votre communication augmente votre visibilité, renforce l’engagement de votre
              communauté et multiplie les opportunités de mobilisation.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-6">
            {REGULAR_COMMUNICATION_STATS.map((stat) => (
              <article
                key={stat.label}
                className={`group relative isolate overflow-hidden rounded-[1.75rem] border border-white bg-white p-6 shadow-[0_22px_65px_rgba(30,41,59,0.08)] ring-1 ring-slate-200/70 transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_75px_rgba(30,41,59,0.13)] sm:p-8 ${stat.gridClass}`}
              >
                <span className={`pointer-events-none absolute -right-12 -top-12 -z-10 size-40 rounded-full blur-3xl ${stat.glow}`} aria-hidden="true" />
                <p className={`bg-gradient-to-r bg-clip-text text-5xl font-bold tracking-[-0.06em] text-transparent sm:text-6xl ${stat.accent}`}>
                  {stat.value}
                </p>
                <h3 className="mt-5 text-xl font-bold tracking-tight text-[#0b1230]">{stat.label}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{stat.description}</p>
                <a
                  href={stat.sourceHref}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 inline-flex text-xs font-semibold text-slate-400 underline decoration-slate-300 underline-offset-4 transition hover:text-blue-700 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  Source : {stat.sourceLabel}
                </a>
              </article>
            ))}
          </div>

          <div className="relative mt-8 overflow-hidden rounded-[2rem] bg-[#0b1230] px-6 py-10 text-center text-white shadow-[0_28px_80px_rgba(15,23,42,0.18)] sm:px-10 sm:py-12">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_20%,rgba(59,130,246,0.30),transparent_28%),radial-gradient(circle_at_86%_72%,rgba(249,115,22,0.20),transparent_24%)]"
              aria-hidden="true"
            />
            <p className="relative mx-auto max-w-4xl text-2xl font-bold leading-tight tracking-[-0.03em] sm:text-3xl lg:text-4xl">
              Plus vous communiquez, plus votre communauté voit ce que vous faites
            </p>
          </div>
        </div>
      </section>

      <section id="agents" aria-labelledby="agents-title" className="bg-[#070b1d] px-4 py-16 text-white sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Une équipe spécialisée</p>
            <h2 id="agents-title" className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              8 agents IA au service de votre mission.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Spécialement conçus pour accompagner les Shlouhim et les représentants communautaires au quotidien.
            </p>
          </div>

          <AgentShowcase agents={LANDING_AGENTS} initialVisibleCount={LANDING_AGENTS.length} />
        </div>
      </section>

      <InstallAppGuide />

      <section aria-labelledby="faq-title" className="bg-[#f5f7fb] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Questions fréquentes</p>
            <h2 id="faq-title" className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Les réponses avant de commencer.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Une expérience simple, conçue pour être prise en main sans formation technique.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-4xl space-y-3">
            {FAQ.map((item) => (
              <details key={item.question} className="group rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm open:border-cyan-200 sm:px-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-semibold text-slate-950 [&::-webkit-details-marker]:hidden">
                  <span>{item.question}</span>
                  <ChevronRight className="size-5 shrink-0 text-cyan-700 transition group-open:rotate-90" aria-hidden="true" />
                </summary>
                <p className="mt-3 max-w-2xl pr-8 text-sm leading-6 text-slate-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#070b1d] px-4 py-16 text-center text-white sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">EasyCom IA</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Votre communauté mérite une communication claire et régulière.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-300">
            Commencez gratuitement et découvrez comment vos agents peuvent alléger votre quotidien.
          </p>
          <Link
            href="/auth/register"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-cyan-300 px-7 text-sm font-semibold text-[#070b1d] transition hover:-translate-y-0.5 hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/60"
          >
            Essayer gratuitement
            <ArrowRight className="ml-2 size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
