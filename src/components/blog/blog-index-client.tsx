"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FileText, Search, Sparkles } from "lucide-react";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicNavbar } from "@/components/layout/public-navbar";
import type { BlogArticle } from "@/lib/blog/articles";

const ARTICLES_PER_PAGE = 6;

export function BlogIndexClient({ articles }: { articles: BlogArticle[] }) {
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredArticles = useMemo(() => {
    if (!normalizedQuery) return articles;
    return articles.filter((article) =>
      [article.title, article.excerpt, article.category, article.tags.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [articles, normalizedQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / ARTICLES_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedArticles = filteredArticles.slice(
    (safeCurrentPage - 1) * ARTICLES_PER_PAGE,
    safeCurrentPage * ARTICLES_PER_PAGE
  );
  const featuredArticle = safeCurrentPage === 1 ? paginatedArticles[0] ?? articles[0] ?? null : null;
  const secondaryArticles = featuredArticle
    ? paginatedArticles.filter((article) => article.id !== featuredArticle.id)
    : paginatedArticles;

  function goToPage(page: number) {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <PublicNavbar />

      <section className="border-b border-slate-200 bg-white px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-4xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-blue-700">
            <Sparkles className="size-3.5" />
            Blog EasyCom IA
          </p>
          <h1 className="mx-auto mt-5 max-w-4xl text-[clamp(2.3rem,7vw,4.5rem)] font-black leading-[1.02] tracking-tight">
            Guides pratiques pour mieux communiquer avec l’IA
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            Réseaux sociaux, WhatsApp, email, avis Google, référencement et automatisations : des ressources simples pour communiquer plus régulièrement.
          </p>

          <label className="relative mx-auto mt-8 block max-w-2xl">
            <Search className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Rechercher : WhatsApp, SEO, avis Google..."
              className="h-14 w-full rounded-full border border-slate-200 bg-white pl-13 pr-5 text-center text-sm font-semibold text-slate-800 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </label>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {featuredArticle && (
            <Link
              href={`/blog/${featuredArticle.slug}`}
              className="grid overflow-hidden rounded-[2rem] border border-slate-200 bg-white text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl lg:grid-cols-[0.95fr_1.05fr]"
            >
              <div className="relative min-h-[280px] bg-gradient-to-br from-blue-100 via-white to-emerald-100">
                {featuredArticle.coverImageUrl ? (
                  <Image src={featuredArticle.coverImageUrl} alt={featuredArticle.coverImageAlt} fill className="object-cover" sizes="(min-width: 1024px) 45vw, 100vw" />
                ) : (
                  <div className="flex h-full min-h-[280px] items-center justify-center">
                    <div className="rounded-[2rem] bg-white/85 px-6 py-5 text-center shadow-sm">
                      <FileText className="mx-auto size-8 text-blue-700" />
                      <p className="mt-3 text-sm font-black text-blue-700">{featuredArticle.category}</p>
                    </div>
                  </div>
                )}
              </div>
              <article className="flex flex-col items-center justify-center p-6 sm:p-8">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Article à la une</p>
                <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">{featuredArticle.title}</h2>
                <p className="mt-4 text-sm leading-7 text-slate-600">{featuredArticle.excerpt}</p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {featuredArticle.tags.slice(0, 4).map((tag) => (
                    <span key={tag} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                      {tag}
                    </span>
                  ))}
                </div>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-black text-blue-700">
                  Lire l’article <ArrowRight className="size-4" />
                </span>
              </article>
            </Link>
          )}

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {secondaryArticles.map((article) => (
              <Link key={article.id} href={`/blog/${article.slug}`} className="group overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="relative h-44 bg-gradient-to-br from-slate-100 via-white to-blue-100">
                  {article.coverImageUrl ? (
                    <Image src={article.coverImageUrl} alt={article.coverImageAlt} fill className="object-cover transition group-hover:scale-[1.03]" sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm font-black text-blue-700">{article.category}</div>
                  )}
                </div>
                <article className="p-5">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{article.category} · {article.readingMinutes} min</p>
                  <h2 className="mt-3 line-clamp-2 text-xl font-black tracking-tight text-slate-950">{article.title}</h2>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{article.excerpt}</p>
                </article>
              </Link>
            ))}
          </div>

          {filteredArticles.length === 0 && (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-lg font-black text-slate-950">Aucun article trouvé</p>
              <p className="mt-2 text-sm text-slate-500">Essayez une recherche plus large, par exemple “WhatsApp” ou “SEO”.</p>
            </div>
          )}

          {filteredArticles.length > ARTICLES_PER_PAGE && (
            <nav className="mt-10 flex flex-wrap items-center justify-center gap-2" aria-label="Pagination du blog">
              <button
                type="button"
                onClick={() => goToPage(Math.max(1, safeCurrentPage - 1))}
                disabled={safeCurrentPage === 1}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Précédent
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => goToPage(page)}
                  aria-current={safeCurrentPage === page ? "page" : undefined}
                  className={`h-10 min-w-10 rounded-full px-3 text-sm font-black transition ${
                    safeCurrentPage === page
                      ? "bg-blue-700 text-white shadow-sm shadow-blue-200"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                onClick={() => goToPage(Math.min(totalPages, safeCurrentPage + 1))}
                disabled={safeCurrentPage === totalPages}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Suivant
              </button>
            </nav>
          )}
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
