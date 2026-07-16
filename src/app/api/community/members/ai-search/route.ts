import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const requestSchema = z.object({
  query: z.string().trim().min(2).max(300),
});

const responseSchema = z.object({
  ids: z.array(z.string()).max(100),
  summary: z.string().trim().max(220),
});

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

function parseJsonResponse(content: string) {
  const normalized = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  return responseSchema.safeParse(JSON.parse(normalized));
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsedRequest = requestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json({ error: "Saisissez une recherche d'au moins deux caractères." }, { status: 400 });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: "Le service de recherche IA est momentanément indisponible." }, { status: 503 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("communityId")
    .eq("id", user.id)
    .single();
  if (!profile?.communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  const { data: contacts, error } = await admin
    .from("CommunityMember")
    .select("id, displayName, email, phone, city, profession, notes")
    .eq("communityId", profile.communityId)
    .order("displayName", { ascending: true })
    .limit(250);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const contactRows = contacts ?? [];
  if (contactRows.length === 0) return NextResponse.json({ ids: [], summary: "Aucun contact à analyser pour le moment." });

  const completion = await openrouter.chat.completions.create({
    model: "google/gemini-2.5-flash",
    temperature: 0,
    max_tokens: 500,
    messages: [
      {
        role: "system",
        content: `Tu es un moteur de recherche CRM précis. Interprète la demande de l'utilisateur en français et sélectionne uniquement les contacts qui y répondent. Tu peux utiliser le nom, l'email, le téléphone, la ville, la profession et les notes. N'invente jamais de données. Réponds uniquement par un objet JSON valide, sans markdown : {"ids":["id"],"summary":"courte explication en français"}. Les ids doivent appartenir strictement à la liste fournie.`,
      },
      {
        role: "user",
        content: `Demande : ${parsedRequest.data.query}\n\nContacts : ${JSON.stringify(contactRows)}`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "";
  try {
    const parsedResponse = parseJsonResponse(content);
    if (!parsedResponse.success) throw new Error("Réponse IA invalide");
    const knownIds = new Set(contactRows.map((contact) => contact.id));
    return NextResponse.json({
      ids: parsedResponse.data.ids.filter((id) => knownIds.has(id)),
      summary: parsedResponse.data.summary,
    });
  } catch (parseError) {
    console.error("[Contacts AI search] Invalid model response", parseError);
    return NextResponse.json({ error: "La recherche IA n'a pas pu interpréter cette demande." }, { status: 502 });
  }
}
