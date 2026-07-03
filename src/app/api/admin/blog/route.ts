import { canAccessAdmin } from "@/lib/admin-access";
import { slugifySeo, estimateReadingMinutes } from "@/lib/blog/articles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function assertCanManageBlog() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, response: NextResponse.json({ error: "Non autorise" }, { status: 401 }) };

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("email, role").eq("id", user.id).single();
  if (!canAccessAdmin(profile)) {
    return { ok: false as const, response: NextResponse.json({ error: "Acces reserve au Super Admin" }, { status: 403 }) };
  }
  return { ok: true as const, admin };
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 20);
}

export async function POST(request: Request) {
  const guard = await assertCanManageBlog();
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const title = String(body.title ?? "Nouvel article SEO").trim();
  const slug = slugifySeo(String(body.slug ?? title));
  const content = String(body.content ?? "").trim();
  const excerpt = String(body.excerpt ?? "").trim();
  const now = new Date().toISOString();

  if (title.length < 5) return NextResponse.json({ error: "Titre trop court" }, { status: 400 });
  if (slug.length < 5) return NextResponse.json({ error: "Slug SEO invalide" }, { status: 400 });

  const { data, error } = await guard.admin
    .from("BlogArticle")
    .insert({
      id: `blog_${crypto.randomUUID()}`,
      slug,
      title,
      excerpt: excerpt || "Résumé à compléter pour le référencement.",
      content: content || "Contenu à compléter.",
      category: String(body.category ?? "Communication IA").trim() || "Communication IA",
      tags: normalizeTags(body.tags),
      coverImageUrl: body.coverImageUrl ? String(body.coverImageUrl).trim() : null,
      coverImageAlt: String(body.coverImageAlt ?? title).trim() || title,
      metaTitle: String(body.metaTitle ?? `${title} - EasyCom IA`).trim(),
      metaDescription: String(body.metaDescription ?? excerpt).trim() || excerpt || title,
      canonicalUrl: body.canonicalUrl ? String(body.canonicalUrl).trim() : null,
      authorName: String(body.authorName ?? "Équipe EasyCom IA").trim() || "Équipe EasyCom IA",
      readingMinutes: estimateReadingMinutes(content),
      status: body.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
      isFeatured: Boolean(body.isFeatured),
      isIndexable: body.isIndexable === undefined ? true : Boolean(body.isIndexable),
      publishedAt: body.status === "PUBLISHED" ? now : null,
      createdAt: now,
      updatedAt: now,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
