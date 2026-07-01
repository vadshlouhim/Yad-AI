import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getBlogArticleBySlug, getPublishedBlogArticles } from "@/lib/blog/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://easycom-ai.com";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getBlogArticleBySlug(slug);
  if (!article) return { title: "Article introuvable - EasyCom IA" };

  const canonical = article.canonicalUrl ?? `/blog/${article.slug}`;
  return {
    title: article.metaTitle,
    description: article.metaDescription,
    alternates: { canonical },
    openGraph: {
      title: article.metaTitle,
      description: article.metaDescription,
      type: "article",
      url: canonical.startsWith("http") ? canonical : `${SITE_URL}${canonical}`,
      images: article.coverImageUrl ? [{ url: article.coverImageUrl, alt: article.coverImageAlt }] : undefined,
      publishedTime: article.publishedAt ?? undefined,
      modifiedTime: article.updatedAt,
      authors: [article.authorName],
      tags: article.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: article.metaTitle,
      description: article.metaDescription,
      images: article.coverImageUrl ? [article.coverImageUrl] : undefined,
    },
    robots: article.isIndexable ? { index: true, follow: true } : { index: false, follow: false },
  };
}

function renderContent(content: string) {
  return content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, index) => (
      <p key={`${paragraph.slice(0, 24)}-${index}`} className="text-base leading-8 text-slate-700">
        {paragraph}
      </p>
    ));
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const [article, allArticles] = await Promise.all([getBlogArticleBySlug(slug), getPublishedBlogArticles()]);
  if (!article) notFound();

  const relatedArticles = allArticles.filter((item) => item.slug !== article.slug).slice(0, 3);
  const articleUrl = `${SITE_URL}/blog/${article.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.metaDescription,
    image: article.coverImageUrl ? [article.coverImageUrl] : undefined,
    author: { "@type": "Organization", name: article.authorName },
    publisher: { "@type": "Organization", name: "EasyCom IA", url: SITE_URL },
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    mainEntityOfPage: articleUrl,
  };

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="border-b border-slate-200 bg-gradient-to-b from-blue-50/80 to-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:underline">
            <ArrowLeft className="size-4" />
            Retour au blog
          </Link>
          <p className="mt-8 text-xs font-black uppercase tracking-[0.16em] text-blue-700">{article.category} · {article.readingMinutes} min</p>
          <h1 className="mt-4 text-[clamp(2.2rem,7vw,4rem)] font-black leading-[1.04] tracking-tight">{article.title}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">{article.excerpt}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-bold text-blue-700">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="relative mb-10 overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-blue-100 via-white to-emerald-100 shadow-sm">
          <div className="relative h-[320px]">
            {article.coverImageUrl ? (
              <Image src={article.coverImageUrl} alt={article.coverImageAlt} fill priority className="object-cover" sizes="(min-width: 1024px) 896px, 100vw" />
            ) : (
              <div className="flex h-full items-center justify-center text-center">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-blue-700">EasyCom IA</p>
                  <p className="mt-2 text-3xl font-black text-slate-950">{article.category}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">{renderContent(article.content)}</div>

        <div className="mt-12 grid gap-4 rounded-[2rem] border border-slate-200 bg-slate-50 p-5 sm:grid-cols-3">
          <Link href="/method" className="rounded-2xl bg-white p-4 text-sm font-bold text-slate-800 shadow-sm hover:text-blue-700">
            Découvrir notre méthode
          </Link>
          <Link href="/contact" className="rounded-2xl bg-white p-4 text-sm font-bold text-slate-800 shadow-sm hover:text-blue-700">
            Contacter EasyCom IA
          </Link>
          <a href="https://developers.google.com/search/docs" target="_blank" rel="noreferrer" className="inline-flex items-center justify-between rounded-2xl bg-white p-4 text-sm font-bold text-slate-800 shadow-sm hover:text-blue-700">
            Google Search Central
            <ExternalLink className="size-4" />
          </a>
        </div>
      </article>

      {relatedArticles.length > 0 && (
        <section className="border-t border-slate-200 bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-2xl font-black tracking-tight text-slate-950">À lire aussi</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {relatedArticles.map((related) => (
                <Link key={related.id} href={`/blog/${related.slug}`} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">{related.category}</p>
                  <h3 className="mt-3 line-clamp-2 text-lg font-black text-slate-950">{related.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{related.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
