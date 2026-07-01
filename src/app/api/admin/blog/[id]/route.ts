import { canAccessAdmin } from "@/lib/admin-access";
import { estimateReadingMinutes, slugifySeo } from "@/lib/blog/articles";
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
  if (!Array.isArray(value)) return undefined;
  return value.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 20);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await assertCanManageBlog();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = await request.json();
  const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (body.title !== undefined) {
    const title = String(body.title).trim();
    if (title.length < 5) return NextResponse.json({ error: "Titre trop court" }, { status: 400 });
    updateData.title = title;
  }
  if (body.slug !== undefined) {
    const slug = slugifySeo(String(body.slug));
    if (slug.length < 5) return NextResponse.json({ error: "Slug SEO invalide" }, { status: 400 });
    updateData.slug = slug;
  }
  for (const field of ["excerpt", "content", "category", "coverImageAlt", "metaTitle", "metaDescription", "authorName"] as const) {
    if (body[field] !== undefined) updateData[field] = String(body[field]).trim();
  }
  if (body.content !== undefined) updateData.readingMinutes = estimateReadingMinutes(String(body.content));
  if (body.coverImageUrl !== undefined) updateData.coverImageUrl = body.coverImageUrl ? String(body.coverImageUrl).trim() : null;
  if (body.canonicalUrl !== undefined) updateData.canonicalUrl = body.canonicalUrl ? String(body.canonicalUrl).trim() : null;

  const tags = normalizeTags(body.tags);
  if (tags) updateData.tags = tags;

  if (body.status !== undefined) {
    const status = ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(String(body.status)) ? String(body.status) : "DRAFT";
    updateData.status = status;
    if (status === "PUBLISHED" && !body.publishedAt) updateData.publishedAt = new Date().toISOString();
  }
  if (body.publishedAt !== undefined) updateData.publishedAt = body.publishedAt ? String(body.publishedAt) : null;
  if (body.isFeatured !== undefined) updateData.isFeatured = Boolean(body.isFeatured);
  if (body.isIndexable !== undefined) updateData.isIndexable = Boolean(body.isIndexable);

  const { data, error } = await guard.admin.from("BlogArticle").update(updateData).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await assertCanManageBlog();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const { error } = await guard.admin.from("BlogArticle").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
