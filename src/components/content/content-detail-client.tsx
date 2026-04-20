"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft, Save, Send, Trash2, Copy, Check, Sparkles,
  Calendar, ExternalLink, RefreshCw, Wand2, Share2
} from "lucide-react";
import {
  cn, formatDateTime, formatRelative, CONTENT_STATUS_LABELS,
  PUBLICATION_STATUS_LABELS, CHANNEL_LABELS
} from "@/lib/utils";

interface ChannelAdaptation {
  id: string;
  channelType: string;
  body: string;
  hashtags: string[];
}

interface Publication {
  id: string;
  status: string;
  channelType: string;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  externalUrl: string | null;
  fallbackUsed: boolean;
  channel: { type: string; name: string };
}

interface Draft {
  id: string;
  title: string | null;
  body: string;
  hashtags: string[];
  status: string;
  contentType: string;
  aiGenerated: boolean;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  event: { id: string; title: string; startDate: Date; category: string } | null;
  channelAdaptations: ChannelAdaptation[];
  publications: Publication[];
}

interface Community {
  name: string;
  tone: string;
  hashtags: string[];
  channels: Array<{ type: string; isConnected: boolean; isActive: boolean; name: string }>;
}

interface Props {
  draft: Draft;
  community: Community;
}

const PUBLICATION_STATUS_VARIANT: Record<string, "draft" | "info" | "ready" | "published" | "scheduled" | "failed"> = {
  PENDING: "draft",
  SCHEDULED: "scheduled",
  PUBLISHING: "info",
  PUBLISHED: "published",
  FAILED: "failed",
  CANCELLED: "draft",
  FALLBACK_READY: "ready",
};

const CONTENT_STATUS_VARIANT: Record<string, "draft" | "info" | "ready" | "published" | "scheduled"> = {
  DRAFT: "draft",
  AI_PROPOSAL: "info",
  READY_TO_PUBLISH: "ready",
  PENDING_VALIDATION: "draft",
  APPROVED: "ready",
  PUBLISHED: "published",
  ARCHIVED: "draft",
};

export function ContentDetailClient({ draft, community }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [adapting, setAdapting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const [title, setTitle] = useState(draft.title ?? "");
  const [body, setBody] = useState(draft.body);
  const [hashtags, setHashtags] = useState(draft.hashtags.join(" "));
  const [selectedChannels, setSelectedChannels] = useState<string[]>(
    community.channels.filter((c) => c.isConnected).map((c) => c.type)
  );
  const [activeAdaptation, setActiveAdaptation] = useState<string | null>(null);

  const isDirty = title !== (draft.title ?? "") || body !== draft.body || hashtags !== draft.hashtags.join(" ");

  async function save() {
    setSaving(true);
    await fetch(`/api/content/drafts/${draft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title || null,
        body,
        hashtags: hashtags.split(/\s+/).filter(Boolean),
      }),
    });
    setSaving(false);
    router.refresh();
  }

  async function markReady() {
    await fetch(`/api/content/drafts/${draft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "READY_TO_PUBLISH" }),
    });
    router.refresh();
  }

  async function publishNow() {
    if (selectedChannels.length === 0) {
      alert("Sélectionnez au moins un canal.");
      return;
    }
    setPublishing(true);
    try {
      const res = await fetch("/api/publishing/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId: draft.id,
          channelTypes: selectedChannels,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      router.refresh();
    } catch (e) {
      alert("Erreur lors de la publication : " + (e as Error).message);
    } finally {
      setPublishing(false);
    }
  }

  async function adaptForChannels() {
    setAdapting(true);
    try {
      await fetch("/api/ai/adapt-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId: draft.id,
          channelTypes: selectedChannels,
        }),
      });
      router.refresh();
    } catch {
      alert("Erreur lors de l'adaptation.");
    } finally {
      setAdapting(false);
    }
  }

  async function deleteDraft() {
    if (!confirm("Supprimer ce brouillon ? Cette action est irréversible.")) return;
    setDeleting(true);
    await fetch(`/api/content/drafts/${draft.id}`, { method: "DELETE" });
    router.push("/dashboard/content");
  }

  function copy() {
    navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const currentAdaptation = draft.channelAdaptations.find((a) => a.channelType === activeAdaptation);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/content">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4" />
            Retour
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant={CONTENT_STATUS_VARIANT[draft.status] ?? "draft"} className="text-xs">
              {CONTENT_STATUS_LABELS[draft.status] ?? draft.status}
            </Badge>
            {draft.aiGenerated && (
              <Badge variant="info" className="text-xs">
                <Sparkles className="size-3 mr-1" /> IA
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={deleteDraft}
            loading={deleting}
            className="text-red-600 hover:bg-red-50"
          >
            <Trash2 className="size-4" />
          </Button>
          {isDirty && (
            <Button variant="outline" size="sm" onClick={save} loading={saving}>
              <Save className="size-4" />
              Sauvegarder
            </Button>
          )}
          {draft.status !== "READY_TO_PUBLISH" && draft.status !== "PUBLISHED" && (
            <Button variant="outline" size="sm" onClick={markReady}>
              <Check className="size-4" />
              Marquer prêt
            </Button>
          )}
          <Button size="sm" onClick={publishNow} loading={publishing}>
            <Send className="size-4" />
            Publier
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Éditeur principal */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              {/* Métadonnées */}
              <div className="flex items-center gap-3 text-xs text-slate-500">
                {draft.event && (
                  <Link
                    href={`/dashboard/events/${draft.event.id}`}
                    className="flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    <Calendar className="size-3" />
                    {draft.event.title}
                  </Link>
                )}
                <span>Modifié {formatRelative(draft.updatedAt)}</span>
              </div>

              {/* Titre */}
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre (optionnel)"
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-base font-semibold text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />

              {/* Onglets canal */}
              {draft.channelAdaptations.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  <button
                    onClick={() => setActiveAdaptation(null)}
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors",
                      !activeAdaptation
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    Original
                  </button>
                  {draft.channelAdaptations.map((adapt) => (
                    <button
                      key={adapt.channelType}
                      onClick={() => setActiveAdaptation(
                        activeAdaptation === adapt.channelType ? null : adapt.channelType
                      )}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors",
                        activeAdaptation === adapt.channelType
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {CHANNEL_LABELS[adapt.channelType]}
                    </button>
                  ))}
                </div>
              )}

              {/* Corps */}
              <div className="relative">
                <textarea
                  value={activeAdaptation && currentAdaptation ? currentAdaptation.body : body}
                  onChange={(e) => {
                    if (!activeAdaptation) setBody(e.target.value);
                  }}
                  readOnly={!!activeAdaptation}
                  rows={14}
                  className={cn(
                    "w-full rounded-lg border bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 resize-y leading-relaxed",
                    activeAdaptation
                      ? "border-slate-200 bg-slate-50 cursor-default focus:ring-0"
                      : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                  )}
                />
                <div className="absolute top-3 right-3 flex gap-1">
                  <button
                    onClick={copy}
                    className="p-1.5 rounded-lg bg-white/80 backdrop-blur hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    title="Copier"
                  >
                    {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                  </button>
                </div>
                <div className="absolute bottom-3 right-3 text-[11px] text-slate-400">
                  {(activeAdaptation && currentAdaptation ? currentAdaptation.body : body).length} car.
                </div>
              </div>

              {/* Hashtags */}
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Hashtags</label>
                <input
                  type="text"
                  value={activeAdaptation && currentAdaptation
                    ? currentAdaptation.hashtags.join(" ")
                    : hashtags}
                  onChange={(e) => { if (!activeAdaptation) setHashtags(e.target.value); }}
                  readOnly={!!activeAdaptation}
                  placeholder="#shabbat"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Colonne droite */}
        <div className="space-y-4">
          {/* Canaux */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Diffusion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {community.channels.filter((c) => c.isActive).map((channel) => {
                const isSelected = selectedChannels.includes(channel.type);
                const emoji = { INSTAGRAM: "📸", FACEBOOK: "👥", WHATSAPP: "💬", TELEGRAM: "✈️", EMAIL: "📧", WEB: "🌐" }[channel.type] ?? "📢";

                return (
                  <button
                    key={channel.type}
                    onClick={() => setSelectedChannels((prev) =>
                      prev.includes(channel.type)
                        ? prev.filter((c) => c !== channel.type)
                        : [...prev, channel.type]
                    )}
                    className={cn(
                      "w-full flex items-center gap-2.5 p-2.5 rounded-xl border transition-all text-left",
                      isSelected ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <span>{emoji}</span>
                    <span className="text-sm font-medium text-slate-700 flex-1">
                      {CHANNEL_LABELS[channel.type]}
                    </span>
                    <div className={cn(
                      "w-4 h-4 rounded border-2 flex items-center justify-center",
                      isSelected ? "border-blue-600 bg-blue-600" : "border-slate-300"
                    )}>
                      {isSelected && <Check className="size-2.5 text-white" />}
                    </div>
                  </button>
                );
              })}

              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 text-amber-600 border-amber-200 hover:bg-amber-50"
                onClick={adaptForChannels}
                loading={adapting}
                disabled={selectedChannels.length === 0}
              >
                <Wand2 className="size-3.5" />
                Adapter pour chaque canal
              </Button>
            </CardContent>
          </Card>

          {/* Historique publications */}
          {draft.publications.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Share2 className="size-4 text-slate-500" />
                  Publications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {draft.publications.map((pub) => (
                  <div
                    key={pub.id}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50"
                  >
                    <span className="text-base">
                      {{ INSTAGRAM: "📸", FACEBOOK: "👥", WHATSAPP: "💬", TELEGRAM: "✈️", EMAIL: "📧", WEB: "🌐" }[pub.channelType] ?? "📢"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700">
                        {CHANNEL_LABELS[pub.channelType]}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {pub.publishedAt
                          ? formatDateTime(pub.publishedAt)
                          : pub.scheduledAt
                          ? `Prévu ${formatRelative(pub.scheduledAt)}`
                          : "Non programmé"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge
                        variant={PUBLICATION_STATUS_VARIANT[pub.status] ?? "draft"}
                        className="text-[10px]"
                      >
                        {PUBLICATION_STATUS_LABELS[pub.status] ?? pub.status}
                      </Badge>
                      {pub.externalUrl && (
                        <a
                          href={pub.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded hover:bg-slate-200"
                        >
                          <ExternalLink className="size-3 text-slate-400" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
