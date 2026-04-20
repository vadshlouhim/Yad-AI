import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, FileText, Sparkles, Filter } from "lucide-react";
import { formatRelative, CONTENT_STATUS_LABELS, EVENT_CATEGORY_LABELS, truncate } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Contenu — Yad.ia" };

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

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string }>;
}) {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const params = await searchParams;

  const where: Record<string, unknown> = { communityId };
  if (params.status) where.status = params.status;
  if (params.type) where.contentType = params.type;

  const [drafts, counts] = await Promise.all([
    prisma.contentDraft.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        event: { select: { title: true, category: true, startDate: true } },
        channelAdaptations: { select: { channelType: true } },
        publications: { select: { status: true } },
      },
    }),
    prisma.contentDraft.groupBy({
      by: ["status"],
      where: { communityId },
      _count: true,
    }),
  ]);

  const totalByStatus = Object.fromEntries(counts.map((c: { status: string; _count: number }) => [c.status, c._count]));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contenu</h1>
          <p className="text-slate-500 mt-1">
            Brouillons, propositions IA et contenu prêt à publier
          </p>
        </div>
        <Link href="/dashboard/content/new">
          <Button size="sm">
            <Plus className="size-4" />
            Nouveau contenu
          </Button>
        </Link>
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
          const count = filter.value ? (totalByStatus[filter.value] ?? 0) : drafts.length;
          return (
            <Link
              key={filter.value}
              href={filter.value ? `/dashboard/content?status=${filter.value}` : "/dashboard/content"}
            >
              <button
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
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
      {drafts.length === 0 ? (
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
                <Button size="sm">
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
            const publishedCount = draft.publications.filter((p) => p.status === "PUBLISHED").length;
            const failedCount = draft.publications.filter((p) => p.status === "FAILED").length;

            return (
              <Link
                key={draft.id}
                href={`/dashboard/content/${draft.id}`}
                className="block group"
              >
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-slate-200 hover:border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Icône */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        draft.aiGenerated ? "bg-amber-100" : "bg-slate-100"
                      }`}>
                        {draft.aiGenerated
                          ? <Sparkles className="size-5 text-amber-600" />
                          : <FileText className="size-5 text-slate-500" />
                        }
                      </div>

                      {/* Contenu */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">
                              {draft.title ?? truncate(draft.body, 60)}
                            </p>
                            <p className="text-sm text-slate-400 mt-0.5 line-clamp-2">
                              {draft.title ? truncate(draft.body, 100) : ""}
                            </p>
                          </div>
                          <Badge
                            variant={STATUS_VARIANT[draft.status] ?? "draft"}
                            className="flex-shrink-0 text-[11px]"
                          >
                            {CONTENT_STATUS_LABELS[draft.status] ?? draft.status}
                          </Badge>
                        </div>

                        <div className="flex items-center flex-wrap gap-3 mt-3">
                          {/* Type de contenu */}
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            {CONTENT_TYPE_LABELS[draft.contentType] ?? draft.contentType}
                          </span>

                          {/* Événement lié */}
                          {draft.event && (
                            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                              📅 {draft.event.title}
                            </span>
                          )}

                          {/* Adaptations canaux */}
                          {draft.channelAdaptations.length > 0 && (
                            <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                              {draft.channelAdaptations.length} canal{draft.channelAdaptations.length > 1 ? "x" : ""}
                            </span>
                          )}

                          {/* Publications */}
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

                          {/* Date */}
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
    </div>
  );
}
