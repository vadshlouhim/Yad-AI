import type { Metadata } from "next";
import { BlogIndexClient } from "@/components/blog/blog-index-client";
import { getPublishedBlogArticles } from "@/lib/blog/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog communication IA, réseaux sociaux et référencement",
  description:
    "Guides pratiques EasyCom IA pour automatiser la communication, organiser WhatsApp, Instagram, email, avis Google et améliorer le référencement.",
  alternates: { canonical: "/blog" },
};

export default async function BlogPage() {
  const articles = await getPublishedBlogArticles();
  return <BlogIndexClient articles={articles} />;
}
