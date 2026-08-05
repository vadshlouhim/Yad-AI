import { AdminConsoleClient } from "@/components/admin/admin-console-client";
import { canAccessAdmin } from "@/lib/admin-access";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBillingConfig } from "@/lib/billing";
import { resolveTemplateAssetUrl } from "@/lib/templates/shared";
import { isTemplateSchemaOutdated } from "@/lib/templates/admin-errors";
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
  | "Article"
  | "ContactLead"
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
    leadCount,
    automationCount,
    eventCount,
    publicationCount,
    { data: templates, error: templatesError },
    { data: communities },
    { data: users },
    { data: contactLeads },
    { data: subscriptions },
    { data: automations },
    { data: recentConversations },
    { count: aiGeneratedDraftCount },
    { count: draftsWithImagesCount },
    billingConfig,
  ] = await Promise.all([
    countRows(admin, "profiles"),
    countRows(admin, "Community"),
    countRows(admin, "Conversation"),
    countRows(admin, "ConversationMessage"),
    countRows(admin, "ContentDraft"),
    countRows(admin, "MediaFile"),
    countRows(admin, "Template"),
    countRows(admin, "Article"),
    countRows(admin, "ContactLead"),
    countRows(admin, "Automation"),
    countRows(admin, "Event"),
    countRows(admin, "Publication"),
    admin
      .from("Template")
      .select(
        "id, communityId, name, description, category, subCategory, channelType, originalUrl, thumbnailUrl, previewUrl, isGlobal, isPremium, isActive, tags, usageCount, createdAt, updatedAt"
      )
      .order("usageCount", { ascending: false })
      .order("updatedAt", { ascending: false }),
    admin
      .from("Community")
      .select("id, name, city, plan, planExpiresAt, onboardingDone, communityType, religiousStream, vocabulary, createdAt, updatedAt")
      .order("updatedAt", { ascending: false })
      .limit(50),
    admin
      .from("profiles")
      .select("id, name, email, role, communityId")
      .order("email", { ascending: true }),
    admin
      .from("ContactLead")
      .select("id, name, email, phone, organization, subject, message, source, pageUrl, ipAddress, userAgent, status, emailSentAt, emailError, createdAt, updatedAt")
      .order("createdAt", { ascending: false })
      .limit(200),
    admin
      .from("Subscription")
      .select("id, communityId, plan, status, currentPeriodStart, currentPeriodEnd, createdAt")
      .order("createdAt", { ascending: false }),
    admin
      .from("Automation")
      .select("id, communityId, name, description, trigger, triggerConfig, actions, isActive, status, lastRunAt, nextRunAt, createdAt, updatedAt, community:Community(id, name, city)")
      .order("updatedAt", { ascending: false })
      .limit(200),
    admin
      .from("Conversation")
      .select("id, title, communityId, createdAt, updatedAt, community:Community(name, city)")
      .order("updatedAt", { ascending: false })
      .limit(10),
    admin.from("ContentDraft").select("id", { count: "exact", head: true }).eq("aiGenerated", true),
    admin.from("ContentDraft").select("id", { count: "exact", head: true }).not("imageUrl", "is", null),
    getBillingConfig(admin),
  ]);

  const hydratedTemplates = (templates ?? []).map((template) => ({
    ...template,
    originalUrl: resolveTemplateAssetUrl(template.originalUrl),
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
        leadCount,
        automationCount,
        eventCount,
        publicationCount,
        imageGenerationCount: totalTemplateUsage + (draftsWithImagesCount ?? 0),
        templateUsageCount: totalTemplateUsage,
        databaseItemCount:
          draftCount + mediaCount + templateCount + articleCount + leadCount + automationCount + eventCount + publicationCount,
      }}
      templates={hydratedTemplates}
      initialTemplateError={
        templatesError
          ? isTemplateSchemaOutdated(templatesError)
            ? "La base Supabase doit être mise à jour avant de gérer les affiches."
            : "Impossible de charger les affiches depuis Supabase."
          : null
      }
      communities={communities ?? []}
      users={(users ?? []).map((user) => {
        const community = (communities ?? []).find((item) => item.id === user.communityId) ?? null;
        const subscription = (subscriptions ?? []).find((item) => item.communityId === user.communityId) ?? null;
        const vocabulary = community?.vocabulary as { adminBillingSince?: unknown } | null | undefined;

        return {
          ...user,
          communityName: community?.name ?? null,
          communityCity: community?.city ?? null,
          communityPlan: community?.plan ?? null,
          planExpiresAt: community?.planExpiresAt ?? null,
          adminBillingSince:
            typeof vocabulary?.adminBillingSince === "string"
              ? vocabulary.adminBillingSince
              : subscription?.currentPeriodStart ?? community?.createdAt ?? null,
          subscription: subscription
            ? {
                id: subscription.id,
                plan: subscription.plan,
                status: subscription.status,
                currentPeriodStart: subscription.currentPeriodStart,
                currentPeriodEnd: subscription.currentPeriodEnd,
                createdAt: subscription.createdAt,
              }
            : null,
        };
      })}
      contactLeads={contactLeads ?? []}
      automations={(automations ?? []).map((automation) => ({
        ...automation,
        community: firstRelation(automation.community),
      }))}
      recentConversations={(recentConversations ?? []).map((conversation) => ({
        ...conversation,
        community: firstRelation(conversation.community),
      }))}
      billingConfig={billingConfig}
    />
  );
}
