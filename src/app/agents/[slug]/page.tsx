import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, Bot, CheckCircle2, LogIn, Sparkles } from "lucide-react";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { EASYCOM_AGENTS, getEasyComAgent } from "@/lib/agents";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return EASYCOM_AGENTS.map((agent) => ({ slug: agent.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const agent = getEasyComAgent(slug);
  if (!agent) return { title: "Agent IA introuvable — EasyCom IA" };

  return {
    title: `${agent.name}, agent IA ${agent.role} — EasyCom IA`,
    description: agent.description,
    alternates: { canonical: `/agents/${agent.slug}` },
  };
}

export default async function AgentLandingPage({ params }: Props) {
  const { slug } = await params;
  const agent = getEasyComAgent(slug);
  if (!agent) notFound();

  const otherAgents = EASYCOM_AGENTS.filter((item) => item.slug !== agent.slug).slice(0, 3);

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <PublicNavbar />

      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-sky-100 px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="absolute -left-24 top-8 size-72 rounded-full bg-blue-200/50 blur-3xl" />
        <div className="absolute -right-20 bottom-0 size-80 rounded-full bg-cyan-200/40 blur-3xl" />
        <div className="relative mx-auto max-w-7xl">
          <Link href="/#agents" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-blue-700">
            <ArrowLeft className="size-4" />
            Tous les agents IA
          </Link>

          <div className="mt-10 grid items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-blue-700 shadow-sm">
                <Bot className="size-4" />
                Agent {agent.role}
              </div>
              <p className="mt-7 text-lg font-bold text-blue-700">Bonjour, je suis {agent.name}.</p>
              <h1 className="mt-3 max-w-3xl text-[clamp(2.5rem,7vw,4.5rem)] font-black leading-[0.98] tracking-tight text-slate-950">
                {agent.description}
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">{agent.details}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/auth/login" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-blue-600 px-6 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700">
                  <LogIn className="size-4" />
                  Se connecter à EasyCom IA
                </Link>
                <Link href="/auth/register" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-blue-200 bg-white px-6 text-sm font-black text-blue-700 transition hover:bg-blue-50">
                  Créer mon espace
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl">
              <div className={`absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br ${agent.tone} opacity-25 blur-3xl`} />
              <div className="relative overflow-hidden rounded-[2rem] border border-white bg-white p-2 shadow-2xl shadow-blue-200/60">
                <div className="relative min-h-[32rem] overflow-hidden rounded-[1.55rem] bg-slate-100 sm:min-h-[38rem]">
                  <Image
                    src={agent.image}
                    alt={`${agent.name}, agent IA ${agent.role} d'EasyCom IA`}
                    fill
                    preload
                    sizes="(max-width: 1024px) 100vw, 42vw"
                    className="object-contain object-bottom"
                  />
                  <div className={`absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t ${agent.tone} opacity-75 mix-blend-multiply`} />
                  <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/50 bg-white/90 p-4 shadow-lg backdrop-blur">
                    <p className="text-2xl font-black text-slate-950">{agent.name}</p>
                    <p className="mt-1 text-sm font-semibold text-blue-700">{agent.role}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-blue-600">Ce que {agent.name} fait pour vous</p>
            <h2 className="mt-3 text-[clamp(2rem,5vw,3rem)] font-black tracking-tight text-slate-950">Plus de simplicité, sans perdre le contrôle</h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {agent.capabilities.map((capability, index) => (
              <article key={capability} className="rounded-[1.5rem] border border-blue-100 bg-blue-50/50 p-6">
                <span className="text-sm font-black text-blue-600">0{index + 1}</span>
                <CheckCircle2 className="mt-5 size-6 text-blue-600" />
                <p className="mt-4 text-lg font-black text-slate-950">{capability}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-blue-300"><Sparkles className="size-4" /> EasyCom IA travaille avec vous</div>
            <h2 className="mt-3 text-[clamp(2rem,5vw,3rem)] font-black tracking-tight">Prêt à confier cette activité à {agent.name} ?</h2>
            <p className="mt-4 text-base leading-7 text-slate-300">Connectez-vous à EasyCom IA pour découvrir l&apos;ensemble de votre équipe d&apos;agents et commencer à communiquer plus simplement.</p>
          </div>
          <Link href="/auth/login" className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-black text-slate-950 transition hover:bg-blue-50">
            <LogIn className="size-4" />
            Se connecter
          </Link>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-blue-600">Compléter votre équipe</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Découvrez aussi ces agents</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {otherAgents.map((otherAgent) => (
              <Link key={otherAgent.slug} href={`/agents/${otherAgent.slug}`} className="group rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg">
                <div className="relative h-48 overflow-hidden rounded-2xl bg-slate-100">
                  <Image src={otherAgent.image} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-contain object-bottom transition group-hover:scale-105" />
                </div>
                <p className="mt-4 text-xs font-black uppercase tracking-[0.15em] text-blue-600">{otherAgent.role}</p>
                <p className="mt-1 text-xl font-black text-slate-950">{otherAgent.name}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-slate-700 group-hover:text-blue-600">Découvrir <ArrowRight className="size-4" /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
