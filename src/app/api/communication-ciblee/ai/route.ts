import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requireTargetedCommunity } from "@/lib/targeted-communication/auth";

const openrouter = new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey: process.env.OPENROUTER_API_KEY! });

export async function POST(request: Request) {
  const context = await requireTargetedCommunity();
  if (!context) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const prompt = String(body.prompt ?? "").trim();
  if (prompt.length < 5 || prompt.length > 500) return NextResponse.json({ error: "Décrivez l’automatisation en une phrase." }, { status: 400 });
  const { data: categories } = await context.db.from("TargetedCategory").select("id,name").eq("communityId", context.communityId).eq("isActive", true).order("sortOrder");
  try {
    const response = await openrouter.chat.completions.create({
      model: "google/gemini-2.5-flash",
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `Transforme la demande en configuration hebdomadaire WhatsApp. Réponds uniquement en JSON avec: name, categoryId, weekday (0 dimanche à 6 samedi), sendTime HH:mm, eventTime HH:mm ou null, eventName, message, mode AUTO ou CONFIRM, skipYomTov, skipHolHamoed, skipSchoolHolidays. Utilise uniquement une categoryId de cette liste: ${JSON.stringify(categories ?? [])}. Le message peut employer {Prénom}, {Nom}, {Événement}, {Date}, {Heure}, {Adresse}, {Lien}. N'invente ni lieu ni lien.` },
        { role: "user", content: prompt },
      ],
    });
    const raw = response.choices[0]?.message?.content ?? "{}";
    return NextResponse.json(JSON.parse(raw));
  } catch (error) {
    console.error("[Communication ciblée IA]", error);
    return NextResponse.json({ error: "La création assistée n’est pas disponible pour le moment." }, { status: 500 });
  }
}
