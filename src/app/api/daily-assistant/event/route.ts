import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { fromZonedTime } from "date-fns-tz";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  message: z.string().min(2).max(1200),
});

const openrouter = process.env.OPENROUTER_API_KEY
  ? new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
    })
  : null;

type ParsedDailyRequest = {
  title: string | null;
  date: string | null;
  time: string | null;
  kind: "event" | "reminder" | "project";
  description: string | null;
};

const DAY_INDEX: Record<string, number> = {
  dimanche: 0,
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
};

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function extractTime(message: string) {
  const numeric = message.match(/\b(\d{1,2})\s*(?:h|:)\s*(\d{2})?\b/i);
  if (numeric) {
    const hour = Math.min(Number(numeric[1]), 23);
    const minute = Math.min(Number(numeric[2] ?? "0"), 59);
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  const normalized = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (normalized.includes("matin")) return "09:00";
  if (normalized.includes("midi")) return "12:00";
  if (normalized.includes("apres-midi")) return "14:00";
  if (normalized.includes("soir")) return "18:00";
  return "09:00";
}

function fallbackParse(message: string, now: Date): ParsedDailyRequest {
  const normalized = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  let date = null as string | null;

  if (normalized.includes("demain")) {
    date = formatDateKey(addDays(now, 1));
  } else if (normalized.includes("aujourd")) {
    date = formatDateKey(now);
  } else {
    for (const [dayName, targetDay] of Object.entries(DAY_INDEX)) {
      if (normalized.includes(dayName)) {
        const delta = (targetDay - now.getDay() + 7) % 7;
        const wantsNext = normalized.includes(`${dayName} prochain`) || normalized.includes(`prochain ${dayName}`);
        date = formatDateKey(addDays(now, delta === 0 || wantsNext ? delta + 7 : delta));
        break;
      }
    }
  }

  const kind = normalized.includes("rappel")
    ? "reminder"
    : normalized.includes("projet")
      ? "project"
      : "event";

  const title = message
    .replace(/j'ai\s+/i, "")
    .replace(/ajoute\s+/i, "")
    .replace(/rappelle-moi\s+de\s+/i, "")
    .replace(/\b(aujourd'hui|demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|prochain|prochaine|matin|midi|soir|apres-midi|à|a)\b/gi, " ")
    .replace(/\b\d{1,2}\s*(h|:)\s*\d{0,2}\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    title: title || (kind === "reminder" ? "Rappel" : kind === "project" ? "Projet" : "Evenement"),
    date,
    time: extractTime(message),
    kind,
    description: message,
  };
}

async function parseWithAI(message: string, timezone: string): Promise<ParsedDailyRequest | null> {
  if (!openrouter) return null;

  const now = new Date();
  const currentDate = new Intl.DateTimeFormat("fr-FR", {
    timeZone: timezone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);

  const response = await openrouter.chat.completions.create({
    model: "deepseek/deepseek-chat",
    temperature: 0.1,
    max_tokens: 500,
    messages: [
      {
        role: "system",
        content:
          `Tu extrais une demande d'agenda en JSON strict. Date actuelle: ${currentDate}. Fuseau: ${timezone}. ` +
          "Si l'utilisateur dit un jour relatif, choisis la prochaine date future logique. " +
          "Retourne uniquement: {\"title\":string|null,\"date\":\"YYYY-MM-DD\"|null,\"time\":\"HH:mm\"|null,\"kind\":\"event\"|\"reminder\"|\"project\",\"description\":string|null}. " +
          "Si l'heure est vague: matin=09:00, midi=12:00, apres-midi=14:00, soir=18:00.",
      },
      { role: "user", content: message },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "";
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  const parsed = JSON.parse(match[0]) as ParsedDailyRequest;
  return {
    title: parsed.title ?? null,
    date: parsed.date ?? null,
    time: parsed.time ?? null,
    kind: parsed.kind === "reminder" || parsed.kind === "project" ? parsed.kind : "event",
    description: parsed.description ?? message,
  };
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

    const body = bodySchema.safeParse(await request.json());
    if (!body.success) return NextResponse.json({ error: "Message invalide" }, { status: 400 });

    const admin = createAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("communityId")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.communityId) {
      return NextResponse.json({ error: "Pas de communaute" }, { status: 400 });
    }

    const { data: community } = await admin
      .from("Community")
      .select("timezone")
      .eq("id", profile.communityId)
      .single();

    const timezone = community?.timezone ?? "Europe/Paris";
    const aiParsed = await parseWithAI(body.data.message, timezone).catch(() => null);
    const parsed = aiParsed ?? fallbackParse(body.data.message, new Date());

    if (!parsed.date) {
      return NextResponse.json(
        { error: "Je n'ai pas trouve de date. Essayez par exemple : Ajoute une reunion mardi a 18h." },
        { status: 422 },
      );
    }

    const time = parsed.time ?? "09:00";
    const startDate = fromZonedTime(`${parsed.date}T${time}:00`, timezone);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    const { data: event, error: eventError } = await admin
      .from("Event")
      .insert({
        id: crypto.randomUUID(),
        communityId: profile.communityId,
        title: parsed.title?.trim() || "Nouvel element agenda",
        description: parsed.description ?? body.data.message,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        category: parsed.kind === "project" ? "COMMUNITY" : "OTHER",
        status: "DRAFT",
        isRecurring: false,
        isPublic: false,
        notes: `Ajoute automatiquement depuis Assistant du quotidien.\nType: ${parsed.kind}\nDemande: ${body.data.message}`,
        updatedAt: new Date().toISOString(),
      })
      .select("id,title,startDate,endDate")
      .single();

    if (eventError || !event) {
      console.error("[Daily assistant event] insert error", eventError);
      return NextResponse.json({ error: "Impossible d'ajouter dans l'agenda" }, { status: 500 });
    }

    await admin.from("AuditLog").insert({
      id: crypto.randomUUID(),
      userId: user.id,
      communityId: profile.communityId,
      action: "event.created_from_daily_assistant",
      resource: "Event",
      resourceId: event.id,
      newData: { title: event.title, source: "daily-assistant" },
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      event,
      message: `C'est ajouté dans votre Agenda connecté IA : ${event.title}.`,
    });
  } catch (error) {
    console.error("[Daily assistant event]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
