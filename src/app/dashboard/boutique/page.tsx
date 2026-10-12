import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink, HeartHandshake, ShoppingBag, Store } from "lucide-react";
import { requireAuth } from "@/lib/auth";

export const metadata: Metadata = { title: "La Boutique d’EasyCom-AI" };

export default async function BoutiquePage() {
  await requireAuth();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-5 sm:px-6 sm:py-8">
      <section className="relative overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_85%_10%,#8256c7_0%,#421388_45%,#250763_100%)] px-6 py-10 text-white shadow-[0_28px_70px_-35px_rgba(66,19,136,0.75)] sm:px-10 sm:py-14">
        <div className="absolute -right-16 -top-20 size-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em]">
            <ShoppingBag className="size-4" /> EasyCom-AI
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">La Boutique d’EasyCom-AI</h1>
          <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-white/80 sm:text-base">
            Retrouvez la boutique officielle et les annonces, objets et ressources proposés par les membres de la communauté.
          </p>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <Link href="/dashboard/boutique/communautaire" className="group flex min-h-72 flex-col overflow-hidden rounded-[2rem] border border-violet-100 bg-white p-6 shadow-[0_20px_50px_-34px_rgba(66,19,136,0.55)] transition hover:-translate-y-1 hover:border-violet-300 sm:p-8">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-violet-100 text-[#421388]"><HeartHandshake className="size-7" /></span>
          <h2 className="mt-6 text-2xl font-black text-slate-950">Articles et produits communautaires</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">Ressources gratuites, fichiers personnels, livres d’occasion et objets judaïques proposés par les utilisateurs EasyCom.</p>
          <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-black text-[#421388]">Découvrir <ArrowRight className="size-4 transition group-hover:translate-x-1" /></span>
        </Link>

        <a href="https://linktr.ee/Yadshlouhim" target="_blank" rel="noopener noreferrer" className="group flex min-h-72 flex-col overflow-hidden rounded-[2rem] border border-emerald-100 bg-[linear-gradient(145deg,#f2fff9_0%,#ffffff_58%)] p-6 shadow-[0_20px_50px_-34px_rgba(5,150,105,0.45)] transition hover:-translate-y-1 hover:border-emerald-300 sm:p-8">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><Store className="size-7" /></span>
          <h2 className="mt-6 text-2xl font-black text-slate-950">Boutique officielle</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">Découvrez les créations, coffrets et produits officiels Yad Shlouhim dans la boutique en ligne.</p>
          <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-black text-emerald-700">Ouvrir la boutique <ExternalLink className="size-4" /></span>
        </a>
      </div>

      <p className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-xs font-medium leading-5 text-slate-500">
        Les annonces communautaires sont publiées par des utilisateurs indépendants. EasyCom-AI ne reçoit pas les paiements et n’intervient pas dans la livraison ou les remboursements.
      </p>
    </div>
  );
}
