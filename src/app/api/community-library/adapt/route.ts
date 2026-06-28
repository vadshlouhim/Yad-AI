import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import OpenAI from "openai";

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

async function getAuthorizedCommunity(userId: string) {
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("communityId").eq("id", userId).single();
  return profile?.communityId ?? null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const communityId = await getAuthorizedCommunity(user.id);
  if (!communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  const admin = createAdminClient();
  const { data: community } = await admin.from("Community").select("plan, name, tone").eq("id", communityId).single();
  if (!community || community.plan === "FREE_TRIAL") {
    return NextResponse.json({ error: "Abonnement requis pour adapter une ressource" }, { status: 402 });
  }

  const body = await request.json() as Record<string, unknown>;
  const { action, resourceId, instructions } = body;

  if (!resourceId) return NextResponse.json({ error: "resourceId requis" }, { status: 400 });

  const { data: resource, error: resourceError } = await admin
    .from("community_resources")
    .select("id, title, description, category, theme, fileUrl, fileType")
    .eq("id", String(resourceId))
    .eq("communityId", communityId)
    .single();

  if (resourceError || !resource) {
    return NextResponse.json({ error: "Ressource introuvable" }, { status: 404 });
  }

  if (action === "generate-whatsapp-text") {
    return handleGenerateWhatsApp(resource, community, String(instructions ?? ""));
  }

  if (action === "adapt-description") {
    return handleAdaptDescription(resource, community, String(instructions ?? ""));
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}

async function handleGenerateWhatsApp(
  resource: { title: string; description: string; category: string; theme: string },
  community: { name: string; tone: string | null },
  instructions: string
) {
  const tone = community.tone ?? "chaleureux et communautaire";
  const prompt = `Tu es un assistant de communication pour la communauté juive "${community.name}".

Rédige un message WhatsApp attractif pour partager cette ressource avec les membres :
- Titre : ${resource.title}
- Description : ${resource.description}
- Catégorie : ${resource.category}
- Thème : ${resource.theme}
- Ton de la communauté : ${tone}
${instructions ? `- Instructions spécifiques : ${instructions}` : ""}

Règles :
- Message court et accrocheur (3-5 lignes max)
- Commence par une ligne d'accroche avec un emoji
- Mentionne brièvement le contenu de la ressource
- Termine par un appel à l'action simple
- Style : ${tone}
- Uniquement en français

Réponds UNIQUEMENT avec le texte du message WhatsApp, sans guillemets ni formatage supplémentaire.`;

  try {
    const completion = await openrouter.chat.completions.create({
      model: "deepseek/deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.7,
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ error: "Erreur lors de la génération" }, { status: 500 });
  }
}

async function handleAdaptDescription(
  resource: { title: string; description: string; category: string; theme: string },
  community: { name: string; tone: string | null },
  instructions: string
) {
  const tone = community.tone ?? "chaleureux et communautaire";
  const prompt = `Tu es un assistant de communication pour la communauté juive "${community.name}".

Adapte la description de cette ressource selon les instructions spécifiques :
- Titre original : ${resource.title}
- Description originale : ${resource.description}
- Catégorie : ${resource.category}
- Thème : ${resource.theme}
- Ton : ${tone}
- Instructions : ${instructions || "Adapte pour un public familial francophone"}

IMPORTANT : Tu crées une NOUVELLE VERSION adaptée. L'original n'est PAS modifié.

Réponds UNIQUEMENT avec un objet JSON :
{
  "title": "nouveau titre adapté",
  "description": "nouvelle description adaptée, max 250 caractères"
}`;

  try {
    const completion = await openrouter.chat.completions.create({
      model: "deepseek/deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
      temperature: 0.5,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const adapted = jsonMatch ? JSON.parse(jsonMatch[0]) : { title: resource.title, description: resource.description };

    return NextResponse.json({ adapted });
  } catch {
    return NextResponse.json({ error: "Erreur lors de l'adaptation" }, { status: 500 });
  }
}
