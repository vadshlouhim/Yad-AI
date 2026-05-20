import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSystemPrompt, buildMemoryContext, buildDailyRoutineSystemPrompt, type DailyRoutine } from "@/lib/ai/prompts";
import { buildTemporalSystemContext } from "@/lib/ai/time-context";
import { getStoredShabbatTimes } from "@/lib/ai/engine";
import { getJewishHolidays, type JewishHoliday } from "@/lib/automation/hebcal";
import { AUTOMATION_PRESETS, type AutomationPresetKey } from "@/lib/automation/presets";
import { presetAppliesToCommunity, type PresetWithRhythms } from "@/lib/automation/preset-utils";
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

interface AssistantActionCard {
  id: string;
  type: "automation" | "setting" | "navigation" | "creation";
  title: string;
  description: string;
  status?: string;
  href?: string;
  action?: {
    kind: "toggle_automation" | "trigger_automation" | "create_automation" | "create_shabbat_automation" | "open_daily_routine" | "switch_detailed";
    automationId?: string;
    isActive?: boolean;
    preset?: AutomationPresetKey;
    presetId?: string;
  };
}

interface AutomationSummary {
  id: string;
  presetId?: string | null;
  name: string;
  description: string | null;
  trigger: string;
  isActive: boolean;
  status: string;
  nextRunAt: string | null;
  lastRunAt: string | null;
}

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

function getUpcomingHoliday(holidays: JewishHoliday[], now: Date) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return getUpcomingHolidays(holidays, now, 1)[0] ?? null;
}

function getUpcomingHolidays(holidays: JewishHoliday[], now: Date, limit = 8) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return holidays
    .filter((holiday) => new Date(`${holiday.date}T12:00:00`) >= today)
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
    .slice(0, limit);
}

function removeAsterisks(value: string) {
  return value.replace(/\*/g, "");
}

function cleanConversationTitle(value: string | null | undefined) {
  return (value ?? "")
    .replace(/\*\*/g, "")
    .replace(/[*_`#]/g, "")
    .replace(/^["'«\s]+|["'»\s.]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeIntent(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatRelativeDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildAutomationCards(automations: AutomationSummary[]): AssistantActionCard[] {
  return automations.map((automation) => {
    const nextRun = formatRelativeDate(automation.nextRunAt);
    const lastRun = formatRelativeDate(automation.lastRunAt);
    const description = [
      automation.description,
      nextRun ? `Prochaine execution : ${nextRun}` : null,
      lastRun ? `Derniere execution : ${lastRun}` : null,
    ].filter(Boolean).join(" ");

    return {
      id: `automation-${automation.id}`,
      type: "automation",
      title: automation.name,
      description: description || `Declencheur : ${automation.trigger}`,
      status: automation.isActive ? "Actif" : "Pause",
      action: {
        kind: "toggle_automation",
        automationId: automation.id,
        isActive: automation.isActive,
      },
    };
  });
}

function buildAutomationSuggestionCards(
  automations: AutomationSummary[],
  presets: PresetWithRhythms[] = []
): AssistantActionCard[] {
  const existingNames = new Set(automations.map((automation) => normalizeIntent(automation.name)));

  if (presets.length > 0) {
    const existingPresetIds = new Set(automations.map((automation) => "presetId" in automation ? String((automation as AutomationSummary & { presetId?: string | null }).presetId ?? "") : ""));
    return presets
      .filter((preset) => !existingPresetIds.has(preset.id) && !existingNames.has(normalizeIntent(preset.title)))
      .map((preset) => ({
        id: `suggest-${preset.id}`,
        type: "creation",
        title: `${preset.icon ?? "⚡"} ${preset.title}`,
        description: `${preset.description ?? "Automatisation prédéfinie par l'admin global."}`,
        status: "Disponible",
        action: { kind: "create_automation", presetId: preset.id },
      }));
  }

  return (Object.entries(AUTOMATION_PRESETS) as Array<[AutomationPresetKey, typeof AUTOMATION_PRESETS[AutomationPresetKey]]>)
    .filter(([, preset]) => !existingNames.has(normalizeIntent(preset.name)))
    .map(([key, preset]) => ({
      id: `suggest-${key.toLowerCase().replace(/_/g, "-")}`,
      type: "creation",
      title: `${preset.logo} ${preset.name}`,
      description: `${preset.description} Canaux proposés : ${preset.channels.join(", ")}.`,
      status: "Disponible",
      action: { kind: "create_automation", preset: key },
    }));
}

function buildCurrentAutomationContent(automations: AutomationSummary[]) {
  const activeCount = automations.filter((automation) => automation.isActive).length;

  return [
    automations.length > 0
      ? `Vous avez ${automations.length} automatisation${automations.length > 1 ? "s" : ""}, dont ${activeCount} active${activeCount > 1 ? "s" : ""}.`
      : "Vous n’avez encore aucune automatisation.",
  ].join("\n");
}

function buildCreateAutomationContent(suggestionCards: AssistantActionCard[]) {
  return suggestionCards.length > 0
    ? "Voici uniquement les automatisations que vous pouvez encore créer."
    : "Toutes les automatisations disponibles sont déjà créées sur votre compte.";
}

function getSimplifiedShortcut(prompt: string, automations: AutomationSummary[], automationPresets: PresetWithRhythms[] = []): { content: string; actions: AssistantActionCard[] } | null {
  const intent = normalizeIntent(prompt);
  const talksAutomation = /automatisation|automation|programmation|automatique|automatiser|planifier|rappel automatique|publication automatique/.test(intent);
  const asksCurrentAutomations = /combien|nombre|mes automatisations|en cours|deja|déjà|active|actif|actives|etat|état|liste|voir/.test(intent);
  const asksCreateAutomations = /creer|cree|créer|crée|ajoute|ajouter|mettre en place|autres|propose|pertinentes|a creer|à créer|disponibles/.test(intent);

  if (talksAutomation) {
    const suggestionCards = buildAutomationSuggestionCards(automations, automationPresets);

    if (asksCurrentAutomations) {
      return {
        content: buildCurrentAutomationContent(automations),
        actions: buildAutomationCards(automations),
      };
    }

    if (asksCreateAutomations) {
      return {
        content: buildCreateAutomationContent(suggestionCards),
        actions: suggestionCards,
      };
    }

    return {
      content: automations.length > 0
        ? buildCurrentAutomationContent(automations)
        : buildCreateAutomationContent(suggestionCards),
      actions: [
        ...buildAutomationCards(automations),
        ...(automations.length > 0 ? [] : suggestionCards),
      ],
    };
  }

  if (/quotidien|routine|agenda/.test(intent)) {
    return {
      content: [
        "Je peux vous aider à définir le quotidien de la communauté.",
        "",
        "On va simplement préciser :",
        "- contenus réguliers",
        "- jours et horaires",
        "- canaux de publication",
        "- rappels utiles",
        "",
        "Cliquez sur le bouton pour commencer.",
      ].join("\n"),
      actions: [
        {
          id: "open-daily-routine",
          type: "setting",
          title: "Définir mon quotidien",
          description: "Configurer les elements recurrents de la communaute.",
          status: "Assistant",
          action: { kind: "open_daily_routine" },
        },
      ],
    };
  }

  if (/parametre|reglage|profil|communaute|identite|ton|signature|hashtag|reseau|instagram|facebook|whatsapp|telegram/.test(intent)) {
    return {
      content: [
        "Je peux vérifier les réglages importants du compte.",
        "",
        "À contrôler :",
        "- identité de la communauté",
        "- ton et signature",
        "- réseaux connectés",
        "- automatisations actives",
        "",
        "Pour modifier ces réglages, passez en mode détaillé.",
      ].join("\n"),
      actions: [
        {
          id: "switch-detailed-settings",
          type: "navigation",
          title: "Passer en mode détaillé",
          description: "Affiche les menus experts pour modifier les parametres avances.",
          action: { kind: "switch_detailed" },
        },
      ],
    };
  }

  return null;
}

function buildSimplifiedResponseRules(params: { automations: AutomationSummary[] }) {
  return `\n\nMODE SIMPLIFIE — RÈGLES DE RÉPONSE POUR RESPONSABLE BETH HABAD :
- L'utilisateur veut piloter son Beth Habad depuis le chat, sans interface complexe.
- Réponds court, simple et clair.
- Pas de titres rigides comme Résumé, Action recommandée, Informations utilisées, À confirmer ou Prochaine étape.
- Commence directement par la réponse utile.
- 2 à 5 lignes maximum dans la majorité des cas.
- Utilise des puces seulement si cela rend la réponse plus lisible.
- Une seule question à la fois si une information manque.
- Quand tu proposes plusieurs choix, limite à 3 ou 4 options dans le texte.
- Quand une action doit modifier le compte, explique l'action et laisse l'utilisateur utiliser les boutons quand ils sont affichés.
- Ne prétends jamais avoir modifié un paramètre si aucun bouton ou appel d'action ne l'a fait.
- Pour les affiches : propose les textes préremplis, puis demande seulement si l'utilisateur veut modifier ou valider.
- Pour les automatisations : affiche clairement ce qui existe et les boutons disponibles.
- Automatisations connues : ${params.automations.map((automation) => `${automation.name} (${automation.isActive ? "active" : "pause"})`).join(", ") || "aucune"}.`;
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
    const { messages, conversationId, selectedTemplateId, templateAction, mode } = body as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      conversationId?: string;
      selectedTemplateId?: string | null;
      templateAction?: "select" | null;
      mode?: "daily_routine" | "simplified";
    };

    const isDailyRoutineMode = mode === "daily_routine";
    const isSimplifiedMode = mode === "simplified";

    const lastUserMessage = messages[messages.length - 1];
    const isUserPrompt = lastUserMessage?.role === "user";
    const hasExplicitVisualIntent = isUserPrompt && looksLikeTemplateIntent(lastUserMessage.content);
    const hasExplicitArticleIntent = isUserPrompt && looksLikeArticleIntent(lastUserMessage.content);

    const [{ data: dbCommunity }, { data: memories }, { data: candidateTemplates }, { data: candidateArticles }, { data: automations }, { data: automationPresets }] = await Promise.all([
      admin
        .from("Community")
        .select("name, city, timezone, tone, language, signature, hashtags, editorialRules, communityType, rhythmId, religiousStream")
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
      isSimplifiedMode
        ? admin
            .from("Automation")
            .select("id, presetId, name, description, trigger, isActive, status, nextRunAt, lastRunAt")
            .eq("communityId", profile.communityId)
            .order("createdAt", { ascending: false })
            .limit(12)
        : Promise.resolve({ data: [] }),
      isSimplifiedMode
        ? admin
            .from("AutomationPreset")
            .select("*, rhythms:AutomationPresetRhythm(id, rhythmId, rhythm:CommunityRhythm(id, name, slug, isActive))")
            .eq("isActive", true)
            .order("sortOrder", { ascending: true })
            .limit(24)
        : Promise.resolve({ data: [] }),
    ]);
    let community = dbCommunity as any;

    const { data: dailyRoutineMemory } = await admin
      .from("AIMemory")
      .select("value")
      .eq("communityId", profile.communityId)
      .eq("type", "RECURRING_CONTENT")
      .eq("key", "daily_routine")
      .maybeSingle();

    if (!community) {
      // Si la communauté n'existe pas encore (ex: nouvel utilisateur), on utilise un contexte par défaut
      // au lieu de retourner une erreur 404 qui bloque l'utilisation de l'assistant.
      community = {
        name: "Ma communauté",
        city: "Paris",
        timezone: "Europe/Paris",
        tone: "MODERN",
        language: "fr",
        hashtags: [],
        editorialRules: null,
        communityType: "SYNAGOGUE",
        rhythmId: null,
        religiousStream: null
      };
    }

    const now = new Date();
    const timezone = community.timezone ?? "Europe/Paris";
    const [shabbatContext, currentYearHolidays, nextYearHolidays] = await Promise.all([
      getStoredShabbatTimes({
        city: community.city ?? "Paris",
        timezone,
      }),
      getJewishHolidays({ year: now.getFullYear() }),
      getJewishHolidays({ year: now.getFullYear() + 1 }),
    ]);
    const upcomingHolidays = getUpcomingHolidays([...currentYearHolidays, ...nextYearHolidays], now);
    const nextHoliday = getUpcomingHoliday(upcomingHolidays, now);
    const temporalContext = buildTemporalSystemContext({
      timezone,
      city: community.city,
      now,
      shabbatTimes: shabbatContext,
      nextHoliday,
      upcomingHolidays,
    });

    const templateSuggestions = isUserPrompt && hasExplicitVisualIntent
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
      hasExplicitVisualIntent;
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
            const intro = "J’ai trouvé des affiches pertinentes. Choisissez-en une et je préparerai les textes.\n\n";
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

              generateTitle(conversationId, lastUserMessage.content, fullResponse, admin).catch(console.error);
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

              generateTitle(conversationId, lastUserMessage.content, fullResponse, admin).catch(console.error);
            }

            controller.close();
            return;
          }

          const applicableAutomationPresets = ((automationPresets ?? []) as PresetWithRhythms[]).filter((preset) =>
            presetAppliesToCommunity(preset, {
              communityType: community.communityType,
              rhythmId: community.rhythmId,
            })
          );

          const simplifiedShortcut = isSimplifiedMode && isUserPrompt
            ? getSimplifiedShortcut(lastUserMessage.content, (automations ?? []) as AutomationSummary[], applicableAutomationPresets)
            : null;

          if (simplifiedShortcut) {
            fullResponse = simplifiedShortcut.content;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: simplifiedShortcut.content })}\n\n`)
            );
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "assistant_actions",
                  actions: simplifiedShortcut.actions,
                })}\n\n`
              )
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

              generateTitle(conversationId, lastUserMessage.content, fullResponse, admin).catch(console.error);
            }

            controller.close();
            return;
          }

          const simplifiedSystemContext = isSimplifiedMode
            ? buildSimplifiedResponseRules({ automations: (automations ?? []) as AutomationSummary[] })
            : "";

          let currentMessages = [
            { role: "system", content: systemPrompt + simplifiedSystemContext },
            ...messages.slice(-20),
          ] as any[];

          let needsToolExecution = true;
          let maxLoops = 3;
          while (needsToolExecution && maxLoops > 0) {
            maxLoops--;
            const tempResponse = await openrouter.chat.completions.create({
              model: "deepseek/deepseek-chat",
              max_tokens: 2048,
              stream: false,
              messages: currentMessages,
              tools: [
                {
                  type: "function",
                  function: {
                    name: "update_community_settings",
                    description: "Modifie les paramètres globaux de la communauté",
                    parameters: {
                      type: "object",
                      properties: {
                        tone: { type: "string", description: "Ton (MODERN, TRADITIONAL, FORMAL, FRIENDLY, RELIGIOUS)" },
                        signature: { type: "string" },
                        name: { type: "string" },
                        city: { type: "string" }
                      }
                    }
                  }
                },
                {
                  type: "function",
                  function: {
                    name: "toggle_automation",
                    description: "Active ou désactive une automatisation",
                    parameters: {
                      type: "object",
                      properties: {
                        automationId: { type: "string" },
                        isActive: { type: "boolean" }
                      },
                      required: ["automationId", "isActive"]
                    }
                  }
                },
                {
                  type: "function",
                  function: {
                    name: "delete_automation",
                    description: "Supprime définitivement une automatisation",
                    parameters: {
                      type: "object",
                      properties: {
                        automationId: { type: "string" }
                      },
                      required: ["automationId"]
                    }
                  }
                },
                {
                  type: "function",
                  function: {
                    name: "create_automation",
                    description: "Crée une nouvelle automatisation personnalisée (e.g. envoi d'emails Resend, messages, notifications, avec récurrence)",
                    parameters: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Nom de l'automatisation" },
                        description: { type: "string", description: "Description optionnelle" },
                        trigger: { 
                          type: "string", 
                          enum: ["BEFORE_EVENT", "EVENT_DAY", "AFTER_EVENT", "WEEKLY_SHABBAT", "JEWISH_HOLIDAY", "DAILY", "CUSTOM_SCHEDULE", "MANUAL"],
                          description: "Type de déclencheur"
                        },
                        triggerConfig: {
                          type: "object",
                          properties: {
                            time: { type: "string", description: "Heure au format HH:MM (ex: '14:30')" },
                            date: { type: "string", description: "Date spécifique YYYY-MM-DD" },
                            repeat: { type: "string", enum: ["none", "weekly", "monthly", "custom"] },
                            days: { type: "array", items: { type: "string" }, description: "Jours de répétition (ex: ['friday', 'sunday'])" },
                            startDate: { type: "string", description: "Date de commencement YYYY-MM-DD" },
                            endDate: { type: "string", description: "Date de fin YYYY-MM-DD" }
                          }
                        },
                        actions: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              type: { type: "string", enum: ["GENERATE_CONTENT", "SEND_EMAIL", "SEND_MESSAGE", "CREATE_NOTIFICATION"] },
                              contentType: { type: "string", description: "Pour GENERATE_CONTENT (ex: GENERAL, SHABBAT)" },
                              channels: { type: "array", items: { type: "string" }, description: "Canaux de diffusion pour SEND_MESSAGE ou GENERATE_CONTENT" },
                              requiresValidation: { type: "boolean", description: "Si vrai, génère un brouillon plutôt que de publier directement" },
                              emailSubject: { type: "string", description: "Pour SEND_EMAIL (Sujet de l'email)" },
                              emailBody: { type: "string", description: "Pour SEND_EMAIL (Contenu HTML ou texte de l'email)" },
                              messageText: { type: "string", description: "Pour SEND_MESSAGE (Texte brut à envoyer)" },
                              notificationTitle: { type: "string", description: "Pour CREATE_NOTIFICATION (Titre)" },
                              notificationBody: { type: "string", description: "Pour CREATE_NOTIFICATION (Corps du message)" }
                            },
                            required: ["type"]
                          }
                        }
                      },
                      required: ["name", "trigger", "actions"]
                    }
                  }
                },
                {
                  type: "function",
                  function: {
                    name: "send_email",
                    description: "Prépare un e-mail à envoyer. Cela affichera une demande de confirmation à l'utilisateur dans l'interface de chat avant l'envoi réel par Resend.",
                    parameters: {
                      type: "object",
                      properties: {
                        to: { type: "string", description: "Adresse e-mail du destinataire (ex: chlomitaieb@gmail.com)" },
                        subject: { type: "string", description: "Sujet de l'e-mail" },
                        body: { type: "string", description: "Contenu textuel ou corps du message de l'e-mail" }
                      },
                      required: ["to", "subject", "body"]
                    }
                  }
                }
              ]
            });

            const responseMessage = tempResponse.choices[0]?.message;
            if (!responseMessage) break;

            if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
              currentMessages.push(responseMessage);
              
              for (const toolCall of responseMessage.tool_calls) {
                let result = "Action exécutée avec succès";
                try {
                  const toolCallAny = toolCall as any;
                  const args = JSON.parse(toolCallAny.function.arguments);
                  if (toolCallAny.function.name === "update_community_settings") {
                    await admin.from("Community").update(args).eq("id", profile.communityId);
                  } else if (toolCallAny.function.name === "toggle_automation") {
                    await admin.from("Automation").update({ isActive: args.isActive }).eq("id", args.automationId);
                  } else if (toolCallAny.function.name === "delete_automation") {
                    await admin.from("Automation").delete().eq("id", args.automationId);
                  } else if (toolCallAny.function.name === "create_automation") {
                    const id = crypto.randomUUID();
                    const automationData = {
                      id,
                      communityId: profile.communityId,
                      name: args.name,
                      description: args.description || null,
                      trigger: args.trigger,
                      triggerConfig: args.triggerConfig || {},
                      actions: args.actions || [],
                      isActive: true,
                      status: "ACTIVE"
                    };
                    await admin.from("Automation").insert(automationData);
                    result = `Automatisation '${args.name}' créée avec succès (ID: ${id})`;
                  } else if (toolCallAny.function.name === "send_email") {
                    result = `Brouillon d'e-mail préparé pour ${args.to}. En attente de confirmation de l'utilisateur.`;
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ 
                        type: "assistant_actions", 
                        actions: [{
                          id: crypto.randomUUID(),
                          type: "email",
                          title: `Envoi d'e-mail à ${args.to}`,
                          description: `Sujet : ${args.subject}\n\n${args.body}`,
                          action: {
                            kind: "send_email",
                            emailData: {
                              to: args.to,
                              subject: args.subject,
                              body: args.body
                            }
                          }
                        }]
                      })}\n\n`)
                    );
                  }
                  
                  // Notifier le frontend qu'une action a eu lieu pour qu'il recharge éventuellement les données
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: "system_updated", action: toolCallAny.function.name })}\n\n`)
                  );
                } catch (e: any) {
                  result = "Erreur: " + e.message;
                }
                currentMessages.push({
                  role: "tool",
                  tool_call_id: toolCall.id,
                  content: result
                });
              }
            } else {
              needsToolExecution = false;
            }
          }

          const openrouterStream = await openrouter.chat.completions.create({
            model: "deepseek/deepseek-chat",
            max_tokens: 2048,
            stream: true,
            messages: currentMessages,
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

          // Détecter [QUOTIDIEN_PRET] dans le mode daily_routine
          if (isDailyRoutineMode && fullResponse.includes("[QUOTIDIEN_PRET]")) {
            // Retirer la balise du texte affiché
            fullResponse = fullResponse.replace("[QUOTIDIEN_PRET]", "").trim();
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "daily_routine_ready" })}\n\n`
              )
            );
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

            generateTitle(conversationId, lastUserMessage.content, fullResponse, admin).catch(console.error);
          }
        } catch (error: any) {
          console.error("[AI Chat] Erreur streaming:", error?.response?.data || error?.message || error);
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
  assistantResponse: string,
  admin: ReturnType<typeof createAdminClient>
) {
  try {
    const { data: conversation } = await admin
      .from("Conversation")
      .select("title")
      .eq("id", conversationId)
      .single();

    const currentTitle = conversation?.title?.trim();
    if (currentTitle && currentTitle !== "Nouvelle conversation") {
      return;
    }

    const response = await openrouter.chat.completions.create({
      model: "deepseek/deepseek-chat",
      max_tokens: 40,
      messages: [
        {
          role: "system",
          content: [
            "Tu renommes une conversation EasyCom AI pour l'historique utilisateur.",
            "Génère un titre clair, concret et mémorisable en français.",
            "Le titre doit résumer le thème principal, pas être générique.",
            "3 à 6 mots maximum.",
            "Texte brut uniquement : pas de Markdown, pas de **gras**, pas de guillemets, pas de point final, pas d'emoji.",
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
      await admin
        .from("Conversation")
        .update({ title, updatedAt: new Date().toISOString() })
        .eq("id", conversationId);
    }
  } catch (error) {
    console.error("[AI Chat] Erreur génération titre:", error);
  }
}
