import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BlogAdminClient } from "@/components/admin/blog-admin-client";
import { canAccessAdmin } from "@/lib/admin-access";
import { requireAuth } from "@/lib/auth";
import { normalizeBlogArticle, type BlogArticle } from "@/lib/blog/articles";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Blog SEO - Admin EasyCom IA" };

export default async function AdminBlogPage() {
  const { profile } = await requireAuth();
  if (!canAccessAdmin(profile)) redirect("/dashboard");

  const admin = createAdminClient();
  const { data } = await admin
    .from("BlogArticle")
    .select("*")
    .order("updatedAt", { ascending: false });

  const articles = (data ?? []).map((row) => normalizeBlogArticle(row as Partial<BlogArticle> & { title: string; slug: string }));
  return <BlogAdminClient initialArticles={articles} />;
}
