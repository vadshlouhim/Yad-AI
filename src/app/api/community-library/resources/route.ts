import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { RESOURCE_CATEGORIES, RESOURCE_THEMES, type ResourceCategory, type ResourceTheme } from "@/lib/community-library";

async function getAuthorizedCommunity(userId: string) {
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("communityId").eq("id", userId).single();
  return profile?.communityId ?? null;
}

function getSearchTerms(value: string) {
  const ignoredWords = new Set([
    "je", "tu", "il", "elle", "nous", "vous", "ils", "elles",
    "un", "une", "des", "le", "la", "les", "de", "du", "au", "aux",
    "et", "ou", "sur", "pour", "avec", "dans", "en", "que", "qui",
    "cherche", "recherche", "besoin",
  ]);

  return value
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((term) => term.trim().toLocaleLowerCase("fr"))
    .filter((term) => term.length >= 2 && !ignoredWords.has(term))
    .slice(0, 6);
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const communityId = await getAuthorizedCommunity(user.id);
  if (!communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const category = searchParams.get("category") ?? "";
  const theme = searchParams.get("theme") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 20;
  const offset = (page - 1) * limit;

  const admin = createAdminClient();
  let query = admin
    .from("community_resources")
    .select("*", { count: "exact" })
    .eq("communityId", communityId)
    .eq("status", "published")
    .order("isFeatured", { ascending: false })
    .order("createdAt", { ascending: false })
    .range(offset, offset + limit - 1);

  const searchTerms = getSearchTerms(q);
  for (const term of searchTerms) {
    query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%,keywords.cs.{${term}}`);
  }
  if (category && RESOURCE_CATEGORIES.includes(category as ResourceCategory)) {
    query = query.eq("category", category);
  }
  if (theme && RESOURCE_THEMES.includes(theme as ResourceTheme)) {
    query = query.eq("theme", theme);
  }

  const { data, count, error } = await query;
  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json({ data: [], total: 0, page, hasMore: false });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [], total: count ?? 0, page, hasMore: (count ?? 0) > offset + limit });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const communityId = await getAuthorizedCommunity(user.id);
  if (!communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  const admin = createAdminClient();
  const { data: community } = await admin.from("Community").select("plan").eq("id", communityId).single();
  if (!community || community.plan === "FREE_TRIAL") {
    return NextResponse.json({ error: "Abonnement requis" }, { status: 402 });
  }

  const body = await request.json() as Record<string, unknown>;
  const { title, description, category, theme, keywords, fileUrl, fileType, fileSize, thumbnailUrl } = body;

  if (!title || !description || !category || !theme || !fileUrl || !fileType || !fileSize) {
    return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
  }
  if (!RESOURCE_CATEGORIES.includes(category as ResourceCategory)) {
    return NextResponse.json({ error: "Catégorie invalide" }, { status: 400 });
  }
  if (!RESOURCE_THEMES.includes(theme as ResourceTheme)) {
    return NextResponse.json({ error: "Thème invalide" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("community_resources")
    .insert({
      id: crypto.randomUUID(),
      communityId,
      title: String(title).trim(),
      description: String(description).trim(),
      category,
      theme,
      keywords: Array.isArray(keywords) ? keywords.map(String) : [],
      language: "fr",
      fileUrl: String(fileUrl),
      fileType,
      fileSize: Number(fileSize),
      thumbnailUrl: thumbnailUrl ? String(thumbnailUrl) : null,
      status: "published",
      isFeatured: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const communityId = await getAuthorizedCommunity(user.id);
  if (!communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  const body = await request.json() as Record<string, unknown>;
  const { id, action } = body;

  if (!id || !action) return NextResponse.json({ error: "id et action requis" }, { status: 400 });

  const admin = createAdminClient();
  const statusMap: Record<string, string> = { hide: "hidden", report: "reported", restore: "published" };
  const newStatus = statusMap[String(action)];
  if (!newStatus) return NextResponse.json({ error: "Action invalide" }, { status: 400 });

  const { error } = await admin
    .from("community_resources")
    .update({ status: newStatus, updatedAt: new Date().toISOString() })
    .eq("id", String(id))
    .eq("communityId", communityId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
