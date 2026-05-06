"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bot,
  CheckCircle2,
  Clock3,
  Filter,
  Camera,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { cn, formatDateTime, formatRelative } from "@/lib/utils";

type ChannelType = "EMAIL" | "MESSENGER" | "WHATSAPP" | "INSTAGRAM" | "TELEGRAM";
type Direction = "IN" | "OUT";
type MessageStatus = "SENT" | "DELIVERED" | "READ" | "FAILED" | "PENDING";

interface ChannelSync {
  channel: ChannelType;
  connected: boolean;
  lastSyncAt: Date;
  latencySec: number;
  issue?: string;
}

interface MessageItem {
  id: string;
  direction: Direction;
  channel: ChannelType;
  author: string;
  body: string;
  createdAt: Date;
  status: MessageStatus;
  aiSuggested?: boolean;
}

interface Conversation {
  id: string;
  contactName: string;
  contactHandle: string;
  channel: ChannelType;
  unreadCount: number;
  lastMessageAt: Date;
  lastMessagePreview: string;
  tags: string[];
  priority: "NORMAL" | "HIGH";
  messages: MessageItem[];
}

interface Props {
  channels: ChannelSync[];
  conversations: Conversation[];
}

const CHANNEL_META: Record<ChannelType, { label: string; icon: React.ReactNode; color: string }> = {
  EMAIL: { label: "Email", icon: <Mail className="size-4" />, color: "text-blue-600 bg-blue-50 border-blue-200" },
  MESSENGER: {
    label: "Messenger",
    icon: <MessageSquare className="size-4" />,
    color: "text-indigo-600 bg-indigo-50 border-indigo-200",
  },
  WHATSAPP: {
    label: "WhatsApp",
    icon: <MessageSquare className="size-4" />,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  INSTAGRAM: {
    label: "Instagram",
    icon: <Camera className="size-4" />,
    color: "text-fuchsia-600 bg-fuchsia-50 border-fuchsia-200",
  },
  TELEGRAM: {
    label: "Telegram",
    icon: <Send className="size-4" />,
    color: "text-cyan-600 bg-cyan-50 border-cyan-200",
  },
};

const STATUS_META: Record<MessageStatus, { label: string; tone: string }> = {
  SENT: { label: "Envoyé", tone: "text-slate-600" },
  DELIVERED: { label: "Distribué", tone: "text-blue-600" },
  READ: { label: "Lu", tone: "text-emerald-600" },
  FAILED: { label: "Échec", tone: "text-red-600" },
  PENDING: { label: "En attente", tone: "text-amber-600" },
};

export function MessagingClient({ channels, conversations }: Props) {
  const [query, setQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<"ALL" | ChannelType>("ALL");
  const [mode, setMode] = useState<"ALL" | "IN" | "OUT">("ALL");
  const [selectedConversationId, setSelectedConversationId] = useState(conversations[0]?.id ?? "");

  const filteredConversations = useMemo(() => {
    return conversations.filter((conversation) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        q.length === 0 ||
        conversation.contactName.toLowerCase().includes(q) ||
        conversation.contactHandle.toLowerCase().includes(q) ||
        conversation.lastMessagePreview.toLowerCase().includes(q);
      const matchesChannel = channelFilter === "ALL" || conversation.channel === channelFilter;
      const matchesMode =
        mode === "ALL" ||
        conversation.messages.some((message) => message.direction === mode);
      return matchesQuery && matchesChannel && matchesMode;
    });
  }, [conversations, query, channelFilter, mode]);

  const selectedConversation =
    filteredConversations.find((conversation) => conversation.id === selectedConversationId) ??
    filteredConversations[0] ??
    null;

  const totalUnread = conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0);
  const incomingCount = conversations.flatMap((conversation) => conversation.messages).filter((m) => m.direction === "IN").length;
  const outgoingCount = conversations.flatMap((conversation) => conversation.messages).filter((m) => m.direction === "OUT").length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
        <p className="text-sm text-slate-100">
          Centralisez ici tous les messages entrants et sortants (Email, Messenger, WhatsApp, Instagram, Telegram), avec
          une vue unique prête pour le pilotage IA.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Conversations actives" value={String(conversations.length)} hint="7 derniers jours" />
        <MetricCard label="Messages entrants" value={String(incomingCount)} hint="Synchronisés" />
        <MetricCard label="Messages sortants" value={String(outgoingCount)} hint="Tous canaux" />
        <MetricCard label="Non lus" value={String(totalUnread)} hint="À traiter" />
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="size-4 text-slate-600" />
            État de synchronisation
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {channels.map((channel) => {
            const meta = CHANNEL_META[channel.channel];
            const healthy = channel.connected && !channel.issue;
            return (
              <div key={channel.channel} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium", meta.color)}>
                    {meta.icon}
                    {meta.label}
                  </span>
                  {healthy ? (
                    <CheckCircle2 className="size-4 text-emerald-500" />
                  ) : (
                    <TriangleAlert className="size-4 text-amber-500" />
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-500">Dernière synchro {formatRelative(channel.lastSyncAt)}</p>
                <p className="text-xs text-slate-400">Latence: {channel.latencySec}s</p>
                {channel.issue && <p className="mt-1 text-xs text-amber-600">{channel.issue}</p>}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)_320px]">
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <div className="space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Rechercher un contact ou un message..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="size-4 text-slate-500" />
                <select
                  value={channelFilter}
                  onChange={(event) => setChannelFilter(event.target.value as "ALL" | ChannelType)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="ALL">Tous les canaux</option>
                  {Object.entries(CHANNEL_META).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value.label}
                    </option>
                  ))}
                </select>
                <select
                  value={mode}
                  onChange={(event) => setMode(event.target.value as "ALL" | "IN" | "OUT")}
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="ALL">Entrants + sortants</option>
                  <option value="IN">Entrants</option>
                  <option value="OUT">Sortants</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="max-h-[65vh] space-y-2 overflow-y-auto pr-1">
            {filteredConversations.map((conversation) => {
              const isActive = selectedConversation?.id === conversation.id;
              const channelMeta = CHANNEL_META[conversation.channel];
              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedConversationId(conversation.id)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2.5 text-left transition-colors",
                    isActive ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">{conversation.contactName}</p>
                    {conversation.unreadCount > 0 && (
                      <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-slate-500">{conversation.contactHandle}</p>
                  <p className="mt-1 truncate text-xs text-slate-600">{conversation.lastMessagePreview}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", channelMeta.color)}>
                      {channelMeta.icon}
                      {channelMeta.label}
                    </span>
                    <span className="text-[11px] text-slate-400">{formatRelative(conversation.lastMessageAt)}</span>
                  </div>
                </button>
              );
            })}
            {filteredConversations.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-200 px-3 py-8 text-center text-sm text-slate-500">
                Aucune conversation avec ces filtres.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            {selectedConversation ? (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{selectedConversation.contactName}</CardTitle>
                  <p className="text-xs text-slate-500">{selectedConversation.contactHandle}</p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedConversation.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[11px]">
                      {tag}
                    </Badge>
                  ))}
                  {selectedConversation.priority === "HIGH" && (
                    <Badge variant="ready" className="text-[11px]">
                      Priorité haute
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <CardTitle className="text-base">Conversation</CardTitle>
            )}
          </CardHeader>
          <CardContent>
            {!selectedConversation ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-3 py-8 text-center text-sm text-slate-500">
                Sélectionnez une conversation.
              </p>
            ) : (
              <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
                {selectedConversation.messages.map((message) => {
                  const statusMeta = STATUS_META[message.status];
                  const channelMeta = CHANNEL_META[message.channel];
                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "max-w-[90%] rounded-2xl border px-3 py-2.5",
                        message.direction === "OUT"
                          ? "ml-auto border-blue-200 bg-blue-50"
                          : "mr-auto border-slate-200 bg-white"
                      )}
                    >
                      <p className="text-sm text-slate-800">{message.body}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="text-slate-500">{message.author}</span>
                        <span className="text-slate-400">{formatDateTime(message.createdAt)}</span>
                        <span className={cn("font-medium", statusMeta.tone)}>{statusMeta.label}</span>
                        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium", channelMeta.color)}>
                          {channelMeta.icon}
                          {channelMeta.label}
                        </span>
                        {message.aiSuggested && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 font-medium text-violet-700">
                            <Sparkles className="size-3" />
                            Suggestion IA
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="size-4 text-violet-600" />
              Pilotage IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              Préparez la future boîte de réponse centralisée avec IA: suggestions, validation humaine, et envoi multicanal.
            </p>
            <div className="space-y-2">
              <Button className="w-full justify-start" variant="outline">
                <Sparkles className="size-4 text-violet-600" />
                Générer une réponse IA
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <ShieldCheck className="size-4 text-emerald-600" />
                Exiger validation avant envoi
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Send className="size-4 text-blue-600" />
                Envoyer sur le canal d&apos;origine
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <RefreshCw className="size-4 text-slate-600" />
                Relancer la synchronisation
              </Button>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-700">Règles futures recommandées</p>
              <ul className="mt-2 space-y-1 text-xs text-slate-600">
                <li>Validation obligatoire pour les réponses sensibles.</li>
                <li>Escalade auto vers admin après 2 échecs d&apos;envoi.</li>
                <li>Journal d&apos;audit complet IA + humain.</li>
              </ul>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center gap-2 text-amber-800">
                <Clock3 className="size-4" />
                <p className="text-xs font-semibold">Connecteurs en évolution</p>
              </div>
              <p className="mt-1 text-xs text-amber-700">
                Cette vue centralise déjà la logique produit. Les envois/lectures API par canal seront branchés ensuite.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="border-slate-200">
      <CardContent className="space-y-1 p-4">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-400">{hint}</p>
      </CardContent>
    </Card>
  );
}

