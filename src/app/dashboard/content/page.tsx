import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, FileText, Sparkles } from "lucide-react";
import { AutomationsClient } from "@/components/automations/automations-client";
import { ContentDeleteButton } from "@/components/content/content-delete-button";
import { formatRelative, CONTENT_STATUS_LABELS, truncate } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Contenu & automatisations — Shalom IA" };

const STATUS_VARIANT: Record<string, "draft" | "info" | "ready" | "published" | "scheduled"> = {
  DRAFT: "draft",
  AI_PROPOSAL: "info",
  READY_TO_PUBLISH: "ready",
  PENDING_VALIDATION: "draft",
  APPROVED: "ready",
  PUBLISHED: "published",
  ARCHIVED: "draft",
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  EVENT_ANNOUNCEMENT: "Annonce événement",
  EVENT_REMINDER: "Rappel événement",
  EVENT_DAY: "Jour J",
  EVENT_RECAP: "Compte-rendu",
  SHABBAT_TIMES: "Horaires Chabbat",
  HOLIDAY_GREETING: "Vœux de fête",
  DAILY_CONTENT: "Contenu quotidien",
  COURSE_ANNOUNCEMENT: "Annonce cours",
  COMMUNITY_NEWS: "Actualité",
  FUNDRAISING: "Collecte",
  GENERAL: "Général",
  EVENT_POST: "Post événement",
};

const CONTENT_STATUSES = ["DRAFT", "AI_PROPOSAL", "READY_TO_PUBLISH", "PUBLISHED", "ARCHIVED"];

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string }>;
}) {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const params = await searchParams;
  const admin = createAdminClient();

  let query = admin
    .from("ContentDraft")
    .select("*, event:Event(title, category, startDate), channelAdaptations:ChannelAdaptation(channelType), publications:Publication(status)")
    .eq("communityId", communityId)
    .order("updatedAt", { ascending: false })
    .limit(50);

  if (params.status) query = query.eq("status", params.status);
  if (params.type) query = query.eq("contentType", params.type);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [
    { data: drafts },
    statusCounts,
    { data: automations },
    { data: communityAutomationIds },
  ] = await Promise.all([
    query,
    Promise.all(
      CONTENT_STATUSES.map(async (status) => {
        const { count } = await admin
          .from("ContentDraft")
          .select("*", { count: "exact", head: true })
          .eq("communityId", communityId)
          .eq("status", status);
        return [status, count ?? 0] as [string, number];
      })
    ),
    admin
      .from("Automation")
      .select("*, event:Event(title, startDate), runs:AutomationRun(*)")
      .eq("communityId", communityId)
      .order("createdAt", { ascending: false }),
    admin
      .from("Automation")
      .select("id")
      .eq("communityId", communityId),
  ]);

  const automationIds = communityAutomationIds?.map((automation) => automation.id) ?? [];
  const { data: runs } = automationIds.length
    ? await admin
        .from("AutomationRun")
        .select("*, automation:Automation(name)")
        .in("automationId", automationIds)
        .gte("startedAt", weekAgo.toISOString())
        .order("startedAt", { ascending: false })
        .limit(20)
    : { data: [] };

  const totalByStatus = Object.fromEntries(statusCounts);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50 to-teal-50 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Communication</p>
          <h1 className="text-2xl font-bold text-slate-900">Contenu & automatisations</h1>
          <p className="text-slate-500 mt-1">
            Brouillons, propositions IA, contenus prêts et programmations automatiques
          </p>
        </div>
        <Link href="/dashboard/content/new">
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-500">
            <Plus className="size-4" />
            Nouveau contenu
          </Button>
        </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
        <section className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Contenus</p>
                <h2 className="mt-2 text-xl font-bold text-slate-900">Créer et préparer</h2>
                <p className="mt-1 text-sm text-slate-500">Actions rapides pour générer, relire et publier.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/dashboard/content/new?ai=true">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-500">
                    <Sparkles className="size-4" />
                    Générer avec l&apos;IA
                  </Button>
                </Link>
                <Link href="/dashboard/content/new">
                  <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                    <Plus className="size-4" />
                    Créer manuellement
                  </Button>
                </Link>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {[
                { label: "Post Chabbat", href: "/dashboard/content/new?type=SHABBAT_TIMES&ai=true" },
                { label: "Annonce événement", href: "/dashboard/content/new?type=EVENT_ANNOUNCEMENT&ai=true" },
                { label: "Rappel J-5", href: "/dashboard/content/new?type=EVENT_REMINDER&ai=true" },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </div>

      {/* Filtres par statut */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Tous", value: "" },
          { label: "Brouillons", value: "DRAFT" },
          { label: "Propositions IA", value: "AI_PROPOSAL" },
          { label: "Prêt à publier", value: "READY_TO_PUBLISH" },
          { label: "Publiés", value: "PUBLISHED" },
          { label: "Archivés", value: "ARCHIVED" },
        ].map((filter) => {
          const isActive = (params.status ?? "") === filter.value;
          const count = filter.value ? (totalByStatus[filter.value] ?? 0) : (drafts?.length ?? 0);
          return (
            <Link
              key={filter.value}
              href={filter.value ? `/dashboard/content?status=${filter.value}` : "/dashboard/content"}
            >
              <button
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-emerald-600 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {filter.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                  {count}
                </span>
              </button>
            </Link>
          );
        })}
      </div>

      {/* Liste des brouillons */}
      {!drafts?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
              <FileText className="size-7 text-slate-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-700">Aucun contenu pour l&apos;instant</p>
              <p className="text-sm text-slate-400 mt-1">
                Créez votre premier contenu ou laissez l&apos;IA vous proposer quelque chose.
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/dashboard/content/new">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-500">
                  <Plus className="size-4" />
                  Créer un contenu
                </Button>
              </Link>
              <Link href="/dashboard/content/new?ai=true">
                <Button variant="outline" size="sm">
                  <Sparkles className="size-4 text-amber-500" />
                  Générer avec l&apos;IA
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {drafts.map((draft) => {
            const pubs = draft.publications as Array<{ status: string }>;
            const publishedCount = pubs.filter((p) => p.status === "PUBLISHED").length;
            const failedCount = pubs.filter((p) => p.status === "FAILED").length;
            const adaptations = draft.channelAdaptations as Array<{ channelType: string }>;

            return (
              <Link
                key={draft.id}
                href={`/dashboard/content/${draft.id}`}
                className="block group"
              >
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-slate-200 hover:border-emerald-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        draft.aiGenerated ? "bg-amber-100" : "bg-slate-100"
                      }`}>
                        {draft.aiGenerated
                          ? <Sparkles className="size-5 text-amber-600" />
                          : <FileText className="size-5 text-slate-500" />
                        }
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors">
                              {draft.title ?? truncate(draft.body, 60)}
                            </p>
                            <p className="text-sm text-slate-400 mt-0.5 line-clamp-2">
                              {draft.title ? truncate(draft.body, 100) : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={STATUS_VARIANT[draft.status] ?? "draft"}
                              className="flex-shrink-0 text-[11px]"
                            >
                              {CONTENT_STATUS_LABELS[draft.status] ?? draft.status}
                            </Badge>
                            <ContentDeleteButton id={draft.id} />
                          </div>
                        </div>

                        <div className="flex items-center flex-wrap gap-3 mt-3">
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            {CONTENT_TYPE_LABELS[draft.contentType] ?? draft.contentType}
                          </span>

                          {draft.event && (
                            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              📅 {(draft.event as { title: string }).title}
                            </span>
                          )}

                          {adaptations.length > 0 && (
                            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              {adaptations.length} canal{adaptations.length > 1 ? "x" : ""}
                            </span>
                          )}

                          {publishedCount > 0 && (
                            <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                              ✓ {publishedCount} publié{publishedCount > 1 ? "s" : ""}
                            </span>
                          )}
                          {failedCount > 0 && (
                            <span className="text-xs text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                              ✗ {failedCount} échec{failedCount > 1 ? "s" : ""}
                            </span>
                          )}

                          <span className="text-xs text-slate-400 ml-auto">
                            {formatRelative(draft.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

        </section>

        <aside className="space-y-4">
      <AutomationsClient
        automations={(automations ?? []) as Parameters<typeof AutomationsClient>[0]["automations"]}
        recentRuns={(runs ?? []) as Parameters<typeof AutomationsClient>[0]["recentRuns"]}
        embedded
      />
        </aside>
      </div>
    </div>
  );
}
