import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatArticlePrice, resolveArticleAssetUrl } from "@/lib/articles/shared";
import { ArticleBuyButton } from "@/components/articles/article-buy-button";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${slug.replaceAll("-", " ")} — Articles — Yad.ia`,
  };
}

export default async function ArticleDetailPage({ params }: Props) {
  const { slug } = await params;
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const admin = createAdminClient();

  const { data: article } = await admin
    .from("Article")
    .select("*")
    .eq("slug", slug)
    .eq("isActive", true)
    .or(`isGlobal.eq.true,communityId.eq.${communityId}`)
    .single();

  if (!article) {
    notFound();
  }

  const imageUrl = resolveArticleAssetUrl(article.imageUrl);

  return (
    <div className="space-y-6">
      <Link href="/dashboard/articles" className="inline-flex">
        <Button variant="ghost" className="gap-2">
          <ArrowLeft className="size-4" />
          Retour aux articles
        </Button>
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden rounded-3xl border-slate-200 shadow-sm">
          <div className="aspect-[4/3] bg-slate-100">
            {imageUrl ? (
              <img src={imageUrl} alt={article.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400">
                <ShoppingBag className="size-14" />
              </div>
            )}
          </div>
        </Card>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardContent className="space-y-5 p-6">
            <div className="flex flex-wrap gap-2">
              {article.isGlobal && <Badge variant="outline">Catalogue global</Badge>}
              {(article.tags ?? []).map((tag) => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">{article.name}</h1>
              {article.description && (
                <p className="mt-3 text-sm leading-7 text-slate-600">{article.description}</p>
              )}
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Prix</p>
              <p className="mt-1 text-3xl font-bold text-emerald-900">
                {formatArticlePrice(article.priceCents, article.currency)}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <ArticleBuyButton
                articleId={article.id}
                className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
              />
              <Link href="/dashboard/articles" className="flex-1">
                <Button variant="outline" className="w-full">
                  Continuer mes achats
                </Button>
              </Link>
            </div>

            {article.content && (
              <div className="border-t border-slate-200 pt-5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Détails
                </h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">
                  {article.content}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
