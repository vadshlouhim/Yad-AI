"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BellRing,
  Bot,
  Camera,
  CheckCircle2,
  Clock3,
  Filter,
  Mail,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ChannelType = "EMAIL" | "MESSENGER" | "WHATSAPP" | "INSTAGRAM" | "TELEGRAM";
type Direction = "IN" | "OUT";
type MessageStatus = "SENT" | "DELIVERED" | "READ" | "FAILED" | "PENDING";
type PriorityFilter = "ALL" | "EXTREME" | "URGENT" | "IMPORTANT" | "LOW";
type DateFilter = "ALL" | "TODAY" | "7D" | "30D";

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

const CHANNEL_META: Record<
  ChannelType,
  {
    label: string;
    icon: React.ReactNode;
    chipClassName: string;
    cardClassName: string;
    emptyIconClassName: string;
  }
> = {
  EMAIL: {
    label: "Email",
    icon: <Mail className="size-4" />,
    chipClassName: "text-slate-700 bg-slate-50 border-slate-200",
    cardClassName: "from-slate-50/90 via-white to-slate-100/70 border-slate-200/80",
    emptyIconClassName: "text-slate-600 border-slate-200 bg-white",
  },
  MESSENGER: {
    label: "Facebook",
    icon: <MessageSquare className="size-4" />,
    chipClassName: "text-blue-700 bg-blue-50 border-blue-200",
    cardClassName: "from-blue-50/90 via-white to-cyan-50/70 border-blue-200/70",
    emptyIconClassName: "text-blue-600 border-blue-100 bg-white",
  },
  WHATSAPP: {
    label: "WhatsApp",
    icon: <MessageSquare className="size-4" />,
    chipClassName: "text-emerald-700 bg-emerald-50 border-emerald-200",
    cardClassName: "from-emerald-50/90 via-white to-emerald-100/70 border-emerald-200/70",
    emptyIconClassName: "text-emerald-600 border-emerald-100 bg-white",
  },
  INSTAGRAM: {
    label: "Instagram",
    icon: <Camera className="size-4" />,
    chipClassName: "text-fuchsia-700 bg-fuchsia-50 border-fuchsia-200",
    cardClassName: "from-fuchsia-50/90 via-white to-pink-50/70 border-fuchsia-200/70",
    emptyIconClassName: "text-fuchsia-600 border-fuchsia-100 bg-white",
  },
  TELEGRAM: {
    label: "Telegram",
    icon: <Send className="size-4" />,
    chipClassName: "text-sky-700 bg-sky-50 border-sky-200",
    cardClassName: "from-sky-50/90 via-white to-cyan-50/70 border-sky-200/70",
    emptyIconClassName: "text-sky-600 border-sky-100 bg-white",
  },
};

const CHANNEL_ORDER: ChannelType[] = ["INSTAGRAM", "MESSENGER", "WHATSAPP", "TELEGRAM", "EMAIL"];

const PRIORITY_META = [
  {
    key: "EXTREME",
    title: "Extrême urgence",
    icon: <TriangleAlert className="size-4" />,
    accentClassName: "text-rose-700 bg-rose-50 border-rose-200",
    surfaceClassName: "from-rose-50 via-white to-rose-100/70 border-rose-200/80",
  },
  {
    key: "URGENT",
    title: "Urgent",
    icon: <BellRing className="size-4" />,
    accentClassName: "text-amber-700 bg-amber-50 border-amber-200",
    surfaceClassName: "from-amber-50 via-white to-orange-50/70 border-amber-200/80",
  },
  {
    key: "IMPORTANT",
    title: "Important",
    icon: <Sparkles className="size-4" />,
    accentClassName: "text-cyan-700 bg-cyan-50 border-cyan-200",
    surfaceClassName: "from-cyan-50 via-white to-sky-50/70 border-cyan-200/80",
  },
  {
    key: "LOW",
    title: "Non important",
    icon: <Clock3 className="size-4" />,
    accentClassName: "text-slate-600 bg-slate-50 border-slate-200",
    surfaceClassName: "from-slate-50 via-white to-slate-100/70 border-slate-200/80",
  },
] as const;

const DATE_FILTER_OPTIONS: { key: DateFilter; label: string }[] = [
  { key: "ALL", label: "Toutes les dates" },
  { key: "TODAY", label: "Aujourd'hui" },
  { key: "7D", label: "7 derniers jours" },
  { key: "30D", label: "30 derniers jours" },
];

const PRIORITY_FILTER_OPTIONS: { key: PriorityFilter; label: string }[] = [
  { key: "ALL", label: "Tous les niveaux" },
  { key: "EXTREME", label: "Extrême urgence" },
  { key: "URGENT", label: "Urgent" },
  { key: "IMPORTANT", label: "Important" },
  { key: "LOW", label: "Non important" },
];

function getConversationPriority(conversation: Conversation): Exclude<PriorityFilter, "ALL"> {
  if (conversation.priority === "HIGH" && conversation.unreadCount >= 3) {
    return "EXTREME";
  }

  if (conversation.priority === "HIGH") {
    return "URGENT";
  }

  return conversation.unreadCount > 0 ? "IMPORTANT" : "LOW";
}

function matchesDateFilter(dateFilter: DateFilter, date: Date) {
  if (dateFilter === "ALL") {
    return true;
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (dateFilter === "TODAY") {
    return date >= startOfToday;
  }

  const days = dateFilter === "7D" ? 7 : 30;
  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() - days);
  return date >= cutoff;
}

export function MessagingClient({ channels, conversations }: Props) {
  const [showFilters, setShowFilters] = useState(false);
  const [channelFilter, setChannelFilter] = useState<ChannelType | "ALL">("ALL");
  const [dateFilter, setDateFilter] = useState<DateFilter>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("ALL");

  const channelsByType = useMemo(
    () =>
      Object.fromEntries(
        CHANNEL_ORDER.map((channelType) => [channelType, channels.find((item) => item.channel === channelType) ?? null]),
      ) as Record<ChannelType, ChannelSync | null>,
    [channels],
  );

  const filteredConversations = useMemo(() => {
    return conversations.filter((conversation) => {
      if (channelFilter !== "ALL" && conversation.channel !== channelFilter) {
        return false;
      }

      if (!matchesDateFilter(dateFilter, conversation.lastMessageAt)) {
        return false;
      }

      if (priorityFilter !== "ALL" && getConversationPriority(conversation) !== priorityFilter) {
        return false;
      }

      return true;
    });
  }, [channelFilter, conversations, dateFilter, priorityFilter]);

  const groupedConversations = useMemo(
    () =>
      Object.fromEntries(
        CHANNEL_ORDER.map((channelType) => [
          channelType,
          filteredConversations.filter((conversation) => conversation.channel === channelType),
        ]),
      ) as Record<ChannelType, Conversation[]>,
    [filteredConversations],
  );

  const sectionCardClassName =
    "overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_45px_-30px_rgba(8,31,54,0.28)]";
  const sectionHeaderClassName = "border-b border-slate-100 bg-gradient-to-r from-cyan-50/80 via-white to-white pb-4";

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-cyan-800/60 bg-gradient-to-br from-[#081f36] via-[#0d304f] to-[#08192d] p-6 shadow-lg shadow-slate-950/35">
        <div className="max-w-3xl">
          <div className="mb-3 h-1.5 w-10 rounded-full bg-cyan-300" />
          <h1 className="mt-2 text-2xl font-bold text-white">Messagerie</h1>
          <p className="mt-1 text-sm text-cyan-100/80">
            Recevez une notification dès qu&apos;un message arrive sur Facebook ou Instagram, et gérez tout au même
            endroit, sans devoir vérifier chaque application.
          </p>
        </div>
      </div>

      <Card className={sectionCardClassName}>
        <CardHeader className={sectionHeaderClassName}>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-3 h-1 w-10 rounded-full bg-cyan-500/80" />
              <CardTitle className="text-base text-slate-900">Messages reçus</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Retrouvez vos échanges par canal, dans une structure claire prête à accueillir les vraies données.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end">
              <button
                type="button"
                onClick={() => setShowFilters((value) => !value)}
                className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white px-3.5 py-2 text-sm font-medium text-cyan-700 shadow-sm shadow-cyan-100/40 transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50 active:scale-[0.98]"
              >
                <Filter className="size-4" />
                Filtrer
              </button>
              {showFilters && (
                <div className="w-full min-w-[18rem] rounded-3xl border border-cyan-100 bg-white/95 p-4 shadow-[0_18px_38px_-28px_rgba(8,31,54,0.35)] backdrop-blur md:w-[24rem]">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Canaux</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setChannelFilter("ALL")}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                            channelFilter === "ALL"
                              ? "border-cyan-200 bg-cyan-50 text-cyan-700"
                              : "border-slate-200 bg-white text-slate-500 hover:border-cyan-200 hover:text-cyan-700",
                          )}
                        >
                          Tous
                        </button>
                        {CHANNEL_ORDER.map((channelType) => {
                          const meta = CHANNEL_META[channelType];
                          const active = channelFilter === channelType;
                          return (
                            <button
                              key={channelType}
                              type="button"
                              onClick={() => setChannelFilter(channelType)}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                                active
                                  ? meta.chipClassName
                                  : "border-slate-200 bg-white text-slate-500 hover:border-cyan-200 hover:text-cyan-700",
                              )}
                            >
                              {meta.icon}
                              {meta.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Dates</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {DATE_FILTER_OPTIONS.map((option) => (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => setDateFilter(option.key)}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                              dateFilter === option.key
                                ? "border-cyan-200 bg-cyan-50 text-cyan-700"
                                : "border-slate-200 bg-white text-slate-500 hover:border-cyan-200 hover:text-cyan-700",
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Urgence</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {PRIORITY_FILTER_OPTIONS.map((option) => (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => setPriorityFilter(option.key)}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                              priorityFilter === option.key
                                ? "border-cyan-200 bg-cyan-50 text-cyan-700"
                                : "border-slate-200 bg-white text-slate-500 hover:border-cyan-200 hover:text-cyan-700",
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {CHANNEL_ORDER.map((channelType) => {
              const meta = CHANNEL_META[channelType];
              const channelConversations = groupedConversations[channelType];

              return (
                <div
                  key={channelType}
                  className={cn(
                    "rounded-[24px] border bg-gradient-to-br p-4 shadow-[0_14px_34px_-28px_rgba(8,31,54,0.45)]",
                    meta.cardClassName,
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold",
                        meta.chipClassName,
                      )}
                    >
                      {meta.icon}
                      {meta.label}
                    </span>
                    <span className="text-xs text-slate-400">{channelConversations.length} conversation(s)</span>
                  </div>

                  {channelConversations.length === 0 ? (
                    <div className="mt-4 rounded-[20px] border border-dashed border-white/70 bg-white/75 px-4 py-8 text-center">
                      <div
                        className={cn(
                          "mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border shadow-sm",
                          meta.emptyIconClassName,
                        )}
                      >
                        {meta.icon}
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-700">Aucun message pour {meta.label}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Cet encart est prêt à afficher les messages reçus dès qu&apos;ils seront réellement synchronisés.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {channelConversations.map((conversation) => (
                        <div
                          key={conversation.id}
                          className="rounded-[20px] border border-white/80 bg-white/90 px-4 py-3 shadow-[0_14px_28px_-24px_rgba(8,31,54,0.4)]"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-sm font-semibold text-slate-900">{conversation.contactName}</p>
                            {conversation.unreadCount > 0 && (
                              <Badge variant="info" className="border border-cyan-100 bg-cyan-50 text-cyan-700">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 truncate text-xs text-slate-500">{conversation.contactHandle}</p>
                          <p className="mt-2 truncate text-sm text-slate-600">{conversation.lastMessagePreview}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className={sectionCardClassName}>
        <CardHeader className={sectionHeaderClassName}>
          <div className="mb-3 h-1 w-10 rounded-full bg-cyan-500/80" />
          <CardTitle className="flex items-center gap-2 text-base text-slate-900">
            <Bot className="size-4 text-cyan-700" />
            Pilotage IA
          </CardTitle>
          <p className="text-sm text-slate-500">L&apos;IA classe vos messages selon leur importance.</p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {PRIORITY_META.map((priority) => (
              <div
                key={priority.key}
                className={cn(
                  "rounded-[24px] border bg-gradient-to-br p-4 shadow-[0_14px_34px_-28px_rgba(8,31,54,0.45)]",
                  priority.surfaceClassName,
                )}
              >
                <div
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold",
                    priority.accentClassName,
                  )}
                >
                  {priority.icon}
                  {priority.title}
                </div>
                <div className="mt-4 rounded-[20px] border border-white/80 bg-white/85 px-4 py-8 text-center">
                  <p className="text-sm font-semibold text-slate-700">Aucune donnée classée pour le moment</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Cette zone affichera les messages identifiés comme {priority.title.toLowerCase()} dès que la
                    classification IA sera alimentée.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className={sectionCardClassName}>
        <CardHeader className={sectionHeaderClassName}>
          <div className="mb-3 h-1 w-10 rounded-full bg-cyan-500/80" />
          <CardTitle className="flex items-center gap-2 text-base text-slate-900">
            <RefreshCw className="size-4 text-cyan-700" />
            État de synchronisation
          </CardTitle>
          <p className="text-sm text-slate-500">
            Suivez vos canaux connectés dans une vue unifiée, même lorsqu&apos;aucune donnée réelle n&apos;est encore remontée.
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {CHANNEL_ORDER.map((channelType) => {
              const meta = CHANNEL_META[channelType];
              const channel = channelsByType[channelType];
              const healthy = channel?.connected && !channel.issue;

              return (
                <div
                  key={channelType}
                  className={cn(
                    "rounded-[24px] border bg-gradient-to-br p-4 shadow-[0_14px_34px_-28px_rgba(8,31,54,0.45)]",
                    meta.cardClassName,
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold",
                        meta.chipClassName,
                      )}
                    >
                      {meta.icon}
                      {meta.label}
                    </span>
                    {channel ? (
                      healthy ? (
                        <CheckCircle2 className="size-4 text-emerald-500" />
                      ) : (
                        <TriangleAlert className="size-4 text-amber-500" />
                      )
                    ) : (
                      <Clock3 className="size-4 text-slate-400" />
                    )}
                  </div>

                  <div className="mt-4 rounded-[20px] border border-white/80 bg-white/85 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Dernière synchronisation
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      {channel ? channel.lastSyncAt.toLocaleString("fr-FR") : "Aucune donnée"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {channel
                        ? `Latence actuelle : ${channel.latencySec}s`
                        : "Ce canal apparaîtra ici dès qu'il sera relié à une vraie synchronisation."}
                    </p>
                    {channel?.issue && <p className="mt-2 text-xs text-amber-600">{channel.issue}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
