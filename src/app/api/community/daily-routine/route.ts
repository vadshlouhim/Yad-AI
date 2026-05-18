import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import OpenAI from "openai";

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export interface DailyRoutineItem {
  label: string;
  frequency: string;
  channels: string[];
  day?: string;
  time?: string;
  notes?: string;
}

export interface DailyRoutine {
  configured: boolean;
  configuredAt: string;
  summary: string;
  items: DailyRoutineItem[];
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("communityId")
    .eq("id", user.id)
    .single();
  if (!profile?.communityId) return NextResponse.json(null);

  const { data } = await admin
    .from("AIMemory")
    .select("value")
    .eq("communityId", profile.communityId)
    .eq("type", "RECURRING_CONTENT")
    .eq("key", "daily_routine")
    .maybeSingle();

  return NextResponse.json(data?.value ?? null);
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("communityId")
    .eq("id", user.id)
    .single();
  if (!profile?.communityId) {
    return NextResponse.json({ error: "Communauté non configurée" }, { status: 400 });
  }

  const body = await request.json();

  // Mode extraction : conversation messages fournis → extraire la routine via IA
  if (body.messages) {
    const { data: community } = await admin
      .from("Community")
      .select("name, city")
      .eq("id", profile.communityId)
      .single();

    const extraction = await extractRoutineFromConversation(
      body.messages,
      community?.name ?? "",
      community?.city ?? ""
    );

    if (!extraction) {
      return NextResponse.json({ error: "Impossible d'extraire la routine" }, { status: 422 });
    }

    await saveRoutine(admin, profile.communityId, extraction);
    return NextResponse.json({ success: true, routine: extraction });
  }

  // Mode direct : routine JSON fournie
  const routine: DailyRoutine = body;
  await saveRoutine(admin, profile.communityId, routine);
  return NextResponse.json({ success: true });
}

const DAY_TO_INDEX: Record<string, number> = {
  Dimanche: 0,
  Lundi: 1,
  Mardi: 2,
  Mercredi: 3,
  Jeudi: 4,
  Vendredi: 5,
  Samedi: 6,
};

function toTime24(input?: string | null): string {
  if (!input) return "10:00";
  const cleaned = input.trim().toLowerCase().replace("h", ":");
  const [rawHours, rawMinutes] = cleaned.split(":");
  const hours = Number.parseInt(rawHours ?? "10", 10);
  const minutes = Number.parseInt(rawMinutes ?? "0", 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return "10:00";
  const hh = String(Math.max(0, Math.min(23, hours))).padStart(2, "0");
  const mm = String(Math.max(0, Math.min(59, minutes))).padStart(2, "0");
  return `${hh}:${mm}`;
}

function toStartDateISO(day?: string, time?: string): string {
  const now = new Date();
  const target = new Date(now);
  const dayIndex = day ? DAY_TO_INDEX[day] : undefined;
  if (typeof dayIndex === "number") {
    const delta = (dayIndex - now.getDay() + 7) % 7;
    target.setDate(now.getDate() + delta);
  }

  const [hours, minutes] = toTime24(time).split(":").map((value) => Number.parseInt(value, 10));
  target.setHours(hours, minutes, 0, 0);
  return target.toISOString();
}

function toRecurrenceRule(item: DailyRoutineItem) {
  const frequency = item.frequency.toLowerCase();
  const dayIndex = typeof item.day === "string" ? DAY_TO_INDEX[item.day] : undefined;

  if (frequency.includes("quotidien")) {
    return { freq: "DAILY" };
  }
  if (frequency.includes("mensuel")) {
    return { freq: "MONTHLY" };
  }
  if (frequency.includes("vendredi")) {
    return { freq: "WEEKLY", byday: [5] };
  }
  if (frequency.includes("hebdomadaire") || frequency.includes("bi-mensuel")) {
    return { freq: "WEEKLY", byday: typeof dayIndex === "number" ? [dayIndex] : [] };
  }
  if (frequency.includes("saisonnier")) {
    return { freq: "MONTHLY" };
  }
  if (frequency.includes("avant chaque")) {
    return { freq: "WEEKLY", byday: typeof dayIndex === "number" ? [dayIndex] : [] };
  }

  return { freq: "WEEKLY", byday: typeof dayIndex === "number" ? [dayIndex] : [] };
}

async function saveRoutine(
  admin: ReturnType<typeof createAdminClient>,
  communityId: string,
  routine: Partial<DailyRoutine>
) {
  const payload: DailyRoutine = {
    configured: true,
    configuredAt: new Date().toISOString(),
    summary: routine.summary ?? "",
    items: routine.items ?? [],
  };

  await admin.from("AIMemory").upsert(
    {
      id: crypto.randomUUID(),
      communityId,
      type: "RECURRING_CONTENT",
      key: "daily_routine",
      value: payload,
      relevance: 1.5,
      updatedAt: new Date().toISOString(),
    },
    { onConflict: "communityId,type,key" }
  );

  // Synchroniser la routine dans l'agenda client en evenements recurrents.
  await admin
    .from("Event")
    .delete()
    .eq("communityId", communityId)
    .ilike("notes", "%AUTO_DAILY_ROUTINE%");

  if (payload.items.length > 0) {
    const routineEvents = payload.items.map((item) => ({
      id: crypto.randomUUID(),
      communityId,
      title: item.label,
      description: item.notes ?? null,
      startDate: toStartDateISO(item.day, item.time),
      endDate: null,
      category: "ANNOUNCEMENT",
      status: "SCHEDULED",
      isRecurring: true,
      recurrenceRule: toRecurrenceRule(item),
      location: null,
      address: null,
      audience: null,
      isPublic: true,
      notes: `AUTO_DAILY_ROUTINE | ${item.frequency} | ${item.channels.join(", ")}`,
      updatedAt: new Date().toISOString(),
    }));
    await admin.from("Event").insert(routineEvents);
  }

  // Mettre à jour editorialRules avec le résumé de la routine
  if (payload.summary) {
    const rulesText = [
      "ROUTINE QUOTIDIENNE :",
      payload.summary,
      "",
      "ACTIONS RÉCURRENTES :",
      ...payload.items.map(
        (item) =>
          `- ${item.label} (${item.frequency}) sur ${item.channels.join(", ")}${item.notes ? ` — ${item.notes}` : ""}`
      ),
    ].join("\n");

    await admin
      .from("Community")
      .update({ editorialRules: rulesText, updatedAt: new Date().toISOString() })
      .eq("id", communityId);
  }
}

async function extractRoutineFromConversation(
  messages: Array<{ role: string; content: string }>,
  communityName: string,
  city: string
): Promise<Partial<DailyRoutine> | null> {
  try {
    const response = await openrouter.chat.completions.create({
      model: "google/gemini-2.5-flash",
      max_tokens: 1024,
      messages: [
        {
          role: "system",
          content: `Tu es un assistant qui extrait une routine de communication communautaire depuis une conversation.
Extrais les informations et retourne UNIQUEMENT un JSON valide (sans markdown, sans code block) avec cette structure :
{
  "summary": "Résumé court de la routine en 2-3 phrases",
  "items": [
    {
      "label": "Nom de l'action",
      "frequency": "Fréquence (ex: Chaque vendredi, Chaque lundi soir, Mensuel...)",
      "channels": ["WHATSAPP", "INSTAGRAM", "FACEBOOK", "TELEGRAM", "EMAIL"],
      "notes": "Notes optionnelles"
    }
  ]
}

Communauté : ${communityName}${city ? ` — ${city}` : ""}
Canaux disponibles : WHATSAPP, INSTAGRAM, FACEBOOK, TELEGRAM, EMAIL`,
        },
        ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        {
          role: "user",
          content: "Extrais maintenant la routine de communication de cette conversation au format JSON demandé.",
        },
      ],
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "";
    // Nettoyer les éventuels backticks markdown
    const cleaned = raw.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}
