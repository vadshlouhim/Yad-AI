import Link from "next/link";
import type { Metadata } from "next";
import { ExternalLink, Frame, ShoppingBag, Store } from "lucide-react";

export const metadata: Metadata = { title: "Boutique - Yad.ia" };

const shopLinks = [
  {
    label: "Articles Photos du Rabbi (Israel)",
    href: "https://pinson.co.il/",
    description: "Cadres, photos et articles depuis Israel.",
    icon: Frame,
    tone: "from-amber-50 to-orange-50 border-amber-100 text-amber-700",
  },
  {
    label: "Photos du Rabbi (France)",
    href: "https://cadredurabbi.fr/",
    description: "Photos et cadres disponibles en France.",
    icon: Frame,
    tone: "from-blue-50 to-cyan-50 border-blue-100 text-blue-700",
  },
  {
    label: "Articles pour la Shlihout",
    href: "https://linktr.ee/Yadshlouhim",
    description: "Selection utile pour synagogue, Beth Habad et terrain.",
    icon: ShoppingBag,
    tone: "from-emerald-50 to-teal-50 border-emerald-100 text-emerald-700",
  },
];

export default function BoutiquePage() {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#78350f,#b45309,#f59e0b)] p-[1px] shadow-[0_24px_60px_rgba(146,64,14,0.14)]">
        <div className="rounded-[calc(2rem-1px)] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_30%),linear-gradient(135deg,rgba(120,53,15,0.96),rgba(180,83,9,0.94),rgba(245,158,11,0.9))] px-6 py-8 text-white sm:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-50">
              <Store className="size-3.5" />
              Boutique
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              Boutique et articles religieux
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-amber-50/90">
              Retrouvez ici Des articles judaica Qui peuvent vous servir dans votre Synagogue ou Beth Habad
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {shopLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`group rounded-[1.75rem] border bg-gradient-to-br p-5 shadow-[0_14px_36px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(15,23,42,0.1)] ${item.tone}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/85 shadow-sm">
                <item.icon className="size-5" />
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/75 text-slate-500 transition-colors group-hover:text-slate-900">
                <ExternalLink className="size-4" />
              </span>
            </div>
            <h2 className="mt-4 text-lg font-black text-slate-900">{item.label}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
