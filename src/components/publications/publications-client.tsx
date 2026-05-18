"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ExternalLink, RefreshCw, AlertCircle, CheckCircle,
  Clock, XCircle, Copy, Eye
} from "lucide-react";
import {
  formatDateTime, formatRelative, CHANNEL_LABELS,
  PUBLICATION_STATUS_LABELS, truncate, cn
} from "@/lib/utils";

interface Publication {
  id: string;
  status: string;
  channelType: string;
  content: string;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  externalUrl: string | null;
  externalId: string | null;
  fallbackUsed: boolean;
  fallbackType: string | null;
  error: string | null;
  retryCount: number;
  createdAt: Date;
  channel: { type: string; name: string };
  event: { title: string; category: string } | null;
  draft: { title: string | null; body: string } | null;
}

interface Props {
  publications: Publication[];
  statsByStatus: Record<string, number>;
  activeStatus?: string;
  activeChannel?: string;
}

const CHANNEL_EMOJI: Record<string, string> = {
  INSTAGRAM: "📸",
  FACEBOOK: "👥",
  WHATSAPP: "💬",
  TELEGRAM: "✈️",
  EMAIL: "📧",
  WEB: "🌐",
};

const CHANNEL_ORDER = ["INSTAGRAM", "FACEBOOK", "WHATSAPP", "TELEGRAM", "EMAIL", "WEB"] as const;

const STATUS_ICON: Record<string, React.ReactNode> = {
  PUBLISHED: <CheckCircle className="size-4 text-blue-600" />,
  SCHEDULED: <Clock className="size-4 text-blue-600" />,
  PENDING: <Clock className="size-4 text-slate-400" />,
  FAILED: <XCircle className="size-4 text-red-600" />,
  PUBLISHING: <RefreshCw className="size-4 text-blue-600 animate-spin" />,
  CANCELLED: <XCircle className="size-4 text-slate-400" />,
  FALLBACK_READY: <Copy className="size-4 text-amber-600" />,
};

const STATUS_VARIANT: Record<string, "draft" | "info" | "ready" | "published" | "scheduled" | "failed"> = {
  PENDING: "draft",
  SCHEDULED: "scheduled",
  PUBLISHING: "info",
  PUBLISHED: "published",
  FAILED: "failed",
  CANCELLED: "draft",
  FALLBACK_READY: "ready",
};

function cleanPreviewText(value: string): string {
  return value
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/#+\s?/g, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function buildChannelPreview(pub: Publication) {
  const text = cleanPreviewText(pub.content);
  if (pub.channelType === "EMAIL") {
    return `Objet: ${pub.event?.title ?? pub.draft?.title ?? "Information communautaire"}\n\n${text}`;
  }
  if (pub.channelType === "INSTAGRAM") {
    return `${text}\n\n#communaute #shalomia`;
  }
  return text;
}

export function PublicationsClient({ publications, statsByStatus, activeStatus, activeChannel }: Props) {
  const router = useRouter();
  void activeChannel;
  const [retrying, setRetrying] = useState<string | null>(null);

  const total = Object.values(statsByStatus).reduce((a, b) => a + b, 0);
  const interactiveButtonClass = "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:scale-[0.98]";

  const publicationGroups = publications.reduce<Record<string, Publication[]>>((acc, pub) => {
    const key = pub.channelType || "AUTRE";
    if (!acc[key]) acc[key] = [];
    acc[key].push(pub);
    return acc;
  }, {});

  const extraChannels = Object.keys(publicationGroups)
    .filter((channel) => !CHANNEL_ORDER.includes(channel as (typeof CHANNEL_ORDER)[number]))
    .sort((a, b) => a.localeCompare(b));

  const displayChannels = [...CHANNEL_ORDER, ...extraChannels];

  async function retryPublication(id: string) {
    setRetrying(id);
    try {
      await fetch(`/api/publishing/retry/${id}`, { method: "POST" });
      router.refresh();
    } catch {
      alert("Erreur lors de la relance.");
    } finally {
      setRetrying(null);
    }
  }

  function renderPublicationCard(pub: Publication) {
    return (
      <Card
        key={pub.id}
        className={cn(
          "border-slate-200/90 bg-white/95 transition-shadow hover:shadow-md hover:shadow-blue-100/50",
          pub.status === "FAILED" && "border-red-200 bg-red-50/30",
          pub.status === "FALLBACK_READY" && "border-amber-200 bg-amber-50/30"
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50/70 text-xl shadow-sm shadow-blue-100/30">
              {CHANNEL_EMOJI[pub.channelType] ?? "📢"}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {pub.event?.title ?? pub.draft?.title ?? truncate(pub.content, 50)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {CHANNEL_LABELS[pub.channelType]} ·{" "}
                    {pub.publishedAt
                      ? `Publié ${formatRelative(pub.publishedAt)}`
                      : pub.scheduledAt
                        ? `Prévu le ${formatDateTime(pub.scheduledAt)}`
                        : formatRelative(pub.createdAt)}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  {STATUS_ICON[pub.status]}
                  <Badge variant={STATUS_VARIANT[pub.status] ?? "draft"} className="text-[11px]">
                    {PUBLICATION_STATUS_LABELS[pub.status] ?? pub.status}
                  </Badge>
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                    Prévisualisation {CHANNEL_LABELS[pub.channelType]}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                    <Eye className="size-3" />
                    Rendu
                  </span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                  <p className="line-clamp-6 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                    {truncate(buildChannelPreview(pub), 320)}
                  </p>
                </div>
              </div>

              {pub.fallbackUsed && pub.fallbackType && (
                <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <Copy className="mt-0.5 size-3.5 flex-shrink-0 text-amber-600" />
                  <div className="text-xs text-amber-700">
                    <strong>Fallback actif :</strong>{" "}
                    {{ COPY_PASTE: "Copier-coller", EXPORT_IMAGE: "Export image", EMAIL_DRAFT: "Brouillon email", OPEN_PLATFORM: "Plateforme externe" }[pub.fallbackType] ?? pub.fallbackType}
                  </div>
                </div>
              )}

              {pub.error && (
                <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                  <p className="line-clamp-2 text-xs text-red-700">{pub.error}</p>
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {pub.externalUrl && (
                  <a
                    href={pub.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className={cn("h-7 text-xs", interactiveButtonClass)}>
                      <ExternalLink className="size-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                      Voir
                    </Button>
                  </a>
                )}
                {pub.status === "FAILED" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn("h-7 text-xs", interactiveButtonClass)}
                    onClick={() => retryPublication(pub.id)}
                    loading={retrying === pub.id}
                  >
                    <RefreshCw className="size-3" />
                    Relancer ({pub.retryCount})
                  </Button>
                )}
                {pub.status === "FALLBACK_READY" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn("h-7 border-amber-300 text-xs text-amber-600 hover:bg-amber-50", interactiveButtonClass)}
                    onClick={() => {
                      navigator.clipboard.writeText(cleanPreviewText(pub.content));
                      alert("Contenu copié !");
                    }}
                  >
                    <Copy className="size-3" />
                    Copier le contenu
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-blue-800/60 bg-gradient-to-br from-[#0a1b44] via-[#13346f] to-[#08172f] p-6 shadow-lg shadow-slate-950/35">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 h-1.5 w-10 rounded-full bg-blue-300" />
            <h1 className="mt-2 text-2xl font-bold text-white">Historique des publications</h1>
            <p className="mt-1 text-sm text-blue-100/75">
              Retrouvez ici l&apos;historique des contenus publiés et le suivi de vos envois par canal.
            </p>
          </div>
          <Link href="/dashboard/automations">
            <Button size="sm" className={cn("bg-white text-slate-900 hover:bg-blue-50 active:bg-blue-100 focus-visible:ring-white/70", interactiveButtonClass)}>
              Mes publications programmées
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { label: "Toutes", value: "" },
          { label: "Publiées", value: "PUBLISHED" },
          { label: "Programmées", value: "SCHEDULED" },
          { label: "En attente", value: "PENDING" },
          { label: "Échecs", value: "FAILED" },
          { label: "Export prêt", value: "FALLBACK_READY" },
        ].map((filter) => {
          const isActive = (activeStatus ?? "") === filter.value;
          const count = filter.value ? (statsByStatus[filter.value] ?? 0) : total;
          return (
            <Link
              key={filter.value}
              href={filter.value ? `/dashboard/publications?status=${filter.value}` : "/dashboard/publications"}
            >
              <button
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]",
                  isActive
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-100"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-blue-50 hover:shadow-sm"
                )}
              >
                {filter.label}
                <span className={cn("rounded-full px-1.5 py-0.5 text-xs", isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500")}>
                  {count}
                </span>
              </button>
            </Link>
          );
        })}
      </div>

      {(statsByStatus["FAILED"] ?? 0) > 0 && !activeStatus && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 size-5 flex-shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              {statsByStatus["FAILED"]} publication{statsByStatus["FAILED"] > 1 ? "s" : ""} en échec
            </p>
            <p className="mt-0.5 text-xs text-red-600">
              Ces publications n&apos;ont pas pu être envoyées. Vous pouvez les relancer individuellement.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
        {displayChannels.map((channelType) => {
          const channelPublications = publicationGroups[channelType] ?? [];

          return (
            <section key={channelType} className="flex h-full min-h-[22rem] flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-blue-100/30">
              <div className="mb-4 rounded-2xl border border-blue-100 bg-gradient-to-r from-slate-50 via-blue-50/80 to-white p-3">
                <div className="mb-3 h-1 w-10 rounded-full bg-blue-500/80" />
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-white text-xl shadow-sm shadow-blue-100/40">
                    {CHANNEL_EMOJI[channelType] ?? "📢"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-bold text-slate-900">
                      {CHANNEL_LABELS[channelType] ?? channelType}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {channelPublications.length} publication{channelPublications.length > 1 ? "s" : ""}
                    </p>
                  </div>
                  <Badge variant="info" className="border border-blue-100 bg-blue-50 text-blue-700">
                    Canal
                  </Badge>
                </div>
              </div>

              {channelPublications.length === 0 ? (
                <div className="flex min-h-48 flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl shadow-sm shadow-slate-200">
                    {CHANNEL_EMOJI[channelType] ?? "📢"}
                  </div>
                  <p className="mt-4 text-sm font-semibold text-slate-700">Aucune publication</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {activeStatus
                      ? "Aucune publication pour ce filtre dans ce canal."
                      : "Aucun contenu publié ou programmé pour ce canal pour le moment."}
                  </p>
                </div>
              ) : (
                <div className="flex-1 space-y-3">
                  {channelPublications.map((pub) => renderPublicationCard(pub))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
