"use client";

import { useState } from "react";
import Link from "next/link";
import { formatEventDate, EVENT_CATEGORY_LABELS, CHANNEL_LABELS, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AIAssistantPanel } from "./ai-assistant-panel";
import {
  Calendar, FileText, Send, Zap, Plus, ArrowRight,
  AlertCircle, Sparkles, Bot, ImageIcon
} from "lucide-react";

interface Props {
  userName: string;
  community: {
    name: string;
    tone: string;
    hashtags: string[];
    channels: Array<{ type: string; isConnected: boolean }>;
    plan: string;
  };
  upcomingEvents: Array<{
    id: string; title: string; startDate: Date; category: string; status: string;
  }>;
  pendingPublications: Array<{
    id: string; status: string; scheduledAt: Date | null; channelType: string;
    content: string; channel: { type: string; name: string };
    event: { title: string } | null;
  }>;
  recentDrafts: Array<{
    id: string; title: string | null; body: string; status: string;
    contentType: string; updatedAt: Date;
    event: { title: string; category: string } | null;
  }>;
  stats: { events: number; published: number; drafts: number; automations: number };
  notifications: Array<{ id: string; title: string; body: string; type: string; createdAt: Date }>;
}

const STAT_CARDS = (stats: Props["stats"]) => [
  {
    label: "Événements",
    value: stats.events,
    icon: Calendar,
    color: "text-blue-600 bg-blue-50",
    link: "/dashboard/events",
  },
  {
    label: "Publications",
    value: stats.published,
    icon: Send,
    color: "text-emerald-600 bg-emerald-50",
    link: "/dashboard/publications",
  },
  {
    label: "Brouillons",
    value: stats.drafts,
    icon: FileText,
    color: "text-amber-600 bg-amber-50",
    link: "/dashboard/content",
  },
  {
    label: "Automatisations",
    value: stats.automations,
    icon: Zap,
    color: "text-purple-600 bg-purple-50",
    link: "/dashboard/automations",
  },
];

const STATUS_BADGE_MAP: Record<string, { variant: "draft" | "ready" | "scheduled" | "published" | "failed"; label: string }> = {
  PENDING: { variant: "draft", label: "En attente" },
  SCHEDULED: { variant: "scheduled", label: "Programmé" },
  FAILED: { variant: "failed", label: "Échec" },
  PUBLISHED: { variant: "published", label: "Publié" },
};

export function DashboardClient({
  userName,
  community,
  upcomingEvents,
  pendingPublications,
  recentDrafts,
  stats,
}: Props) {
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  const failedPublications = pendingPublications.filter((p) => p.status === "FAILED");
  const connectedChannels = (community.channels ?? []).filter((c) => c.isConnected).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            {greeting()}, {userName.split(" ")[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            {community.name} · {connectedChannels} canal{connectedChannels !== 1 ? "x" : ""} connecté{connectedChannels !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAiPanelOpen(true)}
            className="w-full justify-center sm:w-auto"
          >
            <Sparkles className="size-4 text-amber-500" />
            Assistant IA
          </Button>
          <Link href="/dashboard/events/new">
            <Button size="sm" className="w-full sm:w-auto">
              <Plus className="size-4" />
              Nouvel événement
            </Button>
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
        <p className="text-sm text-slate-100">
          Retrouvez vos publications, événements et rappels en un seul endroit.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/content/new"><Button variant="outline" className="w-full justify-start"><Plus className="size-4" />Créer une publication</Button></Link>
        <Link href="/dashboard/events"><Button variant="outline" className="w-full justify-start"><Calendar className="size-4" />Voir mon agenda</Button></Link>
        <Link href="/dashboard/templates"><Button variant="outline" className="w-full justify-start"><ImageIcon className="size-4" />Choisir une affiche</Button></Link>
        <Link href="/dashboard/assistant"><Button variant="outline" className="w-full justify-start"><Bot className="size-4" />Nouvelle conversation IA</Button></Link>
      </div>

      {/* Alertes */}
      {failedPublications.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex flex-col gap-3 sm:flex-row sm:items-start">
          <AlertCircle className="size-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">
              {failedPublications.length} publication{failedPublications.length > 1 ? "s" : ""} en échec
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              Des publications n&apos;ont pas pu être envoyées. Consultez l&apos;historique pour plus de détails.
            </p>
          </div>
          <Link href="/dashboard/publications?status=FAILED">
            <Button variant="destructive" size="sm" className="w-full sm:w-auto">Voir</Button>
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {STAT_CARDS(stats).map((card) => (
          <Link key={card.label} href={card.link}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{card.label}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">{card.value}</p>
                  </div>
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", card.color)}>
                    <card.icon className="size-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Grille principale */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Prochains événements */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="size-4 text-blue-600" />
                  Événements à venir
                </CardTitle>
                <Link href="/dashboard/events" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  Voir tout <ArrowRight className="size-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcomingEvents.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  text="Aucun événement prévu cette semaine"
                  action={{ label: "Créer un événement", href: "/dashboard/events/new" }}
                />
              ) : (
                upcomingEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/dashboard/events/${event.id}`}
                    className="flex items-start gap-3 rounded-xl p-3 hover:bg-slate-50 transition-colors group sm:items-center sm:gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-blue-700">
                      {new Date(event.startDate).getDate()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-blue-700">
                        {event.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatEventDate(event.startDate)}
                      </p>
                    </div>
                    <Badge variant="info" className="mt-0.5 flex-shrink-0 text-[11px] sm:mt-0">
                      {EVENT_CATEGORY_LABELS[event.category] ?? event.category}
                    </Badge>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {/* Publications en attente */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Send className="size-4 text-emerald-600" />
                  Publications à valider
                </CardTitle>
                <Link href="/dashboard/publications" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  Gérer <ArrowRight className="size-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingPublications.length === 0 ? (
                <EmptyState
                  icon={Send}
                  text="Aucune publication en attente"
                  action={{ label: "Créer un contenu", href: "/dashboard/content/new" }}
                />
              ) : (
                pendingPublications.slice(0, 5).map((pub) => {
                  const statusInfo = STATUS_BADGE_MAP[pub.status] ?? { variant: "draft" as const, label: pub.status };
                  return (
                    <div
                      key={pub.id}
                      className="flex items-start gap-3 rounded-xl p-3 hover:bg-slate-50 transition-colors sm:items-center"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-sm">
                        {pub.channelType === "INSTAGRAM" ? "📸" :
                         pub.channelType === "FACEBOOK" ? "👥" :
                         pub.channelType === "WHATSAPP" ? "💬" :
                         pub.channelType === "TELEGRAM" ? "✈️" :
                         pub.channelType === "EMAIL" ? "📧" : "📢"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">
                          {pub.event?.title ?? pub.content.substring(0, 40) + "…"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {CHANNEL_LABELS[pub.channelType]} ·{" "}
                          {pub.scheduledAt
                            ? formatEventDate(pub.scheduledAt)
                            : "Non programmé"}
                        </p>
                      </div>
                      <Badge variant={statusInfo.variant} className="mt-0.5 text-[11px] flex-shrink-0 sm:mt-0">
                        {statusInfo.label}
                      </Badge>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Colonne droite (1/3) */}
        <div className="space-y-6">
          {/* Assistant IA — carte compacte */}
          <Card className="bg-gradient-to-br from-blue-900 to-blue-800 border-blue-700">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Bot className="size-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Assistant Shalom IA</p>
                  <p className="text-xs text-blue-300">Propulsé par Claude</p>
                </div>
              </div>
              <p className="text-xs text-blue-200 leading-relaxed">
                Demandez-moi de générer un post pour Chabbat, de rédiger une annonce,
                de planifier vos publications…
              </p>
              <Button
                variant="gold"
                size="sm"
                className="w-full"
                onClick={() => setAiPanelOpen(true)}
              >
                <Sparkles className="size-4" />
                Ouvrir l&apos;assistant
              </Button>
            </CardContent>
          </Card>

          {/* Brouillons récents */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4 text-amber-600" />
                Rappels du quotidien
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentDrafts.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-3">Aucun brouillon</p>
              ) : (
                recentDrafts.map((draft) => (
                  <Link
                    key={draft.id}
                    href={`/dashboard/content/${draft.id}`}
                    className="block rounded-xl p-3 hover:bg-slate-50 transition-colors group"
                  >
                    <p className="text-sm font-medium text-slate-700 line-clamp-1 group-hover:text-blue-700">
                      {draft.title ?? draft.body.substring(0, 50)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={
                        draft.status === "AI_PROPOSAL" ? "info" :
                        draft.status === "READY_TO_PUBLISH" ? "ready" : "draft"
                      } className="text-[11px]">
                        {draft.status === "AI_PROPOSAL" ? "Proposition IA" :
                         draft.status === "READY_TO_PUBLISH" ? "Prêt" : "Brouillon"}
                      </Badge>
                      <span className="text-xs text-slate-400">
                        {draft.event?.title ?? "Sans événement"}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {/* Actions rapides */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 sm:gap-3">
              {[
                { label: "Nouveau post", href: "/dashboard/content/new", emoji: "✍️" },
                { label: "Horaires Chabbat", href: "/dashboard/content/new?type=SHABBAT_TIMES", emoji: "🕯️" },
                { label: "Calendrier", href: "/dashboard/events/calendar", emoji: "📅" },
                { label: "Affiches", href: "/dashboard/templates", emoji: "🎨" },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 p-3 hover:border-blue-300 hover:bg-blue-50 transition-all text-center"
                >
                  <span className="text-xl">{action.emoji}</span>
                  <span className="text-xs font-medium text-slate-600">{action.label}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Panel Assistant IA (drawer) */}
      {aiPanelOpen && (
        <AIAssistantPanel
          communityName={community.name}
          tone={community.tone}
          onClose={() => setAiPanelOpen(false)}
        />
      )}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  text,
  action,
}: {
  icon: React.ElementType;
  text: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
        <Icon className="size-5 text-slate-400" />
      </div>
      <p className="text-sm text-slate-400">{text}</p>
      {action && (
        <Link href={action.href}>
          <Button variant="outline" size="sm">
            <Plus className="size-3.5" />
            {action.label}
          </Button>
        </Link>
      )}
    </div>
  );
}
