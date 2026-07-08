import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSystemPrompt, buildMemoryContext, buildDailyRoutineSystemPrompt, type DailyRoutine } from "@/lib/ai/prompts";
import { buildTemporalSystemContext } from "@/lib/ai/time-context";
import { getStoredShabbatTimes } from "@/lib/ai/engine";
import { getJewishHolidays, type JewishHoliday } from "@/lib/automation/hebcal";
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
  detectStrictCategory,
  isVagueCategoryRequest,
  getCategoryAmbiguityQuestion,
  CATEGORY_LABELS,
} from "@/lib/templates/shared";
import { analyzeTemplateVisuals } from "@/lib/templates/analysis";
import { runAssistant } from "@/lib/ai/assistant/runner";
import { TIER_LIMITS, getBillingGate, getBillingUsage, paywallResponse, tierLimitMessage } from "@/lib/billing";
import OpenAI from "openai";
import type { ChatCompletionContentPart } from "openai/resources/chat/completions";

interface ChatAttachment {
  url: string;
  type: string;
  name: string;
}

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
  attachments?: ChatAttachment[];
}

function isImageAttachment(att: ChatAttachment) {
  return att.type?.startsWith("image/");
}

// Texte enrichi (mention des pièces jointes) pour la persistance et l'analyse d'intention.
function describeAttachments(attachments: ChatAttachment[] | undefined): string {
  if (!attachments || attachments.length === 0) return "";
  const labels = attachments.map((att) =>
    isImageAttachment(att) ? `image jointe « ${att.name} »` : `document joint « ${att.name} » (${att.url})`
  );
  return `\n\n[Pièces jointes : ${labels.join(", ")}]`;
}

// Convertit les messages entrants en messages modèle, en intégrant les images
// jointes sous forme de parts multimodales analysables par le modèle de vision.
function toModelMessages(
  messages: IncomingMessage[]
): Array<{ role: "user" | "assistant"; content: string | ChatCompletionContentPart[] }> {
  return messages.map((m) => {
    const attachments = m.attachments ?? [];
    if (attachments.length === 0) return { role: m.role, content: m.content };

    const images = attachments.filter(isImageAttachment);
    const docs = attachments.filter((att) => !isImageAttachment(att));

    let text = m.content;
    if (docs.length > 0) {
      text += `\n\n[Documents joints à prendre en compte : ${docs
        .map((d) => `${d.name} (${d.url})`)
        .join(", ")}]`;
    }

    if (images.length === 0) {
      return { role: m.role, content: text };
    }

    const parts: ChatCompletionContentPart[] = [
      { type: "text", text: text.trim() || "Analyse la ou les images jointes." },
      ...images.map(
        (img): ChatCompletionContentPart => ({ type: "image_url", image_url: { url: img.url } })
      ),
    ];
    return { role: m.role, content: parts };
  });
}

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const MODEL = "google/gemini-2.5-flash";

// La boucle d'agent enchaîne plusieurs appels au modèle : on relève la limite de
// durée bien au-dessus des 10 s par défaut de Netlify pour ne pas couper le flux.
export const runtime = "nodejs";
export const maxDuration = 60;

interface CommunityContext {
  name: string;
  city: string | null;
  timezone: string;
  tone: string;
  language: string;
  signature: string | null;
  hashtags: string[] | null;
  editorialRules: string | null;
  communityType: string;
  religiousStream: string | null;
  vocabulary: { automationValidationMode?: string } | null;
  assistantActionMode: "AUTO" | "CONFIRM";
}

function getErrorDebug(error: unknown) {
  if (error && typeof error === "object") {
    const maybeResponse = error as { response?: { data?: unknown }; message?: unknown };
    return maybeResponse.response?.data ?? maybeResponse.message ?? error;
  }
  return error;
}

function isShabbatRequest(text: string): boolean {
  const normalized = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return ["chabbat", "shabbat", "paracha", "havdala", "bougies", "kiddouch", "kidouch"].some((k) =>
    normalized.includes(k)
  );
}

// L'assistant propose-t-il une affiche/visuel dans sa réponse ?
function proposesPoster(text: string): boolean {
  const normalized = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return ["affiche", "flyer", "visuel", "poster"].some((k) => normalized.includes(k));
}

function formatFrenchDate(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function cleanConversationTitle(value: string | null | undefined) {
  return (value ?? "")
    .replace(/\*\*/g, "")
    .replace(/[*_`#]/g, "")
    .replace(/^["'«\s]+|["'»\s.]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getUpcomingHolidays(holidays: JewishHoliday[], now: Date, limit = 8) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return holidays
    .filter((holiday) => new Date(`${holiday.date}T12:00:00`) >= today)
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
    .slice(0, limit);
}

function buildActionModeNote(mode: "AUTO" | "CONFIRM"): string {
  if (mode === "AUTO") {
    return `\n\nMODE D'EXÉCUTION : AUTOMATIQUE.
- Quand tu utilises un outil qui modifie le compte, il est exécuté immédiatement.
- Confirme alors clairement ce qui a été fait, sans demander d'autorisation.
- EXCEPTION : les actions sensibles (envois de masse, publications, suppressions, réponses publiques) demandent TOUJOURS une validation via le bouton affiché, même en mode automatique.`;
  }
  return `\n\nMODE D'EXÉCUTION : VALIDATION MANUELLE.
- Quand tu utilises un outil qui modifie le compte, l'action n'est PAS exécutée tout de suite : elle est proposée à l'utilisateur sous forme de carte à valider.
- Ne prétends jamais qu'une action est faite. Dis qu'elle attend sa confirmation via le bouton affiché.`;
}

function buildGroundingContext(
  events: Array<{ title: string; startDate: string; location: string | null }> | null,
  contactsCount: number | null
): string {
  const parts: string[] = [];
  if (typeof contactsCount === "number") parts.push(`Nombre de contacts (avec opt-in possible) : ${contactsCount}.`);
  if (events && events.length > 0) {
    parts.push("Prochains événements de l'Agenda connecté IA :");
    for (const e of events) {
      const d = new Date(e.startDate).toLocaleDateString("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
      parts.push(`- ${e.title} (${d}${e.location ? `, ${e.location}` : ""})`);
    }
  }
  if (parts.length === 0) return "";
  return `\n\nÉTAT ACTUEL DE LA COMMUNAUTÉ :\n${parts.join("\n")}\n- Appuie-toi sur ces informations pour proposer des actions concrètes (rappels, emails, publications liés à ces événements).`;
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
    const communityId = profile.communityId as string;

    const body = await request.json();
    const { messages, conversationId, selectedTemplateId, templateAction, mode } = body as {
      messages: IncomingMessage[];
      conversationId?: string;
      selectedTemplateId?: string | null;
      templateAction?: "select" | null;
      mode?: "daily_routine" | "simplified";
    };

    const isDailyRoutineMode = mode === "daily_routine";

    const lastUserMessage = messages[messages.length - 1];
    const isUserPrompt = lastUserMessage?.role === "user";
    const hasExplicitVisualIntent = isUserPrompt && looksLikeTemplateIntent(lastUserMessage.content);
    const hasExplicitArticleIntent = isUserPrompt && looksLikeArticleIntent(lastUserMessage.content);

    const billingGate = await getBillingGate(admin, user.id);
    if (isUserPrompt && !billingGate.isSuperAdmin) {
      const usage = await getBillingUsage(admin, communityId, billingGate.tier);
      if (usage.assistantMessages >= TIER_LIMITS[billingGate.tier].assistantMessages) {
        return paywallResponse(
          "assistant_messages",
          tierLimitMessage(billingGate.tier, "assistantMessages"),
          { assistantMessages: usage.assistantMessages },
          TIER_LIMITS[billingGate.tier]
        );
      }
    }

    // Templates/articles : chargés uniquement quand l'intention est explicite
    // (économie DB/latence — le bloc post-agent refait un fetch ciblé si besoin).
    const fetchTemplates = () =>
      admin
        .from("Template")
        .select("id, communityId, name, description, category, channelType, thumbnailUrl, previewUrl, tags, subCategory, isPremium, design, usageCount")
        .eq("isActive", true)
        .or(`isGlobal.eq.true,communityId.eq.${communityId}`)
        .limit(250);

    const [{ data: dbCommunity }, { data: memories }, { data: candidateTemplates }, { data: candidateArticles }, { data: gmailChannel }, { data: upcomingEvents }, { count: contactsCount }] = await Promise.all([
      admin
        .from("Community")
        .select("name, city, timezone, tone, language, signature, hashtags, editorialRules, communityType, religiousStream, vocabulary")
        .eq("id", communityId)
        .single(),
      admin
        .from("AIMemory")
        .select("*")
        .eq("communityId", communityId)
        .order("relevance", { ascending: false })
        .limit(10),
      isUserPrompt && (hasExplicitVisualIntent || selectedTemplateId)
        ? fetchTemplates()
        : Promise.resolve({ data: [] }),
      isUserPrompt && hasExplicitArticleIntent
        ? admin
            .from("Article")
            .select("id, communityId, slug, name, description, priceCents, currency, imageUrl, tags")
            .eq("isActive", true)
            .or(`isGlobal.eq.true,communityId.eq.${communityId}`)
            .limit(60)
        : Promise.resolve({ data: [] }),
      admin
        .from("Channel")
        .select("isConnected, handle")
        .eq("communityId", communityId)
        .eq("type", "EMAIL")
        .maybeSingle(),
      admin
        .from("Event")
        .select("title, startDate, location")
        .eq("communityId", communityId)
        .gte("startDate", new Date().toISOString())
        .neq("status", "ARCHIVED")
        .order("startDate", { ascending: true })
        .limit(5),
      admin
        .from("CommunityMember")
        .select("id", { count: "exact", head: true })
        .eq("communityId", communityId),
    ]);

    const communityData = (dbCommunity as Partial<CommunityContext> | null) ?? {};
    const community: CommunityContext = {
      name: communityData.name ?? "Ma communauté",
      city: communityData.city ?? "Paris",
      timezone: communityData.timezone ?? "Europe/Paris",
      tone: communityData.tone ?? "MODERN",
      language: communityData.language ?? "fr",
      signature: communityData.signature ?? null,
      hashtags: communityData.hashtags ?? [],
      editorialRules: communityData.editorialRules ?? null,
      communityType: communityData.communityType ?? "SYNAGOGUE",
      religiousStream: communityData.religiousStream ?? null,
      vocabulary: communityData.vocabulary ?? null,
      // Mode d'action de l'assistant dérivé de la préférence de validation existante
      // (onboarding + paramètres) : "automatic" → AUTO, sinon validation manuelle (CONFIRM).
      assistantActionMode: communityData.vocabulary?.automationValidationMode === "automatic" ? "AUTO" : "CONFIRM",
    };

    const { data: dailyRoutineMemory } = await admin
      .from("AIMemory")
      .select("value")
      .eq("communityId", communityId)
      .eq("type", "RECURRING_CONTENT")
      .eq("key", "daily_routine")
      .maybeSingle();

    const now = new Date();
    const timezone = community.timezone ?? "Europe/Paris";
    const [shabbatContext, currentYearHolidays, nextYearHolidays] = await Promise.all([
      getStoredShabbatTimes({ city: community.city ?? "Paris", timezone }),
      getJewishHolidays({ year: now.getFullYear() }),
      getJewishHolidays({ year: now.getFullYear() + 1 }),
    ]);
    const upcomingHolidays = getUpcomingHolidays([...currentYearHolidays, ...nextYearHolidays], now);
    const nextHoliday = upcomingHolidays[0] ?? null;
    const temporalContext = buildTemporalSystemContext({
      timezone,
      city: community.city,
      now,
      shabbatTimes: shabbatContext,
      nextHoliday,
      upcomingHolidays,
    });

    // Détection de catégorie stricte : si l'utilisateur demande un type précis d'affiche,
    // on filtre la banque à cette catégorie seulement. Jamais de mélange entre catégories.
    const detectedCategory = isUserPrompt ? detectStrictCategory(lastUserMessage.content) : null;
    const isVagueRequest = isUserPrompt && isVagueCategoryRequest(lastUserMessage.content, detectedCategory);

    const templateSuggestions = isUserPrompt && hasExplicitVisualIntent && !isVagueRequest
      ? buildTemplateSuggestions(candidateTemplates ?? [], lastUserMessage.content, {
          limit: 5,
          communityId,
          forceAtLeastOne: Boolean(detectedCategory),
          strictCategory: detectedCategory,
        })
      : [];
    const articleSuggestions = isUserPrompt
      ? buildArticleSuggestions(candidateArticles ?? [], lastUserMessage.content, {
          limit: 3,
          communityId,
          forceAtLeastOne: hasExplicitArticleIntent,
        })
      : [];
    const shouldSuggestTemplates = !selectedTemplateId && templateSuggestions.length > 0 && hasExplicitVisualIntent && !isVagueRequest;
    const shouldSuggestArticles =
      articleSuggestions.length > 0 &&
      (hasExplicitArticleIntent || articleSuggestions.some((article) => article.confidence >= 8));

    let selectedTemplateContext = "";
    let selectedTemplate:
      | { id: string; name: string; category: string; thumbnailUrl: string | null; previewUrl: string | null; design: unknown; editableZoneCount: number }
      | null = null;

    if (selectedTemplateId) {
      const { data: template } = await admin
        .from("Template")
        .select("id, name, category, thumbnailUrl, previewUrl, design")
        .eq("id", selectedTemplateId)
        .or(`isGlobal.eq.true,communityId.eq.${communityId}`)
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

    const dailyRoutine = dailyRoutineMemory?.value as DailyRoutine | null;

    const systemPrompt = isDailyRoutineMode
      ? `${temporalContext}\n\n${buildDailyRoutineSystemPrompt(community.name, community.city)}`
      : temporalContext + "\n\n" +
        buildSystemPrompt({ ...community, dailyRoutine }) +
        buildMemoryContext(memories ?? []) +
        (isUserPrompt && isShabbatRequest(lastUserMessage.content) && shabbatContext
          ? `\n\nCONTEXTE TEMPOREL CHABBAT :
- Quand l'utilisateur parle de "Chabbat" sans autre précision, il s'agit par défaut du prochain Chabbat à venir.
- Prochain Chabbat : ${shabbatContext.date ? formatFrenchDate(shabbatContext.date) : "Non précisé"}
- Date hébraïque : ${shabbatContext.hebrewDate || "Non précisée"}
- Paracha : ${shabbatContext.parasha || "Non précisée"}
- Allumage des bougies : ${shabbatContext.entry || "Non précisé"}
- Havdala : ${shabbatContext.exit || "Non précisée"}
- Utilise ces informations comme référence par défaut, sauf si l'utilisateur donne une autre date explicite.`
          : "") +
        selectedTemplateContext +
        buildActionModeNote(community.assistantActionMode) +
        buildGroundingContext(
          (upcomingEvents as Array<{ title: string; startDate: string; location: string | null }> | null) ?? null,
          contactsCount ?? null
        );

    if (conversationId && lastUserMessage?.role === "user") {
      await admin.from("ConversationMessage").insert({
        id: crypto.randomUUID(),
        conversationId,
        role: "user",
        content: lastUserMessage.content + describeAttachments(lastUserMessage.attachments),
      });
    }

    const encoder = new TextEncoder();
    let fullResponse = "";

    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        const persistAndClose = async () => {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          if (conversationId && fullResponse) {
            await admin.from("ConversationMessage").insert({
              id: crypto.randomUUID(),
              conversationId,
              role: "assistant",
              content: fullResponse,
            });
            await admin.from("Conversation").update({ updatedAt: new Date().toISOString() }).eq("id", conversationId);
            generateTitle(conversationId, lastUserMessage?.content ?? "", fullResponse, admin).catch(console.error);
          }
          controller.close();
        };

        try {
          // ── Demande vague nécessitant une clarification de sous-catégorie ──
          if (hasExplicitVisualIntent && isVagueRequest && detectedCategory && !selectedTemplateId) {
            const categoryLabel = CATEGORY_LABELS[detectedCategory] ?? detectedCategory;
            const question = getCategoryAmbiguityQuestion(detectedCategory);
            const clarificationMsg = `Pour te proposer les meilleures affiches ${categoryLabel.toLowerCase()}, j'ai besoin d'une précision :\n\n${question}`;
            fullResponse += clarificationMsg;
            send({ content: clarificationMsg });
            await persistAndClose();
            return;
          }

          // ── Suggestions d'affiches (intention visuelle explicite) ──
          if (shouldSuggestTemplates) {
            send({ type: "template_suggestions", templates: templateSuggestions });
          }
          if (shouldSuggestArticles) {
            send({ type: "article_suggestions", articles: articleSuggestions });
          }

          // ── Aucun modèle trouvé dans la catégorie demandée ──
          if (hasExplicitVisualIntent && detectedCategory && !isVagueRequest && templateSuggestions.length === 0 && !selectedTemplateId) {
            const categoryLabel = CATEGORY_LABELS[detectedCategory] ?? detectedCategory;
            const noTemplateMsg = `Aucun modèle n'est disponible actuellement dans la catégorie ${categoryLabel}.\n\nSouhaitez-vous que je crée une affiche originale à partir de vos informations, sans utiliser de modèle de la banque ?`;
            fullResponse += noTemplateMsg;
            send({ content: noTemplateMsg });
            await persistAndClose();
            return;
          }

          if (hasExplicitVisualIntent && shouldSuggestTemplates && !selectedTemplateId) {
            const countLabel = templateSuggestions.length > 1
              ? `${templateSuggestions.length} affiches pertinentes`
              : "une affiche pertinente";
            const selectionMessage = detectedCategory
              ? `Voici ${countLabel} dans la catégorie ${CATEGORY_LABELS[detectedCategory] ?? detectedCategory}. Clique sur Choisir sur celle qui te convient, et je préparerai ensuite les textes à personnaliser.\n\nSi aucune ne te convient, dis-le moi et je t'en proposerai d'autres dans la même catégorie.`
              : `Je te propose de choisir parmi ces affiches. Clique sur Choisir sur celle qui te correspond le mieux, et je préparerai ensuite les textes exacts à remplacer dessus.\n\nSi tu veux, tu peux aussi me préciser un angle plus précis comme la fête, le type d'événement, la date ou le public visé.`;
            fullResponse += selectionMessage;
            send({ content: selectionMessage });
            await persistAndClose();
            return;
          }

          // ── Sélection d'un template → analyse visuelle ──
          if (selectedTemplate && templateAction === "select") {
            const templateImageUrl = selectedTemplate.previewUrl ?? selectedTemplate.thumbnailUrl;
            const visualAnalysis = await analyzeTemplateVisuals({
              imageUrl: templateImageUrl,
              templateName: selectedTemplate.name,
              category: selectedTemplate.category,
              userRequest:
                messages.findLast((m) => m.role === "user" && m.content !== lastUserMessage.content)?.content ??
                lastUserMessage.content,
            });
            fullResponse =
              visualAnalysis.elements.length > 0
                ? buildTemplateSelectionPromptFromAnalysis({
                    templateName: selectedTemplate.name,
                    summary: visualAnalysis.summary,
                    elements: visualAnalysis.elements,
                  })
                : buildTemplateSelectionPrompt(selectedTemplate);
            send({ content: fullResponse });
            await persistAndClose();
            return;
          }

          // ── Assistant unifié (agent + outils) ──
          fullResponse = await runAssistant({
            openrouter,
            model: MODEL,
            systemPrompt,
            messages: toModelMessages(messages),
            admin,
            communityId,
            userId: user.id,
            actionMode: isDailyRoutineMode ? "AUTO" : community.assistantActionMode,
            gmailConnected: Boolean(gmailChannel?.isConnected),
            billingGate,
            emit: {
              delta: (text) => send({ content: text }),
              event: (obj) => send(obj),
            },
          });

          // ── Détection [QUOTIDIEN_PRET] dans le mode daily_routine ──
          if (isDailyRoutineMode && fullResponse.includes("[QUOTIDIEN_PRET]")) {
            fullResponse = fullResponse.replace("[QUOTIDIEN_PRET]", "").trim();
            send({ type: "daily_routine_ready" });
          }

          // ── Affiche suggérée quand l'assistant en propose une dans sa réponse ──
          // Si l'IA évoque une affiche/visuel pertinent (et qu'on n'a pas déjà
          // proposé de modèles ni de template sélectionné), on affiche directement
          // dans le chat les affiches les plus adaptées au thème de l'échange.
          // La catégorie détectée dans la demande originale est respectée.
          if (
            !isDailyRoutineMode &&
            !shouldSuggestTemplates &&
            !selectedTemplateId &&
            isUserPrompt &&
            proposesPoster(fullResponse)
          ) {
            // Fetch paresseux : les templates ne sont préchargés que sur intention
            // visuelle explicite — ici l'IA en propose spontanément une.
            const posterTemplates = (candidateTemplates?.length ?? 0) > 0
              ? candidateTemplates
              : (await fetchTemplates()).data;
            if ((posterTemplates?.length ?? 0) > 0) {
              const themeText = `${lastUserMessage.content}\n${fullResponse}`;
              const proposedCategory = detectedCategory ?? detectStrictCategory(fullResponse);
              const proposedTemplates = buildTemplateSuggestions(posterTemplates ?? [], themeText, {
                limit: 5,
                communityId,
                forceAtLeastOne: Boolean(proposedCategory),
                strictCategory: proposedCategory,
              });
              if (proposedTemplates.length > 0) {
                send({ type: "template_suggestions", templates: proposedTemplates });
              }
            }
          }

          await persistAndClose();
        } catch (error) {
          console.error("[AI Chat] Erreur streaming:", getErrorDebug(error));
          send({ error: "Erreur IA" });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
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
  assistantResponse: string,
  admin: ReturnType<typeof createAdminClient>
) {
  try {
    const { data: conversation } = await admin.from("Conversation").select("title").eq("id", conversationId).single();
    const currentTitle = conversation?.title?.trim();
    if (currentTitle && currentTitle !== "Nouvelle conversation") return;

    const response = await openrouter.chat.completions.create({
      model: MODEL,
      max_tokens: 40,
      messages: [
        {
          role: "system",
          content: [
            "Tu renommes une conversation pour l'historique utilisateur.",
            "Génère un titre clair, concret et mémorisable en français.",
            "3 à 6 mots maximum.",
            "Texte brut uniquement : pas de Markdown, pas de guillemets, pas de point final, pas d'emoji.",
            "Évite : Nouvelle conversation, Assistant IA, Aide, Discussion.",
          ].join("\n"),
        },
        {
          role: "user",
          content: `Demande utilisateur :\n${firstMessage}\n\nRéponse assistant :\n${assistantResponse.slice(0, 1200)}`,
        },
      ],
    });

    const title = cleanConversationTitle(response.choices[0]?.message?.content);
    if (title) {
      await admin.from("Conversation").update({ title, updatedAt: new Date().toISOString() }).eq("id", conversationId);
    }
  } catch (error) {
    console.error("[AI Chat] Erreur génération titre:", error);
  }
}
