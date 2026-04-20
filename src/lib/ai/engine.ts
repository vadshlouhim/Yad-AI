import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import {
  buildSystemPrompt,
  buildContentGenerationPrompt,
  buildAdaptationPrompt,
  buildMemoryContext,
} from "./prompts";
import type { ContentType, ChannelType } from "@prisma/client";

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const MODEL = "google/gemini-2.5-flash";
const MAX_TOKENS = 2048;

// ============================================================
// TYPES
// ============================================================

export interface GeneratedContent {
  body: string;
  bodyHebrew?: string;
  hashtags: string[];
  cta?: string;
  notes?: string;
  raw?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ============================================================
// RÉCUPÉRATION DU CONTEXTE COMMUNAUTÉ
// ============================================================

async function getCommunityContext(communityId: string) {
  const [community, memories] = await Promise.all([
    prisma.community.findUnique({
      where: { id: communityId },
      select: {
        name: true,
        city: true,
        tone: true,
        language: true,
        signature: true,
        hashtags: true,
        editorialRules: true,
        communityType: true,
        religiousStream: true,
      },
    }),
    prisma.aIMemory.findMany({
      where: { communityId },
      orderBy: { relevance: "desc" },
      take: 10,
    }),
  ]);

  return { community, memories };
}

// ============================================================
// GÉNÉRATION DE CONTENU
// ============================================================

export async function generateContent(params: {
  communityId: string;
  contentType: ContentType;
  eventId?: string;
  channelType?: ChannelType;
  customInstructions?: string;
  shabbatTimes?: { entry: string; exit: string } | null;
  holidayName?: string;
  hebrewDate?: string;
}): Promise<GeneratedContent> {
  const { communityId, contentType, eventId, channelType, customInstructions } = params;

  const { community, memories } = await getCommunityContext(communityId);
  if (!community) throw new Error("Communauté introuvable");

  // Charger l'événement si fourni
  const event = eventId
    ? await prisma.event.findUnique({ where: { id: eventId } })
    : null;

  const systemPrompt = buildSystemPrompt(community) + buildMemoryContext(memories);
  const userPrompt = buildContentGenerationPrompt({
    contentType,
    event,
    channelType,
    customInstructions,
    shabbatTimes: params.shabbatTimes,
    holidayName: params.holidayName,
    hebrewDate: params.hebrewDate,
  });

  const response = await openrouter.chat.completions.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const rawContent = response.choices[0]?.message?.content ?? "";

  // Parser la réponse JSON
  try {
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as GeneratedContent;
      return { ...parsed, raw: rawContent };
    }
  } catch {
    // Fallback si pas de JSON valide
  }

  // Fallback : traitement texte brut
  return {
    body: rawContent,
    hashtags: community.hashtags,
    raw: rawContent,
  };
}

// ============================================================
// ADAPTATION PAR CANAL
// ============================================================

export async function adaptContentForChannel(params: {
  communityId: string;
  originalContent: string;
  targetChannel: ChannelType;
}): Promise<GeneratedContent> {
  const { communityId, originalContent, targetChannel } = params;

  const { community } = await getCommunityContext(communityId);
  if (!community) throw new Error("Communauté introuvable");

  const communityContext = `Communauté: ${community.name}, Ton: ${community.tone}`;
  const systemPrompt = buildSystemPrompt(community);
  const userPrompt = buildAdaptationPrompt(originalContent, targetChannel, communityContext);

  const response = await openrouter.chat.completions.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const rawContent = response.choices[0]?.message?.content ?? "";

  try {
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as GeneratedContent;
    }
  } catch {}

  return { body: rawContent, hashtags: [], raw: rawContent };
}

// ============================================================
// CHAT STREAMING — pour l'assistant IA central
// ============================================================

export async function* streamChatResponse(params: {
  communityId: string;
  messages: ChatMessage[];
}): AsyncGenerator<string> {
  const { communityId, messages } = params;

  const { community, memories } = await getCommunityContext(communityId);
  if (!community) {
    yield "Désolé, je ne peux pas accéder au contexte de votre communauté.";
    return;
  }

  const systemPrompt = buildSystemPrompt(community) + buildMemoryContext(memories);

  const stream = await openrouter.chat.completions.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    stream: true,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ],
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      yield delta;
    }
  }
}

// ============================================================
// GÉNÉRATION MULTI-CANAL (tous les canaux d'un coup)
// ============================================================

export async function generateMultiChannelContent(params: {
  communityId: string;
  contentType: ContentType;
  eventId?: string;
  channels: ChannelType[];
  customInstructions?: string;
}): Promise<Record<ChannelType, GeneratedContent>> {
  const { channels, ...baseParams } = params;

  // Générer le contenu de base d'abord
  const baseContent = await generateContent({
    ...baseParams,
    channelType: channels[0],
  });

  // Adapter pour chaque canal en parallèle
  const adaptations = await Promise.all(
    channels.slice(1).map((channel) =>
      adaptContentForChannel({
        communityId: params.communityId,
        originalContent: baseContent.body,
        targetChannel: channel,
      }).then((content) => [channel, content] as [ChannelType, GeneratedContent])
    )
  );

  return {
    [channels[0]]: baseContent,
    ...Object.fromEntries(adaptations),
  } as Record<ChannelType, GeneratedContent>;
}

// ============================================================
// SAUVEGARDE EN MÉMOIRE IA
// ============================================================

export async function saveToAIMemory(communityId: string, data: {
  type: string;
  key: string;
  value: unknown;
}) {
  await prisma.aIMemory.upsert({
    where: {
      communityId_type_key: {
        communityId,
        type: data.type as never,
        key: data.key,
      },
    },
    create: {
      communityId,
      type: data.type as never,
      key: data.key,
      value: data.value as never,
    },
    update: {
      value: data.value as never,
      updatedAt: new Date(),
    },
  });
}
