import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildSystemPrompt,
  buildContentGenerationPrompt,
  buildAdaptationPrompt,
  buildMemoryContext,
} from "./prompts";
import type { Enums } from "@/types/database.types";

type ContentType = Enums<"ContentType">;
type ChannelType = Enums<"ChannelType">;

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const MODEL = "google/gemini-2.5-flash";
const MAX_TOKENS = 2048;

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

async function getCommunityContext(communityId: string) {
  const supabase = createAdminClient();
  const [{ data: community }, { data: memories }] = await Promise.all([
    supabase
      .from("Community")
      .select("name,city,tone,language,signature,hashtags,editorialRules,communityType,religiousStream")
      .eq("id", communityId)
      .single(),
    supabase
      .from("AIMemory")
      .select("*")
      .eq("communityId", communityId)
      .order("relevance", { ascending: false })
      .limit(10),
  ]);
  return { community, memories: memories ?? [] };
}

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
  const supabase = createAdminClient();

  const { community, memories } = await getCommunityContext(communityId);
  if (!community) throw new Error("Communauté introuvable");

  const event = eventId
    ? (await supabase.from("Event").select("*").eq("id", eventId).single()).data
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

  try {
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as GeneratedContent;
      return { ...parsed, raw: rawContent };
    }
  } catch {}

  return { body: rawContent, hashtags: community.hashtags ?? [], raw: rawContent };
}

export async function adaptContentForChannel(params: {
  communityId: string;
  originalContent: string;
  targetChannel: ChannelType;
}): Promise<GeneratedContent> {
  const { communityId, originalContent, targetChannel } = params;

  const { community } = await getCommunityContext(communityId);
  if (!community) throw new Error("Communauté introuvable");

  const systemPrompt = buildSystemPrompt(community);
  const userPrompt = buildAdaptationPrompt(
    originalContent,
    targetChannel,
    `Communauté: ${community.name}, Ton: ${community.tone}`
  );

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
    if (jsonMatch) return JSON.parse(jsonMatch[0]) as GeneratedContent;
  } catch {}

  return { body: rawContent, hashtags: [], raw: rawContent };
}

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
      ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ],
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

export async function generateMultiChannelContent(params: {
  communityId: string;
  contentType: ContentType;
  eventId?: string;
  channels: ChannelType[];
  customInstructions?: string;
}): Promise<Record<ChannelType, GeneratedContent>> {
  const { channels, ...baseParams } = params;

  const baseContent = await generateContent({ ...baseParams, channelType: channels[0] });

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

export async function saveToAIMemory(communityId: string, data: {
  type: string;
  key: string;
  value: unknown;
}) {
  const supabase = createAdminClient();
  await supabase.from("AIMemory").upsert(
    {
      id: crypto.randomUUID(),
      communityId,
      type: data.type as never,
      key: data.key,
      value: data.value as never,
      updatedAt: new Date().toISOString(),
    },
    { onConflict: "communityId,type,key" }
  );
}
