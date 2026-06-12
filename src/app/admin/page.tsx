import { AdminConsoleClient } from "@/components/admin/admin-console-client";
import { canAccessAdmin } from "@/lib/admin-access";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTemplateAssetUrl } from "@/lib/templates/shared";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Admin global - EasyCom IA" };

type CountableTable =
  | "profiles"
  | "Community"
  | "Conversation"
  | "ConversationMessage"
  | "ContentDraft"
  | "MediaFile"
  | "Template"
  | "AutomationPreset"
  | "Article"
  | "Automation"
  | "Event"
  | "Publication";

async function countRows(admin: ReturnType<typeof createAdminClient>, table: CountableTable) {
  const { count } = await admin.from(table).select("id", { count: "exact", head: true });
  return count ?? 0;
}

function firstRelation<T>(relation: T | T[] | null | undefined): T | null {
  if (Array.isArray(relation)) return relation[0] ?? null;
  return relation ?? null;
}

export default async function AdminPage() {
  const { profile } = await requireAuth();
  if (!canAccessAdmin(profile)) {
    redirect("/dashboard");
  }

  const admin = createAdminClient();

  const [
    userCount,
    communityCount,
    conversationCount,
    messageCount,
    draftCount,
    mediaCount,
    templateCount,
    articleCount,
    automationCount,
    eventCount,
    publicationCount,
    { data: templates },
    { data: communities },
    { data: users },
    { data: automations },
    { data: automationPresets },
    { data: presetUsages },
    { data: recentConversations },
    { count: aiGeneratedDraftCount },
    { count: draftsWithImagesCount },
  ] = await Promise.all([
    countRows(admin, "profiles"),
    countRows(admin, "Community"),
    countRows(admin, "Conversation"),
    countRows(admin, "ConversationMessage"),
    countRows(admin, "ContentDraft"),
    countRows(admin, "MediaFile"),
    countRows(admin, "Template"),
    countRows(admin, "Article"),
    countRows(admin, "Automation"),
    countRows(admin, "Event"),
    countRows(admin, "Publication"),
    admin
      .from("Template")
      .select(
        "id, communityId, name, description, category, subCategory, channelType, thumbnailUrl, previewUrl, isGlobal, isPremium, isActive, tags, usageCount, createdAt, updatedAt"
      )
      .order("usageCount", { ascending: false })
      .order("updatedAt", { ascending: false }),
    admin
      .from("Community")
      .select("id, name, city, plan, onboardingDone, communityType, religiousStream, createdAt, updatedAt")
      .order("updatedAt", { ascending: false })
      .limit(50),
    admin
      .from("profiles")
      .select("id, name, email, role, communityId")
      .order("email", { ascending: true }),
    admin
      .from("Automation")
      .select("id, communityId, name, description, trigger, triggerConfig, actions, isActive, status, lastRunAt, nextRunAt, createdAt, updatedAt, community:Community(id, name, city)")
      .order("updatedAt", { ascending: false })
      .limit(200),
    admin
      .from("AutomationPreset")
      .select("*")
      .order("sortOrder", { ascending: true })
      .order("title", { ascending: true }),
    admin.from("Automation").select("id, presetId").not("presetId", "is", null),
    admin
      .from("Conversation")
      .select("id, title, communityId, createdAt, updatedAt, community:Community(name, city)")
      .order("updatedAt", { ascending: false })
      .limit(10),
    admin.from("ContentDraft").select("id", { count: "exact", head: true }).eq("aiGenerated", true),
    admin.from("ContentDraft").select("id", { count: "exact", head: true }).not("imageUrl", "is", null),
  ]);

  const hydratedTemplates = (templates ?? []).map((template) => ({
    ...template,
    thumbnailUrl: resolveTemplateAssetUrl(template.thumbnailUrl),
    previewUrl: resolveTemplateAssetUrl(template.previewUrl),
    tags: template.tags ?? [],
  }));

  const totalTemplateUsage = hydratedTemplates.reduce((total, template) => total + (template.usageCount ?? 0), 0);
  const globalTemplateCount = hydratedTemplates.filter((template) => template.isGlobal).length;
  const activeTemplateCount = hydratedTemplates.filter((template) => template.isActive).length;

  return (
    <AdminConsoleClient
      metrics={{
        userCount,
        communityCount,
        conversationCount,
        messageCount,
        draftCount,
        aiGeneratedDraftCount: aiGeneratedDraftCount ?? 0,
        mediaCount,
        templateCount,
        globalTemplateCount,
        activeTemplateCount,
        articleCount,
        automationCount,
        eventCount,
        publicationCount,
        imageGenerationCount: totalTemplateUsage + (draftsWithImagesCount ?? 0),
        templateUsageCount: totalTemplateUsage,
        databaseItemCount:
          draftCount + mediaCount + templateCount + articleCount + automationCount + eventCount + publicationCount,
      }}
      templates={hydratedTemplates}
      communities={communities ?? []}
      users={users ?? []}
      automations={(automations ?? []).map((automation) => ({
        ...automation,
        community: firstRelation(automation.community),
      }))}
      automationPresets={(automationPresets ?? []).map((preset) => ({
        ...preset,
        usageCount: (presetUsages ?? []).filter((automation) => automation.presetId === preset.id).length,
      }))}
      recentConversations={(recentConversations ?? []).map((conversation) => ({
        ...conversation,
        community: firstRelation(conversation.community),
      }))}
    />
  );
}
