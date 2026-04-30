"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ShoppingBag, X } from "lucide-react";
import { ArticleBuyButton } from "@/components/articles/article-buy-button";
import { formatArticlePrice } from "@/lib/articles/shared";

interface Article {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  content: string | null;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  tags: string[];
  isGlobal: boolean;
}

interface Props {
  articles: Article[];
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function ArticlesClient({ articles }: Props) {
  const [search, setSearch] = useState("");
  const searchValue = normalize(search);

  const filteredArticles = useMemo(() => {
    if (!searchValue) return articles;

    return articles.filter((article) =>
      normalize([article.name, article.description ?? "", ...(article.tags ?? [])].join(" ")).includes(searchValue)
    );
  }, [articles, searchValue]);

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50 p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
              Boutique
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Articles
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Les articles vendus sur le site apparaissent ici. Ils peuvent aussi être proposés
              automatiquement par l&apos;assistant IA quand ils sont pertinents.
            </p>
          </div>
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Articles actifs</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{articles.length}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="rounded-3xl border-slate-200 shadow-sm">
        <CardContent className="p-5">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un livre, une mezouza, un cadeau…"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-11 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                aria-label="Effacer la recherche"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {filteredArticles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
            <ShoppingBag className="mb-4 size-14" />
            <p className="text-lg font-medium text-slate-700">Aucun article trouvé</p>
            <p className="mt-1 text-sm">Ajoute des articles dans la table `Article` ou élargis ta recherche.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredArticles.map((article) => (
            <Card key={article.id} className="overflow-hidden rounded-3xl border-slate-200 shadow-sm">
              <div className="aspect-[4/3] bg-slate-100">
                {article.imageUrl ? (
                  <img
                    src={article.imageUrl}
                    alt={article.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-400">
                    <ShoppingBag className="size-12" />
                  </div>
                )}
              </div>
              <CardContent className="space-y-4 p-5">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {article.isGlobal && <Badge variant="outline">Catalogue global</Badge>}
                    {article.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900">{article.name}</h2>
                  {article.description && (
                    <p className="line-clamp-3 text-sm leading-6 text-slate-600">{article.description}</p>
                  )}
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Prix</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatArticlePrice(article.priceCents, article.currency)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Link href={`/dashboard/articles/${article.slug}`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      Voir l&apos;article
                    </Button>
                  </Link>
                  <ArticleBuyButton articleId={article.id} className="flex-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
