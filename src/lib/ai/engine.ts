import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildSystemPrompt,
  buildContentGenerationPrompt,
  buildAdaptationPrompt,
  buildMemoryContext,
  type GenerationShabbatTimes,
} from "./prompts";
import { getShabbatTimes } from "@/lib/automation/hebcal";
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
  return { community, memories: memories ?? [] };
}

function normalizeCityName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getNextShabbatFromSchedule(
  schedule: Array<{
    gregorian_date: string;
    hebrew_date?: string | null;
    parasha?: string | null;
    shabbat_entry_time?: string | null;
    shabbat_exit_time?: string | null;
  }>,
  now: Date
) {
  const today = startOfDay(now);
  return schedule.find((entry) => new Date(`${entry.gregorian_date}T00:00:00`) >= today) ?? null;
}

export async function getStoredShabbatTimes(params: {
  city?: string | null;
  timezone?: string | null;
}): Promise<GenerationShabbatTimes | null> {
  const supabase = createAdminClient();
  const now = new Date();
  const years = [now.getFullYear(), now.getFullYear() + 1];

  for (const year of years) {
    let scheduleRow: { city_name: string; shabbat_schedule: unknown } | null = null;

    if (params.city) {
      const exactMatch = await supabase
        .from("FranceCityShabbatSchedule")
        .select("city_name, shabbat_schedule")
        .eq("year", year)
        .eq("city_name", params.city)
        .maybeSingle();

      scheduleRow = exactMatch.data as typeof scheduleRow;

      if (!scheduleRow) {
        const primaryToken =
          params.city
            .split(/[\s,'-]+/)
            .find((token) => token.trim().length >= 3)
            ?.trim() ?? params.city;

        const closeMatches = await supabase
          .from("FranceCityShabbatSchedule")
          .select("city_name, shabbat_schedule")
          .eq("year", year)
          .ilike("city_name", `%${primaryToken}%`)
          .limit(50);

        const rows = (closeMatches.data ?? []) as Array<{ city_name: string; shabbat_schedule: unknown }>;
        const normalizedCity = normalizeCityName(params.city);
        scheduleRow =
          rows.find((row) => normalizeCityName(row.city_name) === normalizedCity) ??
          rows.find((row) => normalizeCityName(row.city_name).includes(normalizedCity)) ??
          rows.find((row) => normalizedCity.includes(normalizeCityName(row.city_name))) ??
          rows[0] ??
          null;
      }
    }

    if (!scheduleRow) {
      const parisFallback = await supabase
        .from("FranceCityShabbatSchedule")
        .select("city_name, shabbat_schedule")
        .eq("year", year)
        .eq("city_code", "75056")
        .maybeSingle();
      scheduleRow = parisFallback.data as typeof scheduleRow;
    }

    const schedule = Array.isArray(scheduleRow?.shabbat_schedule)
      ? scheduleRow.shabbat_schedule as Array<{
          gregorian_date: string;
          hebrew_date?: string | null;
          parasha?: string | null;
          shabbat_entry_time?: string | null;
          shabbat_exit_time?: string | null;
        }>
      : [];

    const next = getNextShabbatFromSchedule(schedule, now);
    if (next?.shabbat_entry_time) {
      return {
        date: next.gregorian_date,
        hebrewDate: next.hebrew_date ?? undefined,
        parasha: next.parasha ?? undefined,
        entry: next.shabbat_entry_time,
        exit: next.shabbat_exit_time ?? "",
      };
    }
  }

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

  const systemPrompt = buildSystemPrompt(community) + buildMemoryContext(memories);
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
    if (jsonMatch) return sanitizeGeneratedContent(JSON.parse(jsonMatch[0]) as GeneratedContent);
  } catch {}

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
