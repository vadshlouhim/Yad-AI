import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildTemplateSuggestions,
  looksLikeTemplateIntent,
} from "@/lib/templates/shared";
import {
  buildArticleSuggestions,
  looksLikeArticleIntent,
} from "@/lib/articles/shared";

type RouteParams = { params: Promise<{ id: string }> };

type ConversationMessage = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
  templateSuggestions?: unknown[];
  articleSuggestions?: unknown[];
};

export async function GET(_request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();

  const { data: conversation } = await admin
    .from("Conversation")
    .select("id, title, communityId, createdAt, updatedAt, messages:ConversationMessage(id, role, content, createdAt)")
    .eq("id", id)
    .eq("userId", user.id)
    .single();

  if (!conversation) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }

  const messages = ((conversation.messages ?? []) as ConversationMessage[])
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());

  const userPromptsForSuggestions = messages
    .map((message, index) => ({ message, index }))
    .filter(({ message, index }) => {
      if (message.role !== "assistant") return false;
      const previousUserMessage = [...messages.slice(0, index)].reverse().find((item) => item.role === "user");
      if (!previousUserMessage) return false;
      return looksLikeTemplateIntent(previousUserMessage.content) || looksLikeArticleIntent(previousUserMessage.content);
    });

  if (userPromptsForSuggestions.length > 0) {
    const [{ data: candidateTemplates }, { data: candidateArticles }] = await Promise.all([
      admin
        .from("Template")
        .select("id, communityId, name, description, category, channelType, thumbnailUrl, previewUrl, tags, subCategory, isPremium, design, usageCount")
        .eq("isActive", true)
        .or(`isGlobal.eq.true,communityId.eq.${conversation.communityId}`)
        .limit(250),
      admin
        .from("Article")
        .select("id, communityId, slug, name, description, priceCents, currency, imageUrl, tags")
        .eq("isActive", true)
        .or(`isGlobal.eq.true,communityId.eq.${conversation.communityId}`)
        .limit(60),
    ]);

    for (const { message, index } of userPromptsForSuggestions) {
      const previousUserMessage = [...messages.slice(0, index)].reverse().find((item) => item.role === "user");
      if (!previousUserMessage) continue;

      if (looksLikeTemplateIntent(previousUserMessage.content)) {
        message.templateSuggestions = buildTemplateSuggestions(candidateTemplates ?? [], previousUserMessage.content, {
          limit: 3,
          communityId: conversation.communityId,
          forceAtLeastOne: true,
        });
      }

      if (looksLikeArticleIntent(previousUserMessage.content)) {
        message.articleSuggestions = buildArticleSuggestions(candidateArticles ?? [], previousUserMessage.content, {
          limit: 3,
          communityId: conversation.communityId,
          forceAtLeastOne: true,
        });
      }
    }
  }

  return NextResponse.json({ ...conversation, messages });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const admin = createAdminClient();

  const { data } = await admin
    .from("Conversation")
    .update({ title: body.title, updatedAt: new Date().toISOString() })
    .eq("id", id)
    .eq("userId", user.id)
    .select()
    .single();

  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();

  await admin.from("Conversation").delete().eq("id", id).eq("userId", user.id);
  return NextResponse.json({ success: true });
}
