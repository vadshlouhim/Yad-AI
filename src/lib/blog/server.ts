import { createAdminClient } from "@/lib/supabase/admin";
import { FALLBACK_BLOG_ARTICLES, getFallbackArticleBySlug, normalizeBlogArticle, type BlogArticle } from "./articles";

function publicArticles(articles: BlogArticle[]) {
  return articles
    .filter((article) => article.status === "PUBLISHED" && article.isIndexable)
    .sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      return new Date(b.publishedAt ?? b.updatedAt).getTime() - new Date(a.publishedAt ?? a.updatedAt).getTime();
    });
}

export async function getPublishedBlogArticles(): Promise<BlogArticle[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("BlogArticle")
      .select("*")
      .eq("status", "PUBLISHED")
      .eq("isIndexable", true)
      .order("isFeatured", { ascending: false })
      .order("publishedAt", { ascending: false });

    if (error || !data) return publicArticles(FALLBACK_BLOG_ARTICLES);
    return publicArticles(data.map((row) => normalizeBlogArticle(row as Partial<BlogArticle> & { title: string; slug: string })));
  } catch {
    return publicArticles(FALLBACK_BLOG_ARTICLES);
  }
}

export async function getBlogArticleBySlug(slug: string): Promise<BlogArticle | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("BlogArticle")
      .select("*")
      .eq("slug", slug)
      .eq("status", "PUBLISHED")
      .maybeSingle();

    if (error || !data) return getFallbackArticleBySlug(slug);
    const article = normalizeBlogArticle(data as Partial<BlogArticle> & { title: string; slug: string });
    return article.isIndexable ? article : null;
  } catch {
    return getFallbackArticleBySlug(slug);
  }
}
