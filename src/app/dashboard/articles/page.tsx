import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveArticleAssetUrl } from "@/lib/articles/shared";
import { ArticlesClient } from "@/components/articles/articles-client";

export const metadata: Metadata = { title: "Articles — Shalom IA" };

export default async function ArticlesPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const admin = createAdminClient();

  const { data: articles } = await admin
    .from("Article")
    .select("*")
    .eq("isActive", true)
    .or(`isGlobal.eq.true,communityId.eq.${communityId}`)
    .order("createdAt", { ascending: false });

  const hydratedArticles = (articles ?? []).map((article) => ({
    ...article,
    imageUrl: resolveArticleAssetUrl(article.imageUrl),
  }));

  return <ArticlesClient articles={hydratedArticles} />;
}
