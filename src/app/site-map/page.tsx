import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedBlogArticles } from "@/lib/blog/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Plan du site",
  description: "Plan du site EasyCom IA : pages principales, ressources légales et articles du blog.",
  alternates: { canonical: "/site-map" },
};

const MAIN_LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/blog", label: "Blog" },
  { href: "/tarification", label: "Tarification" },
  { href: "/method", label: "Notre méthode" },
  { href: "/contact", label: "Contact" },
  { href: "/help", label: "Aide & FAQ" },
];

const LEGAL_LINKS = [
  { href: "/privacy", label: "Politique de confidentialité" },
  { href: "/legal/terms", label: "Conditions d'utilisation" },
  { href: "/cookies", label: "Politique cookies" },
  { href: "/data-deletion", label: "Suppression des données" },
  { href: "/llms.txt", label: "llms.txt" },
  { href: "/sitemap.xml", label: "Sitemap XML" },
];

export default async function SiteMapPage() {
  const articles = await getPublishedBlogArticles();

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="border-b border-slate-200 bg-gradient-to-b from-blue-50 to-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <Link href="/" className="text-sm font-bold text-blue-700 hover:underline">Retour à l&apos;accueil</Link>
          <h1 className="mt-6 text-[clamp(2rem,6vw,3.5rem)] font-black tracking-tight">Plan du site EasyCom IA</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
            Retrouvez les principales pages publiques, les ressources légales et les articles optimisés pour le référencement.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="rounded-[1.7rem] border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-xl font-black">Pages principales</h2>
          <div className="mt-5 grid gap-3">
            {MAIN_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm hover:text-blue-700">
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-[1.7rem] border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-xl font-black">Cadre légal & indexation</h2>
          <div className="mt-5 grid gap-3">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm hover:text-blue-700">
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-[1.7rem] border border-slate-200 bg-slate-50 p-6 lg:col-span-2">
          <h2 className="text-xl font-black">Articles du blog</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {articles.map((article) => (
              <Link key={article.id} href={`/blog/${article.slug}`} className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm hover:text-blue-700">
                {article.title}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
