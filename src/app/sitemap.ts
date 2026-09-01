import type { MetadataRoute } from "next";
import { getPublishedBlogArticles } from "@/lib/blog/server";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://easycom-ai.com";

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
  const now = new Date();

  return [
    ...STATIC_ROUTES.map((route) => ({
      url: `${SITE_URL}${route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...articles.map((article) => ({
      url: `${SITE_URL}/blog/${article.slug}`,
      lastModified: new Date(article.updatedAt),
      changeFrequency: "monthly" as const,
      priority: article.isFeatured ? 0.85 : 0.75,
    })),
  ];
}
