"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle, Settings, ArrowLeft,
  ExternalLink, AlertCircle, Info
} from "lucide-react";
import Link from "next/link";
import { cn, CHANNEL_LABELS } from "@/lib/utils";

interface Channel {
  id: string;
  type: string;
  name: string;
  handle: string | null;
  isConnected: boolean;
  isActive: boolean;
  pageId: string | null;
  lastSyncAt: Date | null;
}

interface Props {
  channels: Channel[];
  communityId: string;
}

const CHANNEL_INFO: Record<string, {
  emoji: string;
  description: string;
  authType: string;
  manualSetup?: boolean;
  botField?: string;
  tokenField?: string;
}> = {
  INSTAGRAM: {
    emoji: "📸",
    description: "Publiez des posts et stories sur votre compte Instagram professionnel.",
    authType: "oauth",
  },
  FACEBOOK: {
    emoji: "👥",
    description: "Publiez sur votre page Facebook. Nécessite un accès administrateur.",
    authType: "oauth",
  },
  WHATSAPP: {
    emoji: "💬",
    description: "Diffusez via WhatsApp. Génère des liens et textes à copier-coller.",
    authType: "manual",
    manualSetup: true,
  },
  TELEGRAM: {
    emoji: "✈️",
    description: "Publiez dans vos groupes et canaux Telegram via un bot.",
    authType: "token",
    botField: "Token du bot Telegram",
    tokenField: "Chat ID du groupe/canal",
  },
  EMAIL: {
    emoji: "📧",
    description: "Envoyez des emails à votre liste de diffusion via Resend.",
    authType: "token",
    tokenField: "Clé API Resend",
  },
};

const CHANNEL_ORDER = ["INSTAGRAM", "FACEBOOK", "WHATSAPP", "TELEGRAM", "EMAIL"];

export function ChannelsSettingsClient({ channels, communityId }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState<Record<string, string>>({});

  // Map des canaux existants
  const channelMap = Object.fromEntries(channels.map((c) => [c.type, c]));

  async function connectOAuth(type: string) {
    window.location.href = `/api/auth/oauth/${type.toLowerCase()}?communityId=${communityId}`;
  }

  async function saveManualChannel(type: string) {
    setSaving(type);
    try {
      const existing = channelMap[type];
      const method = existing ? "PATCH" : "POST";
      const url = existing
        ? `/api/channels/${existing.id}`
        : "/api/channels";

      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          communityId,
          name: CHANNEL_LABELS[type],
          accessToken: tokenInput[`${type}_access`] || undefined,
          pageId: tokenInput[`${type}_pageid`] || undefined,
          isConnected: !!(tokenInput[`${type}_access`] || tokenInput[`${type}_pageid`]),
          isActive: true,
        }),
      });
      router.refresh();
    } finally {
      setSaving(null);
    }
  }

  async function toggleChannel(channel: Channel) {
    setSaving(channel.id);
    try {
      await fetch(`/api/channels/${channel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !channel.isActive }),
      });
      router.refresh();
    } finally {
      setSaving(null);
    }
  }

  async function disconnectChannel(channel: Channel) {
    if (!confirm(`Déconnecter ${CHANNEL_LABELS[channel.type]} ?`)) return;
    setDeletingId(channel.id);
    try {
      await fetch(`/api/channels/${channel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isConnected: false, accessToken: null, refreshToken: null }),
      });
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4" />
            Paramètres
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Canaux de diffusion</h1>
          <p className="text-slate-500 mt-1">Connectez vos réseaux sociaux et canaux de communication</p>
        </div>
      </div>

      {/* Info générale */}
      <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 flex items-start gap-3">
        <Info className="size-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700">
          Connectez vos canaux pour publier directement depuis Shalom IA. Les canaux non connectés
          génèrent des contenus à copier-coller.
        </p>
      </div>

      {/* Liste des canaux */}
      <div className="space-y-3">
        {CHANNEL_ORDER.map((type) => {
          const channel = channelMap[type];
          const info = CHANNEL_INFO[type];
          const isExpanded = expandedChannel === type;

          return (
            <Card key={type} className={cn(
              "border transition-all",
              channel?.isConnected && "border-emerald-200",
              !channel?.isActive && channel && "opacity-60"
            )}>
              <CardContent className="p-4">
                {/* En-tête canal */}
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl flex-shrink-0">
                    {info?.emoji}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-800">{CHANNEL_LABELS[type]}</p>
                      {channel?.isConnected
                        ? <Badge variant="published" className="text-[11px]">Connecté</Badge>
                        : channel
                        ? <Badge variant="draft" className="text-[11px]">Non connecté</Badge>
                        : <Badge variant="draft" className="text-[11px]">Non configuré</Badge>
                      }
                      {channel && !channel.isActive && (
                        <Badge variant="draft" className="text-[11px]">Désactivé</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {info?.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {channel?.isConnected && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => toggleChannel(channel)}
                        loading={saving === channel.id}
                      >
                        {channel.isActive ? "Désactiver" : "Activer"}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setExpandedChannel(isExpanded ? null : type)}
                    >
                      <Settings className="size-3.5" />
                      {channel?.isConnected ? "Configurer" : "Connecter"}
                    </Button>
                  </div>
                </div>

                {/* Panel de configuration */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                    {info?.authType === "oauth" ? (
                      <div className="space-y-3">
                        <p className="text-sm text-slate-600">
                          Connectez-vous via OAuth Meta. Une fois le compte connecté, Shalom IA pourra publier sur la page Facebook ou le compte Instagram professionnel associé.
                        </p>
                        {channel?.isConnected ? (
                          <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="size-4 text-emerald-600" />
                              <div>
                                <p className="text-sm font-medium text-emerald-800">
                                  {channel.handle ?? channel.name}
                                </p>
                                {channel.pageId && (
                                  <p className="text-xs text-emerald-600">Page ID: {channel.pageId}</p>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => disconnectChannel(channel)}
                              loading={deletingId === channel.id}
                            >
                              Déconnecter
                            </Button>
                          </div>
                        ) : (
                          <Button onClick={() => connectOAuth(type)} className="w-full sm:w-auto">
                            <ExternalLink className="size-4" />
                            Se connecter via {CHANNEL_LABELS[type]}
                          </Button>
                        )}
                      </div>
                    ) : info?.authType === "token" ? (
                      <div className="space-y-3">
                        {type === "TELEGRAM" && (
                          <>
                            <div className="space-y-1.5">
                              <label className="text-sm font-medium text-slate-700">Token du bot Telegram</label>
                              <input
                                type="password"
                                value={tokenInput[`${type}_access`] ?? (channel?.isConnected ? "••••••••" : "")}
                                onChange={(e) => setTokenInput((p) => ({ ...p, [`${type}_access`]: e.target.value }))}
                                placeholder="1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-sm font-medium text-slate-700">Chat ID</label>
                              <input
                                type="text"
                                value={tokenInput[`${type}_pageid`] ?? (channel?.pageId ?? "")}
                                onChange={(e) => setTokenInput((p) => ({ ...p, [`${type}_pageid`]: e.target.value }))}
                                placeholder="-1001234567890"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                              />
                              <p className="text-xs text-slate-400">
                                Ajoutez @userinfobot à votre groupe pour obtenir le Chat ID
                              </p>
                            </div>
                          </>
                        )}
                        {type === "EMAIL" && (
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">Clé API Resend</label>
                            <input
                              type="password"
                              value={tokenInput[`${type}_access`] ?? (channel?.isConnected ? "••••••••" : "")}
                              onChange={(e) => setTokenInput((p) => ({ ...p, [`${type}_access`]: e.target.value }))}
                              placeholder="re_xxxxxxxxxxxxxxxx"
                              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                            <p className="text-xs text-slate-400">
                              Créez une clé API sur{" "}
                              <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                resend.com
                              </a>
                            </p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => saveManualChannel(type)}
                            loading={saving === type}
                          >
                            <CheckCircle className="size-4" />
                            Sauvegarder
                          </Button>
                          {channel?.isConnected && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => disconnectChannel(channel)}
                            >
                              Déconnecter
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      // WhatsApp — manuel
                      <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
                        <AlertCircle className="size-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-700">
                          <p className="font-medium">Mode copier-coller</p>
                          <p className="text-xs mt-1">
                            WhatsApp ne permet pas la publication automatique sans l&apos;API Business.
                            Shalom IA génère le texte optimisé avec un lien <code>wa.me</code> à partager.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
