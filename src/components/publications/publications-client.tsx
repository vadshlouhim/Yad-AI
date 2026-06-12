"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertCircle,
  CheckCircle,
  Copy,
  ExternalLink,
  Eye,
  RefreshCw,
  Trash2,
  XCircle,
  Zap,
} from "lucide-react";
import {
  CHANNEL_LABELS,
  PUBLICATION_STATUS_LABELS,
  cn,
  formatRelative,
  truncate,
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

const SOCIAL_LOGOS: Record<string, React.ReactNode> = {
  ALL: (
    <svg className="size-4.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
    </svg>
  ),
  WHATSAPP: (
    <svg className="size-4.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.517 2.266 2.27 3.51 5.284 3.507 8.49-.006 6.66-5.344 11.997-11.957 11.997-2.005-.001-3.973-.5-5.739-1.453L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.859-4.42 9.863-9.864.002-2.634-1.02-5.11-2.881-6.974C16.592 1.897 14.1 1.87 11.999 1.87c-5.439 0-9.861 4.421-9.865 9.867-.001 1.733.46 3.424 1.336 4.921l-.988 3.597 3.7-.978zM17.15 14.5c-.282-.141-1.67-.824-1.928-.918-.258-.095-.447-.141-.636.141-.189.282-.731.918-.897 1.107-.166.189-.333.213-.615.072-1.048-.523-1.83-.984-2.525-2.18-.184-.316.184-.294.526-.976.059-.118.03-.222-.015-.316-.045-.094-.447-1.077-.612-1.472-.16-.388-.323-.336-.447-.342-.116-.006-.25-.007-.386-.007-.136 0-.356.05-.543.254-.187.204-.714.698-.714 1.701 0 1.004.73 1.976.832 2.113.102.136 1.436 2.193 3.48 3.076.486.209.866.335 1.161.429.489.156.935.134 1.286.082.392-.058 1.205-.493 1.376-.97.171-.476.171-.885.12-.97-.051-.085-.19-.136-.472-.277z" />
    </svg>
  ),
  INSTAGRAM: (
    <svg className="size-4.5 stroke-current fill-none stroke-[2]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  ),
  FACEBOOK: (
    <svg className="size-4.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
    </svg>
  ),
  TELEGRAM: (
    <svg className="size-4.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.422 1.32a1.328 1.328 0 00-1.284-.092L1.51 9.074a1.31 1.31 0 00-.142 2.378L5.91 13.53l12.44-8.082c.162-.105.352.12.214.258l-10.156 10.19-.364 5.342c.036.56.326.83.676.83a1.18 1.18 0 00.866-.396l2.544-2.456 5.27 3.882c.974.536 2.03-.024 2.226-1.156l2.946-13.886a1.324 1.324 0 00-.746-1.368z" />
    </svg>
  ),
  EMAIL: (
    <svg className="size-4.5 stroke-current fill-none stroke-[2]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  WEB: (
    <svg className="size-4.5 stroke-current fill-none stroke-[2]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
};

const CHANNEL_BRAND_CLASSES: Record<string, { bg: string; text: string; border: string }> = {
  WHATSAPP: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" },
  INSTAGRAM: { bg: "bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50", text: "text-pink-600", border: "border-pink-200" },
  FACEBOOK: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
  TELEGRAM: { bg: "bg-sky-50", text: "text-sky-600", border: "border-sky-200" },
  EMAIL: { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-200" },
  WEB: { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-200" },
};

const CHANNEL_FILTERS = [
  { label: "Tous les réseaux", value: "ALL", logo: SOCIAL_LOGOS.ALL, colorClass: "bg-[#0d2f6b] text-white border-transparent" },
  { label: "WhatsApp", value: "WHATSAPP", logo: SOCIAL_LOGOS.WHATSAPP, colorClass: "bg-emerald-600 text-white border-transparent hover:bg-emerald-700" },
  { label: "Instagram", value: "INSTAGRAM", logo: SOCIAL_LOGOS.INSTAGRAM, colorClass: "bg-gradient-to-br from-pink-600 via-rose-600 to-orange-500 text-white border-transparent hover:opacity-95" },
  { label: "Facebook", value: "FACEBOOK", logo: SOCIAL_LOGOS.FACEBOOK, colorClass: "bg-blue-700 text-white border-transparent hover:bg-blue-800" },
  { label: "Telegram", value: "TELEGRAM", logo: SOCIAL_LOGOS.TELEGRAM, colorClass: "bg-sky-600 text-white border-transparent hover:bg-sky-700" },
  { label: "Email", value: "EMAIL", logo: SOCIAL_LOGOS.EMAIL, colorClass: "bg-rose-600 text-white border-transparent hover:bg-rose-700" },
];

const STATUS_ICON: Record<string, React.ReactNode> = {
  PUBLISHED: <CheckCircle className="size-4 text-emerald-600" />,
  FAILED: <XCircle className="size-4 text-red-600" />,
};

const STATUS_VARIANT: Record<string, "published" | "failed"> = {
  PUBLISHED: "published",
  FAILED: "failed",
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
    return `${text}\n\n#communaute #easycomia`;
  }
  return text;
}

export function PublicationsClient({ publications, statsByStatus, activeStatus, activeChannel }: Props) {
  const router = useRouter();
  const [retrying, setRetrying] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const currentChannel = activeChannel || "ALL";
  const currentStatus = activeStatus === "FAILED" ? "FAILED" : "PUBLISHED";
  const interactiveButtonClass = "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:scale-[0.98]";

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

  async function deletePublication(id: string) {
    const confirmed = window.confirm("Supprimer cette publication de l'historique ?");
    if (!confirmed) return;

    setDeleting(id);
    try {
      const response = await fetch(`/api/publications/${id}`, { method: "DELETE" });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error ?? "Suppression impossible.");
      }
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Suppression impossible.");
    } finally {
      setDeleting(null);
    }
  }

  function renderPublicationCard(pub: Publication) {
    const brand = CHANNEL_BRAND_CLASSES[pub.channelType] ?? {
      bg: "bg-slate-50",
      text: "text-slate-600",
      border: "border-slate-200",
    };

    return (
      <Card
        key={pub.id}
        className={cn(
          "overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 transition-shadow hover:shadow-md hover:shadow-blue-100/30",
          pub.status === "FAILED" && "border-red-200 bg-red-50/30"
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className={cn("flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border shadow-sm", brand.bg, brand.text, brand.border)}>
              {SOCIAL_LOGOS[pub.channelType] ?? <Zap className="size-4" />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {pub.event?.title ?? pub.draft?.title ?? truncate(pub.content, 50)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {CHANNEL_LABELS[pub.channelType]} ·{" "}
                    {pub.publishedAt ? `Publié ${formatRelative(pub.publishedAt)}` : formatRelative(pub.createdAt)}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  {STATUS_ICON[pub.status]}
                  <Badge variant={STATUS_VARIANT[pub.status] ?? "failed"} className="text-[11px]">
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

              {pub.error && (
                <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                  <p className="line-clamp-2 text-xs text-red-700">{pub.error}</p>
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {pub.externalUrl && (
                  <a href={pub.externalUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className={cn("h-7 text-xs", interactiveButtonClass)}>
                      <ExternalLink className="size-3" />
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
                {pub.status === "PUBLISHED" && pub.channelType === "WHATSAPP" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn("h-7 text-xs", interactiveButtonClass)}
                    onClick={() => {
                      navigator.clipboard.writeText(cleanPreviewText(pub.content));
                      alert("Contenu copié !");
                    }}
                  >
                    <Copy className="size-3" />
                    Copier le contenu
                  </Button>
                )}
                {(pub.status === "PUBLISHED" || pub.status === "FAILED") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn("h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700", interactiveButtonClass)}
                    onClick={() => deletePublication(pub.id)}
                    loading={deleting === pub.id}
                  >
                    <Trash2 className="size-3" />
                    Supprimer
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
            <p className="mt-1 text-sm text-blue-100/80">
              Dès qu’une publication a été envoyée sur un réseau, elle apparaît ici.
            </p>
          </div>
          <Link href="/dashboard/automations">
            <Button size="sm" className={cn("bg-white text-slate-900 hover:bg-blue-50 active:bg-blue-100 focus-visible:ring-white/70", interactiveButtonClass)}>
              Mes publications programmées
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2 pb-1">
        {CHANNEL_FILTERS.map((tab) => {
          const isActive = currentChannel === tab.value;
          const href =
            tab.value === "ALL"
              ? `/dashboard/publications?status=${currentStatus}`
              : `/dashboard/publications?status=${currentStatus}&channel=${tab.value}`;

          return (
            <Link key={tab.value} href={href}>
              <button
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-bold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]",
                  isActive ? tab.colorClass : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                {tab.logo}
                <span>{tab.label}</span>
              </button>
            </Link>
          );
        })}
      </div>

      <div className="flex flex-wrap justify-center gap-1.5">
        {[
          { label: "Envoyées avec succès", value: "PUBLISHED" },
          { label: "Échecs", value: "FAILED" },
        ].map((filter) => {
          const isActive = currentStatus === filter.value;
          const count = statsByStatus[filter.value] ?? 0;
          const href = `/dashboard/publications?status=${filter.value}${activeChannel ? `&channel=${activeChannel}` : ""}`;

          return (
            <Link key={filter.value} href={href}>
              <button
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]",
                  isActive ? "bg-[#0d2f6b] text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-blue-50/50 hover:shadow-sm"
                )}
              >
                {filter.label}
                <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500")}>
                  {count}
                </span>
              </button>
            </Link>
          );
        })}
      </div>

      {(statsByStatus.FAILED ?? 0) > 0 && currentStatus !== "FAILED" && (
        <div className="mx-auto flex max-w-4xl items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 size-5 flex-shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              {statsByStatus.FAILED} publication{statsByStatus.FAILED > 1 ? "s" : ""} en échec
            </p>
            <p className="mt-0.5 text-xs text-red-600">
              Ces publications n&apos;ont pas pu être envoyées. Vous pouvez les relancer individuellement.
            </p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-4xl space-y-4">
        {publications.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-[32px] border border-dashed border-slate-200 bg-slate-50/70 px-6 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-xl shadow-md shadow-slate-200/50">
              <Zap className="size-6 text-slate-400" />
            </div>
            <p className="mt-4 text-base font-bold text-slate-800">Aucune publication</p>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              Aucune publication ne correspond à ce filtre.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {publications.map((pub) => renderPublicationCard(pub))}
          </div>
        )}
      </div>
    </div>
  );
}
