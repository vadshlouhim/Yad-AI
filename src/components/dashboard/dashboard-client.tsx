"use client";

import { useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Bot,
  Calendar,
  CheckCircle2,
  Clock3,
  FileText,
  ImageIcon,
  LayoutDashboard,
  Megaphone,
  Plus,
  Send,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";
import { formatEventDate, EVENT_CATEGORY_LABELS, CHANNEL_LABELS, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AIAssistantPanel } from "./ai-assistant-panel";

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
    label: "Evenements",
    value: stats.events,
    helper: "A piloter",
    icon: Calendar,
    link: "/dashboard/events",
    accent: "from-sky-500 to-blue-600",
    soft: "bg-sky-50 text-sky-700",
  },
  {
    label: "Publications",
    value: stats.published,
    helper: "Publiees",
    icon: Send,
    link: "/dashboard/publications",
    accent: "from-emerald-500 to-teal-600",
    soft: "bg-emerald-50 text-emerald-700",
  },
  {
    label: "Brouillons",
    value: stats.drafts,
    helper: "A transformer",
    icon: FileText,
    link: "/dashboard/assistant",
    accent: "from-amber-400 to-orange-500",
    soft: "bg-amber-50 text-amber-700",
  },
  {
    label: "Automatisations",
    value: stats.automations,
    helper: "Actives",
    icon: Zap,
    link: "/dashboard/automations",
    accent: "from-indigo-500 to-blue-700",
    soft: "bg-indigo-50 text-indigo-700",
  },
];

const STATUS_BADGE_MAP: Record<string, { variant: "draft" | "ready" | "scheduled" | "published" | "failed"; label: string }> = {
  PENDING: { variant: "draft", label: "En attente" },
  SCHEDULED: { variant: "scheduled", label: "Programme" },
  FAILED: { variant: "failed", label: "Echec" },
  PUBLISHED: { variant: "published", label: "Publie" },
};

const QUICK_ACTIONS = [
  {
    label: "Creer une publication",
    description: "Post, annonce ou rappel",
    href: "/dashboard/assistant",
    icon: Plus,
    color: "from-blue-500 to-cyan-500",
  },
  {
    label: "Voir mon agenda",
    description: "Evenements et planning",
    href: "/dashboard/events",
    icon: Calendar,
    color: "from-emerald-500 to-teal-500",
  },
  {
    label: "Choisir une affiche",
    description: "Templates prets a publier",
    href: "/dashboard/templates",
    icon: ImageIcon,
    color: "from-orange-400 to-amber-500",
  },
  {
    label: "Conversation IA",
    description: "Idees, textes, relances",
    href: "/dashboard/assistant",
    icon: Bot,
    color: "from-indigo-500 to-blue-600",
  },
];

const MINI_ACTIONS = [
  { label: "Nouveau post", href: "/dashboard/assistant", icon: Wand2 },
  { label: "Horaires Chabbat", href: "/dashboard/shabbat-times-auto", icon: Sparkles },
  { label: "Calendrier", href: "/dashboard/events/calendar", icon: Calendar },
  { label: "Affiches", href: "/dashboard/templates", icon: ImageIcon },
];

export function DashboardClient({
  userName,
  community,
  upcomingEvents,
  pendingPublications,
  recentDrafts,
  stats,
  notifications,
}: Props) {
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 18) return "Bon apres-midi";
    return "Bonsoir";
  };

  const firstName = userName.split(" ")[0] || "vous";
  const failedPublications = pendingPublications.filter((p) => p.status === "FAILED");
  const connectedChannels = (community.channels ?? []).filter((c) => c.isConnected).length;
  const totalChannels = community.channels?.length ?? 0;
  const waitingPublications = pendingPublications.filter((p) => p.status !== "FAILED").length;
  const unreadNotifications = notifications.length;

  return (
    <div className="min-w-0 space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-blue-100 bg-slate-950 px-5 py-6 shadow-xl shadow-blue-950/10 sm:px-7 lg:px-8">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/25 blur-3xl" />
        <div className="absolute -bottom-28 left-16 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(37,99,235,0.35),transparent_42%,rgba(20,184,166,0.20))]" />

        <div className="relative grid gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-blue-50 backdrop-blur">
              <LayoutDashboard className="size-3.5 text-cyan-200" />
              Centre de pilotage EasyCom AI
            </div>

            <div className="space-y-3">
              <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {greeting()}, {firstName}. Votre communication est prete a avancer.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
                Retrouvez vos evenements, publications, rappels et contenus IA dans un tableau de bord clair, coherent et actionnable.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <HeroMetric
                icon={CheckCircle2}
                label="Canaux connectes"
                value={`${connectedChannels}/${Math.max(totalChannels, connectedChannels) || 1}`}
              />
              <HeroMetric icon={Clock3} label="A valider" value={waitingPublications} />
              <HeroMetric icon={Bell} label="Notifications" value={unreadNotifications} />
            </div>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/10 p-4 text-white backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-cyan-100">Communauté</p>
                <p className="mt-2 text-xl font-semibold">{community.name}</p>
              </div>
              <Badge className="border-white/20 bg-white/15 text-white">
                {community.plan}
              </Badge>
            </div>

            <div className="mt-5 rounded-2xl bg-white/10 p-4">
              <p className="text-xs font-medium text-cyan-100">Ton editorial</p>
              <p className="mt-1 text-sm text-white/90">{community.tone || "A personnaliser"}</p>
              {(community.hashtags ?? []).length > 0 && (
                <p className="mt-3 line-clamp-2 text-xs text-blue-100">
                  {(community.hashtags ?? []).slice(0, 5).join(" ")}
                </p>
              )}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Button
                variant="gold"
                size="sm"
                className="w-full rounded-xl"
                onClick={() => setAiPanelOpen(true)}
              >
                <Sparkles className="size-4" />
                Assistant IA
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full rounded-xl border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                <Link href="/dashboard/events/new">
                  <Plus className="size-4" />
                  Nouvel event
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {failedPublications.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm sm:flex-row sm:items-start">
          <div className="rounded-xl bg-white p-2 text-red-500 shadow-sm">
            <AlertCircle className="size-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">
              {failedPublications.length} publication{failedPublications.length > 1 ? "s" : ""} en echec
            </p>
            <p className="mt-0.5 text-xs text-red-600">
              Des publications n&apos;ont pas pu etre envoyees. Consultez l&apos;historique pour les relancer.
            </p>
          </div>
          <Button asChild variant="destructive" size="sm" className="w-full sm:w-auto">
            <Link href="/dashboard/publications?status=FAILED">Voir</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_ACTIONS.map((action) => (
          <QuickActionCard key={action.label} {...action} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {STAT_CARDS(stats).map((card) => (
          <Link key={card.label} href={card.link} className="group min-w-0">
            <Card className="h-full overflow-hidden rounded-3xl border-slate-200/80 bg-white/90 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-950/10">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{card.label}</p>
                    <p className="mt-2 text-3xl font-bold text-slate-950 sm:text-4xl">{card.value}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">{card.helper}</p>
                  </div>
                  <div className={cn("flex size-11 items-center justify-center rounded-2xl", card.soft)}>
                    <card.icon className="size-5" />
                  </div>
                </div>
                <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className={cn("h-full w-2/3 rounded-full bg-gradient-to-r transition-all group-hover:w-full", card.accent)} />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
        <div className="min-w-0 space-y-6">
          <DashboardSection
            title="Evenements a venir"
            icon={Calendar}
            iconClassName="bg-blue-50 text-blue-700"
            href="/dashboard/events"
            cta="Voir tout"
          >
            {upcomingEvents.length === 0 ? (
              <EmptyState
                icon={Calendar}
                text="Aucun evenement prevu cette semaine"
                action={{ label: "Creer un evenement", href: "/dashboard/events/new" }}
              />
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/dashboard/assistant?eventId=${event.id}`}
                    className="group flex items-start gap-3 rounded-2xl border border-transparent p-3 transition-all hover:border-blue-100 hover:bg-blue-50/60 sm:items-center sm:gap-4"
                  >
                    <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-sm shadow-blue-500/20">
                      <span className="text-base font-bold leading-none">{new Date(event.startDate).getDate()}</span>
                      <span className="mt-0.5 text-[9px] uppercase tracking-wide opacity-80">Jour</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800 group-hover:text-blue-700">
                        {event.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">{formatEventDate(event.startDate)}</p>
                    </div>
                    <Badge variant="info" className="mt-0.5 shrink-0 text-[11px] sm:mt-0">
                      {EVENT_CATEGORY_LABELS[event.category] ?? event.category}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </DashboardSection>

          <DashboardSection
            title="Publications a valider"
            icon={Megaphone}
            iconClassName="bg-emerald-50 text-emerald-700"
            href="/dashboard/publications"
            cta="Gerer"
          >
            {pendingPublications.length === 0 ? (
              <EmptyState
                icon={Send}
                text="Aucune publication en attente"
                action={{ label: "Creer un contenu", href: "/dashboard/assistant" }}
              />
            ) : (
              <div className="space-y-2">
                {pendingPublications.slice(0, 5).map((pub) => {
                  const statusInfo = STATUS_BADGE_MAP[pub.status] ?? { variant: "draft" as const, label: pub.status };
                  return (
                    <div
                      key={pub.id}
                      className="flex items-start gap-3 rounded-2xl border border-transparent p-3 transition-all hover:border-emerald-100 hover:bg-emerald-50/50 sm:items-center"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-xs font-bold text-white">
                        {getChannelInitial(pub.channelType)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {pub.event?.title ?? `${pub.content.substring(0, 44)}...`}
                        </p>
                        <p className="text-xs text-slate-500">
                          {CHANNEL_LABELS[pub.channelType] ?? pub.channelType} ·{" "}
                          {pub.scheduledAt ? formatEventDate(pub.scheduledAt) : "Non programme"}
                        </p>
                      </div>
                      <Badge variant={statusInfo.variant} className="mt-0.5 shrink-0 text-[11px] sm:mt-0">
                        {statusInfo.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </DashboardSection>
        </div>

        <aside className="min-w-0 space-y-6">
          <Card className="overflow-hidden rounded-3xl border-blue-100 bg-gradient-to-br from-blue-700 via-blue-800 to-slate-950 text-white shadow-xl shadow-blue-950/15">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-white/15">
                  <Bot className="size-6 text-cyan-100" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Assistant EasyCom IA</p>
                  <p className="text-xs text-blue-200">Votre copilote communication</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-blue-100">
                Generez un post, transformez un evenement en campagne ou preparez une relance en quelques secondes.
              </p>
              <Button
                variant="gold"
                size="sm"
                className="mt-5 w-full rounded-xl"
                onClick={() => setAiPanelOpen(true)}
              >
                <Sparkles className="size-4" />
                Ouvrir l&apos;assistant
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200/80">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex size-9 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                  <FileText className="size-4" />
                </span>
                Rappels du quotidien
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentDrafts.length === 0 ? (
                <EmptyState icon={FileText} text="Aucun brouillon pour le moment" />
              ) : (
                recentDrafts.map((draft) => (
                  <Link
                    key={draft.id}
                    href={`/dashboard/content/${draft.id}`}
                    className="block rounded-2xl border border-transparent p-3 transition-all hover:border-amber-100 hover:bg-amber-50/60"
                  >
                    <p className="line-clamp-1 text-sm font-semibold text-slate-800">
                      {draft.title ?? draft.body.substring(0, 50)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant={
                        draft.status === "AI_PROPOSAL" ? "info" :
                        draft.status === "READY_TO_PUBLISH" ? "ready" : "draft"
                      } className="text-[11px]">
                        {draft.status === "AI_PROPOSAL" ? "Proposition IA" :
                         draft.status === "READY_TO_PUBLISH" ? "Pret" : "Brouillon"}
                      </Badge>
                      <span className="min-w-0 truncate text-xs text-slate-500">
                        {draft.event?.title ?? "Sans evenement"}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 sm:gap-3">
              {MINI_ACTIONS.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 p-3 text-center transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50"
                >
                  <span className="flex size-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <action.icon className="size-4" />
                  </span>
                  <span className="text-xs font-semibold text-slate-700">{action.label}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>

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

function HeroMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-3 text-white backdrop-blur">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-cyan-100" />
        <span className="text-xs text-blue-100">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function QuickActionCard({
  label,
  description,
  href,
  icon: Icon,
  color,
}: {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  color: string;
}) {
  return (
    <Link href={href} className="group min-w-0">
      <Card className="h-full overflow-hidden rounded-3xl border-slate-200/80 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-950/10">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-sm", color)}>
              <Icon className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{label}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
            </div>
            <ArrowRight className="mt-1 size-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-500" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function DashboardSection({
  title,
  icon: Icon,
  iconClassName,
  href,
  cta,
  children,
}: {
  title: string;
  icon: LucideIcon;
  iconClassName: string;
  href: string;
  cta: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-3xl border-slate-200/80">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className={cn("flex size-9 items-center justify-center rounded-2xl", iconClassName)}>
              <Icon className="size-4" />
            </span>
            {title}
          </CardTitle>
          <Link href={href} className="flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700">
            {cta}
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptyState({
  icon: Icon,
  text,
  action,
}: {
  icon: LucideIcon;
  text: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center">
      <div className="flex size-11 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
        <Icon className="size-5" />
      </div>
      <p className="text-sm text-slate-500">{text}</p>
      {action && (
        <Button asChild variant="outline" size="sm" className="rounded-xl">
          <Link href={action.href}>
            <Plus className="size-3.5" />
            {action.label}
          </Link>
        </Button>
      )}
    </div>
  );
}

function getChannelInitial(channelType: string) {
  const labels: Record<string, string> = {
    INSTAGRAM: "IG",
    FACEBOOK: "FB",
    WHATSAPP: "WA",
    TELEGRAM: "TG",
    EMAIL: "@",
  };

  return labels[channelType] ?? channelType.slice(0, 2).toUpperCase();
}
