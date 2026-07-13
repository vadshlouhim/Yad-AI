import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildSystemPrompt,
  buildContentGenerationPrompt,
  buildAdaptationPrompt,
  buildMemoryContext,
  type GenerationShabbatTimes,
} from "./prompts";
import { buildTemporalSystemContext } from "./time-context";
import { getJewishHolidays, getShabbatTimes, type JewishHoliday } from "@/lib/automation/hebcal";
import type { Enums } from "@/types/database.types";

type ContentType = Enums<"ContentType">;
type ChannelType = Enums<"ChannelType">;

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const MODEL = "deepseek/deepseek-chat";
const MAX_TOKENS = 2048;

function getUpcomingHolidays(holidays: JewishHoliday[], now: Date, limit = 8) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return holidays
    .filter((holiday) => new Date(`${holiday.date}T12:00:00`) >= today)
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
    .slice(0, limit);
}

async function getHebrewCalendarContext(now = new Date()) {
  const [currentYearHolidays, nextYearHolidays] = await Promise.all([
    getJewishHolidays({ year: now.getFullYear() }),
    getJewishHolidays({ year: now.getFullYear() + 1 }),
  ]);
  const upcomingHolidays = getUpcomingHolidays([...currentYearHolidays, ...nextYearHolidays], now);
  return {
    now,
    upcomingHolidays,
    nextHoliday: upcomingHolidays[0] ?? null,
  };
}

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
      .select("name,city,timezone,tone,language,signature,hashtags,editorialRules,communityType,religiousStream")
      .eq("id", communityId)
      .single(),
    supabase
      .from("AIMemory")
      .select("*")
      .eq("communityId", communityId)
      .order("relevance", { ascending: false })
      .limit(10),
  ]);
  let validCommunity = community;
  if (!validCommunity) {
    validCommunity = {
      name: "Ma communauté",
      city: "Paris",
      timezone: "Europe/Paris",
      tone: "MODERN",
      language: "fr",
      signature: null,
      hashtags: [],
      editorialRules: null,
      communityType: "SYNAGOGUE",
      religiousStream: null
    };
  }
  return { community: validCommunity, memories: memories ?? [] };
}

export async function getStoredShabbatTimes(params: {
  city?: string | null;
  timezone?: string | null;
}): Promise<GenerationShabbatTimes | null> {
  const live = await getShabbatTimes({
    city: params.city ?? "Paris",
    timezone: params.timezone ?? "Europe/Paris",
  });

  return live
    ? {
        date: live.date,
        hebrewDate: live.hebrewDate,
        parasha: live.parasha,
        entry: live.entry,
        exit: live.exit,
      }
    : null;
}

function looksLikeShabbatContent(params: {
  contentType: ContentType;
  customInstructions?: string;
  event?: { title?: string | null; description?: string | null; category?: string | null } | null;
}) {
  const text = [
    params.contentType,
    params.customInstructions,
    params.event?.title,
    params.event?.description,
    params.event?.category,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return ["shabbat", "chabbat", "bougies", "havdala", "paracha"].some((keyword) => text.includes(keyword));
}

function removeAsterisks(value: string) {
  return value.replace(/\*/g, "");
}

function extractQuotedField(raw: string, field: string) {
  const match = raw.match(new RegExp(`"${field}"\\s*:\\s*"([\\s\\S]*?)"(?=\\s*,\\s*"|\\s*\\})`));
  return match?.[1]
    ?.replace(/\\"/g, "\"")
    .replace(/\\n/g, "\n")
    .trim();
}

function extractHashtagsField(raw: string) {
  const match = raw.match(/"hashtags"\s*:\s*\[([\s\S]*?)\]/);
  if (!match) return [] as string[];

  return Array.from(match[1].matchAll(/#?[A-Za-zÀ-ÿ0-9_/-]+/g))
    .map((entry) => entry[0].trim())
    .filter(Boolean)
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));
}

function extractGeneratedContentFromRaw(raw: string): GeneratedContent | null {
  const body = extractQuotedField(raw, "body");
  const bodyHebrew = extractQuotedField(raw, "bodyHebrew");
  const cta = extractQuotedField(raw, "cta");
  const hashtags = extractHashtagsField(raw);

  if (!body && !bodyHebrew) {
    return null;
  }

  return {
    body: body ?? "",
    bodyHebrew: bodyHebrew || undefined,
    hashtags,
    cta: cta || undefined,
    raw,
  };
}

function sanitizeGeneratedContent(content: GeneratedContent): GeneratedContent {
  return {
    ...content,
    body: removeAsterisks(content.body ?? ""),
    bodyHebrew: content.bodyHebrew ? removeAsterisks(content.bodyHebrew) : content.bodyHebrew,
    cta: content.cta ? removeAsterisks(content.cta) : content.cta,
    notes: content.notes ? removeAsterisks(content.notes) : content.notes,
    hashtags: Array.isArray(content.hashtags) ? content.hashtags.map(removeAsterisks) : [],
    raw: content.raw ? removeAsterisks(content.raw) : content.raw,
  };
}

export async function generateContent(params: {
  communityId: string;
  contentType: ContentType;
  eventId?: string;
  channelType?: ChannelType;
  customInstructions?: string;
  shabbatTimes?: GenerationShabbatTimes | null;
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

  const shabbatTimes =
    params.shabbatTimes ??
    (looksLikeShabbatContent({ contentType, customInstructions, event })
      ? await getStoredShabbatTimes({
          city: community.city,
          timezone: community.timezone,
        })
      : null);

  const calendarContext = await getHebrewCalendarContext();
  const temporalContext = buildTemporalSystemContext({
    timezone: community.timezone,
    city: community.city,
    now: calendarContext.now,
    shabbatTimes,
    nextHoliday: calendarContext.nextHoliday,
    upcomingHolidays: calendarContext.upcomingHolidays,
  });
  const systemPrompt = temporalContext + "\n\n" + buildSystemPrompt(community) + buildMemoryContext(memories);
  const userPrompt = buildContentGenerationPrompt({
    contentType,
    event,
    channelType,
    customInstructions,
    shabbatTimes,
    holidayName: params.holidayName,
    hebrewDate: params.hebrewDate ?? shabbatTimes?.hebrewDate,
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
      return sanitizeGeneratedContent({ ...parsed, raw: rawContent });
    }
  } catch {}

  const recovered = extractGeneratedContentFromRaw(rawContent);
  if (recovered) {
    return sanitizeGeneratedContent(recovered);
  }

  return sanitizeGeneratedContent({ body: rawContent, hashtags: community.hashtags ?? [], raw: rawContent });
}

export async function adaptContentForChannel(params: {
  communityId: string;
  originalContent: string;
  targetChannel: ChannelType;
}): Promise<GeneratedContent> {
  const { communityId, originalContent, targetChannel } = params;

  const { community } = await getCommunityContext(communityId);
  if (!community) throw new Error("Communauté introuvable");

  const calendarContext = await getHebrewCalendarContext();
  const temporalContext = buildTemporalSystemContext({
    timezone: community.timezone,
    city: community.city,
    now: calendarContext.now,
    nextHoliday: calendarContext.nextHoliday,
    upcomingHolidays: calendarContext.upcomingHolidays,
  });
  const systemPrompt = temporalContext + "\n\n" + buildSystemPrompt(community);
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
    if (jsonMatch) return sanitizeGeneratedContent(JSON.parse(jsonMatch[0]) as GeneratedContent);
  } catch {}

  const recovered = extractGeneratedContentFromRaw(rawContent);
  if (recovered) {
    return sanitizeGeneratedContent(recovered);
  }

  return sanitizeGeneratedContent({ body: rawContent, hashtags: [], raw: rawContent });
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

  const calendarContext = await getHebrewCalendarContext();
  const temporalContext = buildTemporalSystemContext({
    timezone: community.timezone,
    city: community.city,
    now: calendarContext.now,
    nextHoliday: calendarContext.nextHoliday,
    upcomingHolidays: calendarContext.upcomingHolidays,
  });
  const systemPrompt = temporalContext + "\n\n" + buildSystemPrompt(community) + buildMemoryContext(memories);

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
    if (delta) yield removeAsterisks(delta);
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
