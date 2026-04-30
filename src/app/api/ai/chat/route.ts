import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSystemPrompt, buildMemoryContext } from "@/lib/ai/prompts";
import { getStoredShabbatTimes } from "@/lib/ai/engine";
import {
  buildArticleSuggestions,
  looksLikeArticleIntent,
} from "@/lib/articles/shared";
import {
  buildTemplateSelectionPromptFromAnalysis,
  buildTemplateSelectionPrompt,
  buildTemplateSuggestions,
  looksLikeTemplateIntent,
  resolveTemplateAssetUrl,
} from "@/lib/templates/shared";
import { analyzeTemplateVisuals } from "@/lib/templates/analysis";
import OpenAI from "openai";

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

function isShabbatRequest(text: string): boolean {
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return ["chabbat", "shabbat", "paracha", "havdala", "bougies", "kiddouch", "kidouch"].some((keyword) =>
    normalized.includes(keyword)
  );
}

function formatFrenchDate(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function removeAsterisks(value: string) {
  return value.replace(/\*/g, "");
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
    if (!profile?.communityId) {
      return NextResponse.json({ error: "Communauté non configurée" }, { status: 400 });
    }

    const body = await request.json();
    const { messages, conversationId, selectedTemplateId, templateAction } = body as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      conversationId?: string;
      selectedTemplateId?: string | null;
      templateAction?: "select" | null;
    };

    const lastUserMessage = messages[messages.length - 1];
    const isUserPrompt = lastUserMessage?.role === "user";
    const hasExplicitVisualIntent = isUserPrompt && looksLikeTemplateIntent(lastUserMessage.content);
    const hasExplicitArticleIntent = isUserPrompt && looksLikeArticleIntent(lastUserMessage.content);

    const [{ data: community }, { data: memories }, { data: candidateTemplates }, { data: candidateArticles }] = await Promise.all([
      admin
        .from("Community")
        .select("name, city, timezone, tone, language, signature, hashtags, editorialRules, communityType, religiousStream")
        .eq("id", profile.communityId)
        .single(),
      admin
        .from("AIMemory")
        .select("*")
        .eq("communityId", profile.communityId)
        .order("relevance", { ascending: false })
        .limit(10),
      isUserPrompt
        ? admin
            .from("Template")
            .select("id, communityId, name, description, category, channelType, thumbnailUrl, previewUrl, tags, subCategory, isPremium, design, usageCount")
            .eq("isActive", true)
            .or(`isGlobal.eq.true,communityId.eq.${profile.communityId}`)
            .limit(250)
        : Promise.resolve({ data: [] }),
      isUserPrompt
        ? admin
            .from("Article")
            .select("id, communityId, slug, name, description, priceCents, currency, imageUrl, tags")
            .eq("isActive", true)
            .or(`isGlobal.eq.true,communityId.eq.${profile.communityId}`)
            .limit(60)
        : Promise.resolve({ data: [] }),
    ]);

    if (!community) {
      return NextResponse.json({ error: "Communauté introuvable" }, { status: 404 });
    }

    const shabbatContext = isUserPrompt && isShabbatRequest(lastUserMessage.content)
      ? await getStoredShabbatTimes({
          city: community.city ?? "Paris",
          timezone: community.timezone ?? "Europe/Paris",
        })
      : null;

    const templateSuggestions = isUserPrompt
      ? buildTemplateSuggestions(candidateTemplates ?? [], lastUserMessage.content, {
          limit: 3,
          communityId: profile.communityId,
          forceAtLeastOne: hasExplicitVisualIntent,
        })
      : [];
    const articleSuggestions = isUserPrompt
      ? buildArticleSuggestions(candidateArticles ?? [], lastUserMessage.content, {
          limit: 3,
          communityId: profile.communityId,
          forceAtLeastOne: hasExplicitArticleIntent,
        })
      : [];
    const shouldSuggestTemplates =
      !selectedTemplateId &&
      templateSuggestions.length > 0 &&
      (hasExplicitVisualIntent || templateSuggestions.length >= 2);
    const shouldSuggestArticles =
      articleSuggestions.length > 0 &&
      (hasExplicitArticleIntent || articleSuggestions.some((article) => article.confidence >= 8));

    let selectedTemplateContext = "";
    let selectedTemplate:
      | {
          id: string;
          name: string;
          category: string;
          thumbnailUrl: string | null;
          previewUrl: string | null;
          design: unknown;
          editableZoneCount: number;
        }
      | null = null;

    if (selectedTemplateId) {
      const { data: template } = await admin
        .from("Template")
        .select("id, name, category, thumbnailUrl, previewUrl, design")
        .eq("id", selectedTemplateId)
        .or(`isGlobal.eq.true,communityId.eq.${profile.communityId}`)
        .single();

      if (template) {
        selectedTemplate = {
          ...template,
          thumbnailUrl: resolveTemplateAssetUrl(template.thumbnailUrl),
          previewUrl: resolveTemplateAssetUrl(template.previewUrl),
          editableZoneCount: Array.isArray(template.design) ? template.design.length : 0,
        };
        selectedTemplateContext = `\n\nTEMPLATE EN COURS :
- Nom : ${template.name}
- Catégorie : ${template.category}
- Tu aides maintenant l'utilisateur à préparer les textes de cette affiche.
- Pose des questions courtes et concrètes sur les éléments textuels à remplacer.
- Quand les informations semblent complètes, invite l'utilisateur à préparer puis confirmer l'affiche.`;
      }
    }

    const systemPrompt =
      buildSystemPrompt(community) +
      buildMemoryContext(memories ?? []) +
      (shabbatContext
        ? `\n\nCONTEXTE TEMPOREL CHABBAT :
- Quand l'utilisateur parle de "Chabbat" sans autre précision, il s'agit par défaut du prochain Chabbat à venir.
- Prochain Chabbat : ${formatFrenchDate(shabbatContext.date)}
- Date hébraïque : ${shabbatContext.hebrewDate || "Non précisée"}
- Paracha : ${shabbatContext.parasha || "Non précisée"}
- Allumage des bougies : ${shabbatContext.entry || "Non précisé"}
- Havdala : ${shabbatContext.exit || "Non précisée"}
- Ces horaires viennent du calendrier hébraïque enregistré pour la communauté, ou d'une source de secours si la ville n'est pas disponible.
- Utilise ces informations comme référence par défaut pour la conversation en cours, sauf si l'utilisateur donne une autre date explicite.
- Ne demande pas à l'utilisateur de rajouter les horaires, ils sont déjà fournis ici.`
        : "") +
      selectedTemplateContext;

    if (conversationId && lastUserMessage?.role === "user") {
      await admin.from("ConversationMessage").insert({
        id: crypto.randomUUID(),
        conversationId,
        role: "user",
        content: lastUserMessage.content,
      });
    }

    const encoder = new TextEncoder();
    let fullResponse = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (shouldSuggestTemplates) {
            try {
              await admin.from("AuditLog").insert(
                templateSuggestions.map((template, index) => ({
                  id: crypto.randomUUID(),
                  userId: user.id,
                  communityId: profile.communityId,
                  action: "template.suggested",
                  resource: "Template",
                  resourceId: template.id,
                  newData: {
                    source: "ai.chat",
                    prompt: lastUserMessage.content,
                    rank: index + 1,
                  },
                }))
              );
            } catch (auditError) {
              console.error("[AI Chat] Erreur audit suggestions templates:", auditError);
            }

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "template_suggestions",
                  templates: templateSuggestions,
                })}\n\n`
              )
            );
          }

          if (shouldSuggestArticles) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "article_suggestions",
                  articles: articleSuggestions,
                })}\n\n`
              )
            );
          }

          if (shouldSuggestTemplates) {
            const intro = hasExplicitVisualIntent
              ? "J'ai sélectionné dans ta bibliothèque des affiches qui correspondent à ta demande. Tu peux les voir juste en dessous.\n\n"
              : "Je t'ai aussi préparé dans ta bibliothèque quelques affiches qui collent bien au sujet de ta demande. Tu peux les voir juste en dessous.\n\n";
            fullResponse += intro;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: intro })}\n\n`)
            );
          }

          if (shouldSuggestArticles) {
            const intro = hasExplicitArticleIntent
              ? "J'ai aussi trouvé dans ta boutique des articles pertinents par rapport à ta demande. Tu peux voir le produit, son prix, puis ouvrir l'article ou commander directement.\n\n"
              : "Je t'ai aussi repéré quelques articles de ta boutique qui peuvent être pertinents dans ce contexte. Tu peux les voir juste en dessous.\n\n";
            fullResponse += intro;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: intro })}\n\n`)
            );
          }

          if (hasExplicitVisualIntent && shouldSuggestTemplates && !selectedTemplateId) {
            const selectionMessage =
              "Je te propose de choisir directement parmi ces affiches pertinentes. Clique sur Choisir sur celle qui te correspond le mieux, et je préparerai ensuite les textes exacts à remplacer dessus.\n\nSi tu veux, tu peux aussi me préciser un angle plus précis comme la fête, le type d'événement, la date ou le public visé.";
            fullResponse += selectionMessage;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: selectionMessage })}\n\n`)
            );
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));

            if (conversationId && fullResponse) {
              await admin.from("ConversationMessage").insert({
                id: crypto.randomUUID(),
                conversationId,
                role: "assistant",
                content: fullResponse,
              });

              await admin
                .from("Conversation")
                .update({ updatedAt: new Date().toISOString() })
                .eq("id", conversationId);
            }

            controller.close();
            return;
          }

          if (selectedTemplate && templateAction === "select") {
            const templateImageUrl = selectedTemplate.previewUrl ?? selectedTemplate.thumbnailUrl;
            const visualAnalysis = await analyzeTemplateVisuals({
              imageUrl: templateImageUrl,
              templateName: selectedTemplate.name,
              category: selectedTemplate.category,
              userRequest: messages.findLast((message) => message.role === "user" && message.content !== lastUserMessage.content)?.content
                ?? lastUserMessage.content,
            });

            fullResponse = visualAnalysis.elements.length > 0
              ? buildTemplateSelectionPromptFromAnalysis({
                  templateName: selectedTemplate.name,
                  summary: visualAnalysis.summary,
                  elements: visualAnalysis.elements,
                })
              : buildTemplateSelectionPrompt(selectedTemplate);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: fullResponse })}\n\n`)
            );
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));

            if (conversationId && fullResponse) {
              await admin.from("ConversationMessage").insert({
                id: crypto.randomUUID(),
                conversationId,
                role: "assistant",
                content: fullResponse,
              });

              await admin
                .from("Conversation")
                .update({ updatedAt: new Date().toISOString() })
                .eq("id", conversationId);
            }

            controller.close();
            return;
          }

          const openrouterStream = await openrouter.chat.completions.create({
            model: "google/gemini-2.5-flash",
            max_tokens: 2048,
            stream: true,
            messages: [
              { role: "system", content: systemPrompt },
              ...messages.slice(-20),
            ],
          });

          for await (const chunk of openrouterStream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              const cleanDelta = removeAsterisks(delta);
              fullResponse += cleanDelta;
              const data = JSON.stringify({ content: cleanDelta });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));

          if (conversationId && fullResponse) {
            await admin.from("ConversationMessage").insert({
              id: crypto.randomUUID(),
              conversationId,
              role: "assistant",
              content: fullResponse,
            });

            await admin
              .from("Conversation")
              .update({ updatedAt: new Date().toISOString() })
              .eq("id", conversationId);

            const { count } = await admin
              .from("ConversationMessage")
              .select("*", { count: "exact", head: true })
              .eq("conversationId", conversationId);

            if (count === 2) {
              generateTitle(conversationId, lastUserMessage.content, admin).catch(console.error);
            }
          }
        } catch (error) {
          console.error("[AI Chat] Erreur streaming:", error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: "Erreur IA" })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("[AI Chat] Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

async function generateTitle(
  conversationId: string,
  firstMessage: string,
  admin: ReturnType<typeof createAdminClient>
) {
  try {
    const response = await openrouter.chat.completions.create({
      model: "google/gemini-2.5-flash",
      max_tokens: 30,
      messages: [
        {
          role: "system",
          content: "Génère un titre très court (3-6 mots max) pour cette conversation. Réponds UNIQUEMENT avec le titre, sans guillemets ni ponctuation finale.",
        },
        { role: "user", content: firstMessage },
      ],
    });

    const title = response.choices[0]?.message?.content?.trim();
    if (title) {
      await admin
        .from("Conversation")
        .update({ title, updatedAt: new Date().toISOString() })
        .eq("id", conversationId);
    }
  } catch (error) {
    console.error("[AI Chat] Erreur génération titre:", error);
  }
}
