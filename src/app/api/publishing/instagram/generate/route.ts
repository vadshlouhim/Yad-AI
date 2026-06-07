import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateContent } from "@/lib/ai/engine";
import { buildTemplateSuggestions } from "@/lib/templates/shared";
import { renderTemplatePoster } from "@/lib/templates/render";

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

type DesignZone = {
  id: string;
  label: string;
  type: string;
  defaultText: string;
};

function removeAsterisks(value: string) {
  return value.replace(/\*/g, "");
}

function buildInstagramTitle(caption: string, fallback: string) {
  const firstLine = caption
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  return firstLine ? firstLine.slice(0, 120) : fallback;
}

function buildInstagramCaption(content: {
  body: string;
  bodyHebrew?: string;
  hashtags?: string[];
}) {
  const parts = [
    content.body.trim(),
    content.bodyHebrew?.trim() || "",
    (content.hashtags ?? []).slice(0, 5).join(" ").trim(),
  ].filter(Boolean);

  return parts.join("\n\n");
}

async function generatePosterTexts(params: {
  community: {
    name?: string | null;
    city?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    address?: string | null;
    religiousStream?: string | null;
    tone?: string | null;
  } | null;
  template: {
    name: string;
    category: string;
    design: unknown;
  };
  userPrompt: string;
  caption: string;
}) {
  const { community, template, userPrompt, caption } = params;
  const designZones = (template.design as DesignZone[] | null) ?? [];

  if (designZones.length === 0) {
    return {};
  }

  const zonesDescription = designZones
    .map(
      (zone) =>
        `- "${zone.label}" (id: ${zone.id}, type: ${zone.type}) - texte par défaut : "${zone.defaultText}"`
    )
    .join("\n");

  const prompt = `Tu prépares une affiche Instagram pour une communauté.

Contexte de la communauté :
- Nom : ${community?.name ?? "Non spécifié"}
- Ville : ${community?.city ?? "Non spécifié"}
- Téléphone : ${community?.phone ?? "Non spécifié"}
- Email : ${community?.email ?? "Non spécifié"}
- Site web : ${community?.website ?? "Non spécifié"}
- Adresse : ${community?.address ?? "Non spécifié"}
- Courant : ${community?.religiousStream ?? "Non spécifié"}
- Ton : ${community?.tone ?? "MODERN"}

Demande utilisateur :
${userPrompt}

Texte Instagram déjà préparé :
${caption}

Template choisi : "${template.name}" (catégorie : ${template.category})

Zones éditables :
${zonesDescription}

Règles :
- Génère un texte court et percutant pour chaque zone.
- Garde un style cohérent avec Instagram et avec le ton de la communauté.
- Réutilise les informations déjà présentes dans la demande utilisateur et le texte Instagram.
- N'ajoute pas de commentaire hors JSON.
- N'utilise jamais d'astérisques.

Réponds UNIQUEMENT en JSON valide avec la forme :
{ "zoneId": "texte" }`;

  const response = await openrouter.chat.completions.create({
    model: "google/gemini-2.5-flash",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = response.choices[0]?.message?.content ?? "";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error("Réponse IA invalide pour la génération de l'affiche Instagram");
  }

  const parsed = JSON.parse(jsonMatch[0]) as Record<string, string>;
  return Object.fromEntries(
    Object.entries(parsed).map(([key, value]) => [key, removeAsterisks(String(value))])
  );
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const userPrompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

    if (!userPrompt) {
      return NextResponse.json({ error: "Le prompt Instagram est requis." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("communityId")
      .eq("id", user.id)
      .single();

    if (!profile?.communityId) {
      return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });
    }

    const [{ data: community }, { data: templates }] = await Promise.all([
      admin
        .from("Community")
        .select("name, city, phone, email, website, address, religiousStream, tone")
        .eq("id", profile.communityId)
        .single(),
      admin
        .from("Template")
        .select("id, communityId, name, description, category, channelType, thumbnailUrl, previewUrl, tags, subCategory, isPremium, design, usageCount")
        .or(`isGlobal.eq.true,communityId.eq.${profile.communityId}`)
        .eq("isActive", true),
    ]);

    const eligibleTemplates = (templates ?? []).filter(
      (template) => template.channelType === null || template.channelType === "INSTAGRAM"
    );

    const templateSuggestion = buildTemplateSuggestions(eligibleTemplates, userPrompt, {
      limit: 1,
      communityId: profile.communityId,
      forceAtLeastOne: true,
    })[0];

    if (!templateSuggestion) {
      return NextResponse.json({ error: "Aucune affiche pertinente trouvée dans la bibliothèque." }, { status: 404 });
    }

    const { data: selectedTemplate } = await admin
      .from("Template")
      .select("*")
      .eq("id", templateSuggestion.id)
      .single();

    if (!selectedTemplate) {
      return NextResponse.json({ error: "Template Instagram introuvable." }, { status: 404 });
    }

    const generatedContent = await generateContent({
      communityId: profile.communityId,
      contentType: "GENERAL",
      channelType: "INSTAGRAM",
      customInstructions: userPrompt,
    });
    const instagramCaption = buildInstagramCaption(generatedContent);

    const generatedTexts = await generatePosterTexts({
      community,
      template: selectedTemplate,
      userPrompt,
      caption: instagramCaption,
    });

    const renderedPoster = await renderTemplatePoster({
      admin,
      template: selectedTemplate,
      communityId: profile.communityId,
      generatedTexts,
    });

    const draftId = crypto.randomUUID();
    const title = buildInstagramTitle(instagramCaption, templateSuggestion.name);
    const now = new Date().toISOString();

    await admin.from("ContentDraft").insert({
      id: draftId,
      communityId: profile.communityId,
      title,
      body: instagramCaption,
      hashtags: generatedContent.hashtags ?? [],
      imageUrl: renderedPoster.imageUrl,
      contentType: "GENERAL",
      status: "AI_PROPOSAL",
      aiGenerated: true,
      aiModel: "google/gemini-2.5-flash",
      aiPromptUsed: userPrompt,
      updatedAt: now,
    });

    await admin.from("ChannelAdaptation").upsert(
      {
        draftId,
        channelType: "INSTAGRAM",
        body: instagramCaption,
        hashtags: generatedContent.hashtags ?? [],
        cta: generatedContent.cta ?? null,
        imageUrl: renderedPoster.imageUrl,
        metadata: {
          templateId: selectedTemplate.id,
          templateName: selectedTemplate.name,
          templateReason: templateSuggestion.reason,
          generatedTexts,
        },
        updatedAt: now,
      },
      { onConflict: "draftId,channelType" }
    );

    return NextResponse.json({
      draftId,
      title,
      body: instagramCaption,
      hashtags: generatedContent.hashtags ?? [],
      imageUrl: renderedPoster.imageUrl,
      template: templateSuggestion,
      generatedTexts,
    });
  } catch (error) {
    console.error("[Instagram Generate]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
