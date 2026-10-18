import type { Metadata } from "next";
import { BlogIndexClient } from "@/components/blog/blog-index-client";
import { getPublishedBlogArticles } from "@/lib/blog/server";
import { getLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const he = (await getLocale()) === "he";
  return { title: he ? "בלוג תקשורת AI, רשתות חברתיות וקידום" : "Blog communication IA, réseaux sociaux et référencement", description: he ? "מדריכים מעשיים של EasyCom IA לאוטומציה של התקשורת, WhatsApp, Instagram, אימייל, ביקורות Google וקידום." : "Guides pratiques EasyCom IA pour automatiser la communication, organiser WhatsApp, Instagram, email, avis Google et améliorer le référencement.", alternates: { canonical: "/blog" }, openGraph: { locale: he ? "he_IL" : "fr_FR" } };
}

export default async function BlogPage() {
  const articles = await getPublishedBlogArticles();
  return <BlogIndexClient articles={articles} />;
}
