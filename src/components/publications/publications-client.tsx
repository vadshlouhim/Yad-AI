"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Send, ExternalLink, RefreshCw, AlertCircle, CheckCircle,
  Clock, XCircle, Copy, Download
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
  INSTAGRAM: "📸", FACEBOOK: "👥", WHATSAPP: "💬",
  TELEGRAM: "✈️", EMAIL: "📧", WEB: "🌐",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  PUBLISHED: <CheckCircle className="size-4 text-emerald-600" />,
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

export function PublicationsClient({ publications, statsByStatus, activeStatus, activeChannel }: Props) {
  const router = useRouter();
  const [retrying, setRetrying] = useState<string | null>(null);

  const total = Object.values(statsByStatus).reduce((a, b) => a + b, 0);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Publications</h1>
        <p className="text-slate-500 mt-1">Historique et suivi de toutes vos publications</p>
      </div>

      {/* Filtres statut */}
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

      {/* Alerte échecs */}
      {(statsByStatus["FAILED"] ?? 0) > 0 && !activeStatus && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <AlertCircle className="size-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              {statsByStatus["FAILED"]} publication{statsByStatus["FAILED"] > 1 ? "s" : ""} en échec
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              Ces publications n&apos;ont pas pu être envoyées. Vous pouvez les relancer individuellement.
            </p>
          </div>
        </div>
      )}

      {/* Liste */}
      {publications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Send className="size-7 text-slate-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-700">Aucune publication</p>
              <p className="text-sm text-slate-400 mt-1">
                {activeStatus ? "Aucune publication avec ce statut." : "Créez du contenu et publiez-le sur vos canaux."}
              </p>
            </div>
            <Link href="/dashboard/content/new">
              <Button size="sm">Créer du contenu</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {publications.map((pub) => (
            <Card
              key={pub.id}
              className={cn(
                "border-slate-200 transition-shadow hover:shadow-sm",
                pub.status === "FAILED" && "border-red-200 bg-red-50/30",
                pub.status === "FALLBACK_READY" && "border-amber-200 bg-amber-50/30"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Canal emoji */}
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 text-xl shadow-sm">
                    {CHANNEL_EMOJI[pub.channelType] ?? "📢"}
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {pub.event?.title ?? pub.draft?.title ?? truncate(pub.content, 50)}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {CHANNEL_LABELS[pub.channelType]} ·{" "}
                          {pub.publishedAt
                            ? `Publié ${formatRelative(pub.publishedAt)}`
                            : pub.scheduledAt
                            ? `Prévu le ${formatDateTime(pub.scheduledAt)}`
                            : formatRelative(pub.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {STATUS_ICON[pub.status]}
                        <Badge variant={STATUS_VARIANT[pub.status] ?? "draft"} className="text-[11px]">
                          {PUBLICATION_STATUS_LABELS[pub.status] ?? pub.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Aperçu du contenu */}
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                      {truncate(pub.content, 150)}
                    </p>

                    {/* Fallback info */}
                    {pub.fallbackUsed && pub.fallbackType && (
                      <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 flex items-start gap-2">
                        <Copy className="size-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-700">
                          <strong>Fallback actif :</strong>{" "}
                          {{ COPY_PASTE: "Copier-coller", EXPORT_IMAGE: "Export image", EMAIL_DRAFT: "Brouillon email", OPEN_PLATFORM: "Plateforme externe" }[pub.fallbackType] ?? pub.fallbackType}
                        </div>
                      </div>
                    )}

                    {/* Erreur */}
                    {pub.error && (
                      <div className="mt-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                        <p className="text-xs text-red-700 line-clamp-2">{pub.error}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3">
                      {pub.externalUrl && (
                        <a
                          href={pub.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" size="sm" className="h-7 text-xs">
                            <ExternalLink className="size-3" />
                            Voir
                          </Button>
                        </a>
                      )}
                      {pub.status === "FAILED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
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
                          className="h-7 text-xs text-amber-600 border-amber-300 hover:bg-amber-50"
                          onClick={() => {
                            navigator.clipboard.writeText(pub.content);
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
          ))}
        </div>
      )}
    </div>
  );
}
