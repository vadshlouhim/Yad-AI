import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSystemPrompt, buildMemoryContext } from "@/lib/ai/prompts";
import OpenAI from "openai";

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

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
    const { messages, conversationId } = body;

    const [{ data: community }, { data: memories }] = await Promise.all([
      admin
        .from("Community")
        .select("name, city, tone, language, signature, hashtags, editorialRules, communityType, religiousStream")
        .eq("id", profile.communityId)
        .single(),
      admin
        .from("AIMemory")
        .select("*")
        .eq("communityId", profile.communityId)
        .order("relevance", { ascending: false })
        .limit(10),
    ]);

    if (!community) {
      return NextResponse.json({ error: "Communauté introuvable" }, { status: 404 });
    }

    const systemPrompt = buildSystemPrompt(community) + buildMemoryContext(memories ?? []);

    const lastUserMessage = messages[messages.length - 1];
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
          const openrouterStream = await openrouter.chat.completions.create({
            model: "google/gemini-2.5-flash",
            max_tokens: 2048,
            stream: true,
            messages: [
              { role: "system", content: systemPrompt },
              ...messages.slice(-20),
            ],
          });

          for await (const chunk of openrouterStream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              fullResponse += delta;
              const data = JSON.stringify({ content: delta });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
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

            const { count } = await admin
              .from("ConversationMessage")
              .select("*", { count: "exact", head: true })
              .eq("conversationId", conversationId);

            if (count === 2) {
              generateTitle(conversationId, lastUserMessage.content, admin).catch(console.error);
            }
          }
        } catch (error) {
          console.error("[AI Chat] Erreur streaming:", error);
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
  admin: ReturnType<typeof createAdminClient>
) {
  try {
    const response = await openrouter.chat.completions.create({
      model: "google/gemini-2.5-flash",
      max_tokens: 30,
      messages: [
        {
          role: "system",
          content: "Génère un titre très court (3-6 mots max) pour cette conversation. Réponds UNIQUEMENT avec le titre, sans guillemets ni ponctuation finale.",
        },
        { role: "user", content: firstMessage },
      ],
    });

    const title = response.choices[0]?.message?.content?.trim();
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
