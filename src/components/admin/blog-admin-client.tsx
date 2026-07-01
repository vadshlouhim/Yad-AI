"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ImagePlus, Plus, Save, Search, Trash2, UploadCloud } from "lucide-react";
import { BLOG_CATEGORIES, slugifySeo, type BlogArticle, type BlogArticleStatus } from "@/lib/blog/articles";

type BlogDraft = BlogArticle;

const STATUS_OPTIONS: BlogArticleStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function BlogAdminClient({ initialArticles }: { initialArticles: BlogArticle[] }) {
  const [articles, setArticles] = useState(() => new Map(initialArticles.map((article) => [article.id, article])));
  const [selectedId, setSelectedId] = useState(initialArticles[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const allArticles = useMemo(
    () => Array.from(articles.values()).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [articles]
  );
  const selectedArticle = articles.get(selectedId) ?? allArticles[0] ?? null;
  const filteredArticles = allArticles.filter((article) => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return true;
    return [article.title, article.slug, article.category, article.tags.join(" ")].join(" ").toLowerCase().includes(normalized);
  });

  function updateSelectedArticle(patch: Partial<BlogDraft>) {
    if (!selectedArticle) return;
    const nextArticle = { ...selectedArticle, ...patch, updatedAt: new Date().toISOString() };
    setArticles((previous) => {
      const next = new Map(previous);
      next.set(nextArticle.id, nextArticle);
      return next;
    });
  }

  async function createArticle() {
    setCreating(true);
    setStatus(null);
    const response = await fetch("/api/admin/blog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Nouvel article SEO",
        slug: "nouvel-article-seo",
        excerpt: "Résumé SEO à compléter.",
        content: "Rédigez ici le contenu de l'article.",
        category: "Communication IA",
        tags: ["SEO", "EasyCom IA"],
        status: "DRAFT",
      }),
    });
    const payload = await response.json();
    setCreating(false);
    if (!response.ok) {
      setStatus(payload.error ?? "Impossible de créer l'article.");
      return;
    }
    setArticles((previous) => {
      const next = new Map(previous);
      next.set(payload.id, payload);
      return next;
    });
    setSelectedId(payload.id);
    setStatus("Article créé. Complétez son contenu puis publiez-le.");
  }

  async function saveArticle() {
    if (!selectedArticle) return;
    setSaving(true);
    setStatus(null);
    const response = await fetch(`/api/admin/blog/${selectedArticle.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selectedArticle),
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok) {
      setStatus(payload.error ?? "Impossible d'enregistrer l'article.");
      return;
    }
    setArticles((previous) => {
      const next = new Map(previous);
      next.set(payload.id, payload);
      return next;
    });
    setStatus("Article SEO enregistré.");
  }

  async function deleteArticle() {
    if (!selectedArticle) return;
    const confirmed = window.confirm(`Supprimer définitivement "${selectedArticle.title}" ?`);
    if (!confirmed) return;
    setDeleting(true);
    setStatus(null);
    const response = await fetch(`/api/admin/blog/${selectedArticle.id}`, { method: "DELETE" });
    const payload = await response.json();
    setDeleting(false);
    if (!response.ok) {
      setStatus(payload.error ?? "Impossible de supprimer l'article.");
      return;
    }
    setArticles((previous) => {
      const next = new Map(previous);
      next.delete(selectedArticle.id);
      return next;
    });
    setSelectedId("");
    setStatus("Article supprimé.");
  }

  async function uploadCover(file: File) {
    if (!selectedArticle) return;
    setUploading(true);
    setStatus(null);
    const form = new FormData();
    form.append("file", file);
    form.append("articleId", selectedArticle.id);
    form.append("title", selectedArticle.title);
    const response = await fetch("/api/admin/blog/upload-cover", { method: "POST", body: form });
    const payload = await response.json();
    setUploading(false);
    if (!response.ok) {
      setStatus(payload.error ?? "Upload impossible.");
      return;
    }
    updateSelectedArticle({ coverImageUrl: payload.url, coverImageAlt: selectedArticle.title });
    setStatus("Image convertie en WebP et renommée SEO-friendly.");
  }

  return (
    <main className="min-h-screen bg-[#f6f3ec] text-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:underline">
              <ArrowLeft className="size-4" />
              Retour admin global
            </Link>
            <h1 className="mt-5 text-4xl font-black tracking-tight">Blog SEO</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
              Gérez les articles publics, leurs métadonnées SEO, le statut d&apos;indexation et les images de couverture WebP.
            </p>
          </div>
          <button
            type="button"
            onClick={createArticle}
            disabled={creating}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            <Plus className="size-4" />
            {creating ? "Création..." : "Nouvel article"}
          </button>
        </div>

        {status && <p className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">{status}</p>}

        <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher..."
                className="h-11 w-full rounded-2xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-blue-400"
              />
            </label>
            <div className="mt-4 space-y-2">
              {filteredArticles.map((article) => (
                <button
                  key={article.id}
                  type="button"
                  onClick={() => setSelectedId(article.id)}
                  className={`w-full rounded-2xl border p-3 text-left transition ${selectedArticle?.id === article.id ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}
                >
                  <p className="line-clamp-2 text-sm font-black text-slate-950">{article.title}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{article.status} · /blog/{article.slug}</p>
                </button>
              ))}
            </div>
          </aside>

          {selectedArticle ? (
            <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-black text-slate-800 sm:col-span-2">
                    Titre H1
                    <input value={selectedArticle.title} onChange={(event) => updateSelectedArticle({ title: event.target.value, slug: slugifySeo(event.target.value) })} className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
                  </label>
                  <label className="text-sm font-black text-slate-800">
                    Slug SEO
                    <input value={selectedArticle.slug} onChange={(event) => updateSelectedArticle({ slug: slugifySeo(event.target.value) })} className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
                  </label>
                  <label className="text-sm font-black text-slate-800">
                    Catégorie
                    <select value={selectedArticle.category} onChange={(event) => updateSelectedArticle({ category: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400">
                      {BLOG_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                  </label>
                  <label className="text-sm font-black text-slate-800 sm:col-span-2">
                    Résumé visible
                    <textarea value={selectedArticle.excerpt} onChange={(event) => updateSelectedArticle({ excerpt: event.target.value })} rows={3} className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
                  </label>
                  <label className="text-sm font-black text-slate-800 sm:col-span-2">
                    Contenu
                    <textarea value={selectedArticle.content} onChange={(event) => updateSelectedArticle({ content: event.target.value })} rows={16} className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm leading-6 outline-none focus:border-blue-400" />
                  </label>
                </div>
              </div>

              <aside className="space-y-5">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-black">Publication</h2>
                  <div className="mt-4 grid gap-3">
                    <select value={selectedArticle.status} onChange={(event) => updateSelectedArticle({ status: event.target.value as BlogArticleStatus })} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-bold">
                      {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                    <button type="button" onClick={() => updateSelectedArticle({ isFeatured: !selectedArticle.isFeatured })} className={`rounded-2xl px-3 py-2 text-sm font-black ${selectedArticle.isFeatured ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                      {selectedArticle.isFeatured ? "Article à la une" : "Mettre à la une"}
                    </button>
                    <button type="button" onClick={() => updateSelectedArticle({ isIndexable: !selectedArticle.isIndexable })} className={`rounded-2xl px-3 py-2 text-sm font-black ${selectedArticle.isIndexable ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                      {selectedArticle.isIndexable ? "Indexable Google/IA" : "Noindex"}
                    </button>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-black">Image de couverture</h2>
                  <div
                    className="relative mt-4 flex min-h-44 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const file = event.dataTransfer.files[0];
                      if (file) void uploadCover(file);
                    }}
                  >
                    {selectedArticle.coverImageUrl ? (
                      <Image src={selectedArticle.coverImageUrl} alt={selectedArticle.coverImageAlt} fill className="object-cover" sizes="360px" />
                    ) : (
                      <div className="p-4 text-sm text-slate-500">
                        <ImagePlus className="mx-auto mb-2 size-7 text-blue-600" />
                        Glissez une image PNG, JPG ou WebP
                      </div>
                    )}
                  </div>
                  <label className="mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 hover:bg-blue-100">
                    <UploadCloud className="size-4" />
                    {uploading ? "Conversion..." : "Charger une image"}
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadCover(file); }} />
                  </label>
                  <label className="mt-4 block text-sm font-black text-slate-800">
                    Alt image
                    <input value={selectedArticle.coverImageAlt} onChange={(event) => updateSelectedArticle({ coverImageAlt: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
                  </label>
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-black">SEO</h2>
                  <label className="mt-4 block text-sm font-black text-slate-800">
                    Meta title
                    <input value={selectedArticle.metaTitle} onChange={(event) => updateSelectedArticle({ metaTitle: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
                  </label>
                  <label className="mt-4 block text-sm font-black text-slate-800">
                    Meta description
                    <textarea value={selectedArticle.metaDescription} onChange={(event) => updateSelectedArticle({ metaDescription: event.target.value })} rows={3} className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
                  </label>
                  <label className="mt-4 block text-sm font-black text-slate-800">
                    Tags (séparés par virgules)
                    <input value={selectedArticle.tags.join(", ")} onChange={(event) => updateSelectedArticle({ tags: parseTags(event.target.value) })} className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
                  </label>
                  <div className="mt-5 grid gap-2">
                    <button type="button" onClick={saveArticle} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-60">
                      <Save className="size-4" />
                      {saving ? "Enregistrement..." : "Enregistrer"}
                    </button>
                    <button type="button" onClick={deleteArticle} disabled={deleting} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700 hover:bg-red-100 disabled:opacity-60">
                      <Trash2 className="size-4" />
                      {deleting ? "Suppression..." : "Supprimer"}
                    </button>
                  </div>
                </div>
              </aside>
            </section>
          ) : (
            <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-lg font-black">Aucun article sélectionné</p>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
