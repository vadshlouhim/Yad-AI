import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import OpenAI from "openai";
import { RESOURCE_CATEGORIES, RESOURCE_THEMES, type ResourceCategory, type ResourceTheme } from "@/lib/community-library";

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

async function getAuthorizedCommunity(userId: string) {
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("communityId").eq("id", userId).single();
  return profile?.communityId ?? null;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const communityId = await getAuthorizedCommunity(user.id);
  if (!communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 20;
  const offset = (page - 1) * limit;

  const admin = createAdminClient();
  const { data, count, error } = await admin
    .from("community_resource_requests")
    .select("*", { count: "exact" })
    .eq("communityId", communityId)
    .eq("status", "open")
    .order("createdAt", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    if (error.code === "42P01") return NextResponse.json({ data: [], total: 0 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [], total: count ?? 0 });
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
    return NextResponse.json({ error: "Abonnement requis pour faire une demande" }, { status: 402 });
  }

  const body = await request.json() as Record<string, unknown>;
  const { action } = body;

  if (action === "refine") {
    return handleRefineRequest(body);
  }

  if (action === "create") {
    return handleCreateRequest(body, communityId, admin);
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}

async function handleRefineRequest(body: Record<string, unknown>) {
  const { title, description, category, theme } = body;

  const prompt = `Tu es un assistant pour une bibliothèque de ressources communautaires juives francophones.
Améliore et clarifie cette demande de ressource pour qu'elle soit facilement compréhensible par les membres de la communauté.

Demande originale :
- Titre : ${String(title ?? "")}
- Description : ${String(description ?? "")}
- Catégorie souhaitée : ${String(category ?? "")}
- Thème : ${String(theme ?? "")}

Réponds UNIQUEMENT avec un objet JSON valide avec ces champs :
{
  "title": "titre amélioré, clair et concis",
  "description": "description améliorée, 2-3 phrases, précise et actionnable, max 300 caractères"
}`;

  try {
    const completion = await openrouter.chat.completions.create({
      model: "deepseek/deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
      temperature: 0.4,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const refined = jsonMatch ? JSON.parse(jsonMatch[0]) : { title, description };

    return NextResponse.json({ refined });
  } catch {
    return NextResponse.json({ refined: { title, description } });
  }
}

async function handleCreateRequest(
  body: Record<string, unknown>,
  communityId: string,
  admin: ReturnType<typeof createAdminClient>
) {
  const { title, description, category, theme, urgency, aiRefined } = body;

  if (!title || !description || !category || !theme) {
    return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
  }
  if (!RESOURCE_CATEGORIES.includes(category as ResourceCategory)) {
    return NextResponse.json({ error: "Catégorie invalide" }, { status: 400 });
  }
  if (!RESOURCE_THEMES.includes(theme as ResourceTheme)) {
    return NextResponse.json({ error: "Thème invalide" }, { status: 400 });
  }

  const validUrgencies = ["low", "medium", "high"];
  const safeUrgency = validUrgencies.includes(String(urgency)) ? String(urgency) : "medium";

  const { data, error } = await admin
    .from("community_resource_requests")
    .insert({
      id: crypto.randomUUID(),
      communityId,
      title: String(title).trim(),
      description: String(description).trim(),
      category,
      theme,
      urgency: safeUrgency,
      status: "open",
      aiRefined: Boolean(aiRefined),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
