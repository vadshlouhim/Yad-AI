import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { buildSystemPrompt, buildMemoryContext } from "@/lib/ai/prompts";
import OpenAI from "openai";

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export async function POST(request: Request) {
  try {
    // Auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { communityId: true },
    });
    if (!profile?.communityId) {
      return NextResponse.json({ error: "Communauté non configurée" }, { status: 400 });
    }

    const body = await request.json();
    const { messages, conversationId } = body;

    // Contexte communauté
    const [community, memories] = await Promise.all([
      prisma.community.findUnique({
        where: { id: profile.communityId },
        select: {
          name: true, city: true, tone: true, language: true,
          signature: true, hashtags: true, editorialRules: true,
          communityType: true, religiousStream: true,
        },
      }),
      prisma.aIMemory.findMany({
        where: { communityId: profile.communityId },
        orderBy: { relevance: "desc" },
        take: 10,
      }),
    ]);

    if (!community) {
      return NextResponse.json({ error: "Communauté introuvable" }, { status: 404 });
    }

    const systemPrompt = buildSystemPrompt(community) + buildMemoryContext(memories);

    // Sauvegarder le message utilisateur
    const lastUserMessage = messages[messages.length - 1];
    if (conversationId && lastUserMessage?.role === "user") {
      await prisma.conversationMessage.create({
        data: {
          conversationId,
          role: "user",
          content: lastUserMessage.content,
        },
      });
    }

    // Streaming SSE
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

          // Sauvegarder la réponse assistant + générer titre si premier échange
          if (conversationId && fullResponse) {
            await prisma.conversationMessage.create({
              data: {
                conversationId,
                role: "assistant",
                content: fullResponse,
              },
            });

            await prisma.conversation.update({
              where: { id: conversationId },
              data: { updatedAt: new Date() },
            });

            // Générer un titre si c'est le premier message (2 messages : user + assistant)
            const messageCount = await prisma.conversationMessage.count({
              where: { conversationId },
            });
            if (messageCount === 2) {
              generateTitle(conversationId, lastUserMessage.content).catch(console.error);
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

// Génère un titre court pour la conversation à partir du premier message
async function generateTitle(conversationId: string, firstMessage: string) {
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
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { title },
      });
    }
  } catch (error) {
    console.error("[AI Chat] Erreur génération titre:", error);
  }
}
