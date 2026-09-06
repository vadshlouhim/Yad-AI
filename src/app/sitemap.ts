import type { MetadataRoute } from "next";
import { EASYCOM_AGENTS } from "@/lib/agents";
import { getPublishedBlogArticles } from "@/lib/blog/server";
import { absoluteUrl, SITE_URL } from "@/lib/site-url";

export const revalidate = 3600;

const STATIC_ROUTES = [
  { path: "/", priority: 1, changeFrequency: "weekly" as const },
  { path: "/blog", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/affiches", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/tarification", priority: 0.85, changeFrequency: "monthly" as const },
  { path: "/method", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/contact", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/help", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/privacy", priority: 0.5, changeFrequency: "yearly" as const },
  { path: "/legal/terms", priority: 0.5, changeFrequency: "yearly" as const },
  { path: "/cookies", priority: 0.4, changeFrequency: "yearly" as const },
  { path: "/site-map", priority: 0.4, changeFrequency: "monthly" as const },
  { path: "/data-deletion", priority: 0.4, changeFrequency: "yearly" as const },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getPublishedBlogArticles();
  const siteOrigin = new URL(SITE_URL).origin;

  const articleEntries: MetadataRoute.Sitemap = articles.flatMap((article) => {
    const url = absoluteUrl(article.canonicalUrl ?? `/blog/${article.slug}`);

    // An external canonical must not compete with an EasyCom URL in the sitemap.
    if (new URL(url).origin !== siteOrigin) return [];

    return [{
      url,
      lastModified: new Date(article.updatedAt),
      changeFrequency: "monthly" as const,
      priority: article.isFeatured ? 0.85 : 0.75,
      images: article.coverImageUrl ? [absoluteUrl(article.coverImageUrl)] : undefined,
    }];
  });

  return [
    ...STATIC_ROUTES.map((route) => ({
      url: absoluteUrl(route.path),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...EASYCOM_AGENTS.map((agent) => ({
      url: absoluteUrl(`/agents/${agent.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.8,
      images: [absoluteUrl(agent.image)],
    })),
    ...articleEntries,
  ];
}
