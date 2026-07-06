"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertCircle,
  ChevronDown,
  CheckCircle,
  Copy,
  ExternalLink,
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
import { SocialPageBanner } from "@/components/publish/social-page-banner";

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
  channel: { type: string; name: string; handle: string | null; pageId: string | null; settings: Record<string, unknown> | null };
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

const CHANNEL_ACCENT_CLASSES: Record<string, { line: string; preview: string; dot: string }> = {
  WHATSAPP: { line: "bg-emerald-500", preview: "border-emerald-300", dot: "bg-emerald-500" },
  INSTAGRAM: { line: "bg-gradient-to-b from-pink-500 to-orange-400", preview: "border-pink-300", dot: "bg-pink-500" },
  FACEBOOK: { line: "bg-blue-600", preview: "border-blue-300", dot: "bg-blue-600" },
  TELEGRAM: { line: "bg-sky-500", preview: "border-sky-300", dot: "bg-sky-500" },
  EMAIL: { line: "bg-indigo-600", preview: "border-indigo-300", dot: "bg-indigo-600" },
  WEB: { line: "bg-violet-600", preview: "border-violet-300", dot: "bg-violet-600" },
};

const CHANNEL_FILTERS = [
  { label: "Tous les réseaux", value: "ALL", logo: SOCIAL_LOGOS.ALL, colorClass: "bg-[#0d2f6b] text-white border-transparent" },
  { label: "WhatsApp", value: "WHATSAPP", logo: SOCIAL_LOGOS.WHATSAPP, colorClass: "bg-emerald-600 text-white border-transparent hover:bg-emerald-700" },
  { label: "Instagram", value: "INSTAGRAM", logo: SOCIAL_LOGOS.INSTAGRAM, colorClass: "bg-gradient-to-br from-pink-600 via-rose-600 to-orange-500 text-white border-transparent hover:opacity-95" },
  { label: "Facebook", value: "FACEBOOK", logo: SOCIAL_LOGOS.FACEBOOK, colorClass: "bg-blue-700 text-white border-transparent hover:bg-blue-800" },
  { label: "Telegram", value: "TELEGRAM", logo: SOCIAL_LOGOS.TELEGRAM, colorClass: "bg-sky-600 text-white border-transparent hover:bg-sky-700" },
  { label: "Email", value: "EMAIL", logo: SOCIAL_LOGOS.EMAIL, colorClass: "bg-rose-600 text-white border-transparent hover:bg-rose-700" },
];

const CHANNEL_FILTER_STYLES: Record<string, { active: string; inactive: string }> = {
  ALL: {
    active: "bg-[#0d2f6b] text-white border-transparent shadow-md shadow-blue-950/15",
    inactive: "border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-400",
  },
  WHATSAPP: {
    active: "bg-emerald-600 text-white border-transparent shadow-md shadow-emerald-200",
    inactive: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300",
  },
  INSTAGRAM: {
    active: "bg-gradient-to-br from-pink-600 via-rose-600 to-orange-500 text-white border-transparent shadow-md shadow-pink-200",
    inactive: "border-pink-200 bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50 text-pink-700 hover:border-pink-300 hover:from-pink-100 hover:via-rose-100 hover:to-orange-100",
  },
  FACEBOOK: {
    active: "bg-blue-700 text-white border-transparent shadow-md shadow-blue-200",
    inactive: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300",
  },
  TELEGRAM: {
    active: "bg-sky-600 text-white border-transparent shadow-md shadow-sky-200",
    inactive: "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:border-sky-300",
  },
  EMAIL: {
    active: "bg-indigo-700 text-white border-transparent shadow-md shadow-indigo-200",
    inactive: "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300",
  },
};

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

function buildChannelProfileUrl(pub: Publication) {
  if (pub.channelType === "INSTAGRAM" && pub.channel?.handle) {
    return `https://www.instagram.com/${pub.channel.handle.replace(/^@/, "")}`;
  }
  if (pub.channelType === "INSTAGRAM") {
    return null;
  }
  if (pub.channelType === "FACEBOOK") {
    const metaPageId = typeof pub.channel?.settings?.metaPageId === "string" ? pub.channel.settings.metaPageId : null;
    const pageId = pub.channel?.pageId ?? metaPageId;
    return pageId ? `https://www.facebook.com/${pageId}` : null;
  }
  return pub.externalUrl;
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
    const accent = CHANNEL_ACCENT_CLASSES[pub.channelType] ?? {
      line: "bg-slate-400",
      preview: "border-slate-200 bg-slate-50/60",
      dot: "bg-slate-400",
    };
    const profileUrl = buildChannelProfileUrl(pub);

    return (
      <Card
        key={pub.id}
        className={cn(
          "group overflow-hidden rounded-[24px] border border-slate-200/90 bg-white/95 shadow-sm shadow-slate-200/40 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/60",
          pub.status === "FAILED" && "border-red-200 bg-red-50/20 hover:border-red-300"
        )}
      >
        <CardContent className="p-0">
          <details className="group/details">
            <summary className="flex cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <div className={cn("w-1.5 flex-shrink-0", accent.line)} />
            <div className="flex min-w-0 flex-1 items-center gap-4 p-4 sm:p-5">
              <div className={cn("flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border shadow-sm", brand.bg, brand.text, brand.border)}>
                {SOCIAL_LOGOS[pub.channelType] ?? <Zap className="size-4" />}
              </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="line-clamp-2 text-base font-bold leading-snug text-slate-900">
                    {pub.event?.title ?? pub.draft?.title ?? truncate(pub.content, 50)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {CHANNEL_LABELS[pub.channelType]} ·{" "}
                    {pub.publishedAt ? `Publié ${formatRelative(pub.publishedAt)}` : formatRelative(pub.createdAt)}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  {STATUS_ICON[pub.status]}
                  <Badge variant={STATUS_VARIANT[pub.status] ?? "failed"} className="hidden text-[11px] sm:inline-flex">
                    {PUBLICATION_STATUS_LABELS[pub.status] ?? pub.status}
                  </Badge>
                  <span className="flex size-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition-all duration-200 group-open/details:rotate-180 group-hover:bg-white group-hover:text-slate-800">
                    <ChevronDown className="size-4" />
                  </span>
                </div>
              </div>

            </div>
          </div>
            </summary>
            <div className="flex border-t border-slate-100">
              <div className={cn("w-1.5 flex-shrink-0", accent.line)} />
              <div className="min-w-0 flex-1 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
              <div className={cn("rounded-[22px] border-2 bg-white px-4 py-3 shadow-sm shadow-slate-200/60", accent.preview)}>
                <div className="contents">
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

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                {profileUrl && (
                  <a href={profileUrl} target="_blank" rel="noopener noreferrer">
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
          </details>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <SocialPageBanner
        title="Historique des publications"
        color="#071F49"
        statusLabel="Publications envoyées"
      />

      <div className="flex flex-wrap justify-center gap-2 pb-1">
        {CHANNEL_FILTERS.map((tab) => {
          const isActive = currentChannel === tab.value;
          const styles = CHANNEL_FILTER_STYLES[tab.value] ?? CHANNEL_FILTER_STYLES.ALL;
          const href =
            tab.value === "ALL"
              ? `/dashboard/publications?status=${currentStatus}`
              : `/dashboard/publications?status=${currentStatus}&channel=${tab.value}`;

          return (
            <Link key={tab.value} href={href}>
              <button
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98]",
                  isActive ? styles.active : styles.inactive
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
