"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Bot,
  Camera,
  CheckCircle2,
  Clock3,
  Mail,
  MessageCircle,
  Send,
  Settings2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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

type ChannelButton = {
  type: string;
  label: string;
  shortLabel: string;
  connectedAction: string;
  disconnectedAction: string;
  connectedHref: string;
  disconnectedHref: string;
  icon: LucideIcon;
  colorClass: string;
};

const CHANNEL_BUTTONS: ChannelButton[] = [
  {
    type: "INSTAGRAM",
    label: "Instagram",
    shortLabel: "Insta",
    connectedAction: "Publier",
    disconnectedAction: "Connecter",
    connectedHref: "/dashboard/instagram",
    disconnectedHref: "/dashboard/settings/channels",
    icon: Camera,
    colorClass: "text-pink-600",
  },
  {
    type: "FACEBOOK",
    label: "Facebook",
    shortLabel: "Face.",
    connectedAction: "Publier",
    disconnectedAction: "Connecter",
    connectedHref: "/dashboard/facebook",
    disconnectedHref: "/dashboard/settings/channels",
    icon: Users,
    colorClass: "text-blue-600",
  },
  {
    type: "WHATSAPP",
    label: "WhatsApp",
    shortLabel: "WhatsApp",
    connectedAction: "Messages",
    disconnectedAction: "QR / code",
    connectedHref: "/dashboard/whatsapp",
    disconnectedHref: "/dashboard/whatsapp",
    icon: MessageCircle,
    colorClass: "text-emerald-600",
  },
  {
    type: "TELEGRAM",
    label: "Telegram",
    shortLabel: "Telegram",
    connectedAction: "Publier",
    disconnectedAction: "Bot token",
    connectedHref: "/dashboard/publish/telegram",
    disconnectedHref: "/dashboard/settings/channels",
    icon: Send,
    colorClass: "text-sky-600",
  },
  {
    type: "EMAIL",
    label: "Gmail IA",
    shortLabel: "Email",
    connectedAction: "Gerer",
    disconnectedAction: "Connecter",
    connectedHref: "/dashboard/email",
    disconnectedHref: "/dashboard/email",
    icon: Mail,
    colorClass: "text-red-500",
  },
];

export function DashboardClient({
  userName,
  community,
  upcomingEvents,
  pendingPublications,
  stats,
  notifications,
}: Props) {
  const firstName = userName.split(" ")[0] || "à vous";
  const connectedTypes = new Set((community.channels ?? []).filter((channel) => channel.isConnected).map((channel) => channel.type));
  const connectedCount = CHANNEL_BUTTONS.filter((channel) => connectedTypes.has(channel.type)).length;
  const reviewCount = pendingPublications.length;
  const failedCount = pendingPublications.filter((publication) => publication.status === "FAILED").length;
  const nextEvent = upcomingEvents[0];

  return (
    <div className="mx-auto min-w-0 max-w-5xl space-y-5 bg-white pb-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-500">EasyCom AI</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Bienvenue, {firstName}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Votre espace centralise vos connexions, validations et alertes importantes.
            </p>
          </div>

          <Button asChild className="h-11 rounded-2xl bg-slate-950 px-5 text-white hover:bg-slate-800">
            <Link href="/dashboard/assistant">
              <Bot className="size-4" />
              Ouvrir l&apos;assistant IA
            </Link>
          </Button>
        </div>
      </section>

      {failedCount > 0 && (
        <Link
          href="/dashboard/publications?status=FAILED"
          className="flex items-start gap-3 rounded-3xl border border-red-100 bg-red-50 p-4 text-red-800 transition hover:border-red-200 hover:bg-red-100/70"
        >
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-500" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">
              {failedCount} publication{failedCount > 1 ? "s" : ""} en erreur
            </span>
            <span className="mt-0.5 block text-xs text-red-600">Cliquez pour vérifier et relancer.</span>
          </span>
          <ArrowRight className="size-4 shrink-0" />
        </Link>
      )}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(220px,0.8fr)_minmax(220px,0.8fr)]">
        <Card className="rounded-[2rem] border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-950">Connexions</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {connectedCount}/5 comptes connectés
                </p>
              </div>
              <Link
                href="/dashboard/settings/channels"
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <Settings2 className="size-3.5" />
                Gérer
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {CHANNEL_BUTTONS.map((channel) => {
                const isConnected = connectedTypes.has(channel.type);
                const href = isConnected ? channel.connectedHref : channel.disconnectedHref;
                const Icon = channel.icon;

                return (
                  <Link
                    key={channel.type}
                    href={href}
                    className={cn(
                      "group flex min-h-[96px] flex-col justify-between rounded-2xl border p-3 text-left transition hover:-translate-y-0.5",
                      isConnected
                        ? "border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-300"
                        : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-white"
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className={cn("flex size-9 items-center justify-center rounded-xl bg-white shadow-sm", isConnected ? channel.colorClass : "text-slate-400")}>
                        <Icon className="size-4" />
                      </span>
                      <span className={cn("size-2.5 rounded-full", isConnected ? "bg-emerald-500" : "bg-slate-300")} />
                    </span>
                    <span>
                      <span className="block truncate text-sm font-bold">{channel.shortLabel}</span>
                      <span className={cn("mt-0.5 block text-[11px] font-semibold", isConnected ? "text-emerald-700" : "text-slate-400")}>
                        {isConnected ? channel.connectedAction : channel.disconnectedAction}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <StatusCard
          title="À vérifier"
          value={reviewCount}
          description={reviewCount > 0 ? "Publications à valider ou suivre." : "Rien en attente."}
          href="/dashboard/publications"
          icon={Clock3}
          tone={reviewCount > 0 ? "amber" : "slate"}
        />

        <StatusCard
          title="Notifications"
          value={notifications.length}
          description={notifications.length > 0 ? "Alertes non lues." : "Tout est à jour."}
          href="/dashboard/notifications"
          icon={Bell}
          tone={notifications.length > 0 ? "blue" : "slate"}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <MiniPanel
          title="Assistant IA"
          description="Créer un message, préparer une publication ou demander une action."
          href="/dashboard/assistant"
          icon={Bot}
        />
        <MiniPanel
          title="Agenda connecté IA"
          description={nextEvent ? `Prochain élément : ${nextEvent.title}` : "Ajouter ou vérifier les prochains événements."}
          href="/dashboard/events"
          icon={CheckCircle2}
        />
        <MiniPanel
          title="Automatisations"
          description={`${stats.automations} automatisation${stats.automations > 1 ? "s" : ""} active${stats.automations > 1 ? "s" : ""}.`}
          href="/dashboard/automations"
          icon={Settings2}
        />
      </section>
    </div>
  );
}

function StatusCard({
  title,
  value,
  description,
  href,
  icon: Icon,
  tone,
}: {
  title: string;
  value: number;
  description: string;
  href: string;
  icon: LucideIcon;
  tone: "amber" | "blue" | "slate";
}) {
  const toneClass = {
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    slate: "border-slate-200 bg-slate-50 text-slate-500",
  }[tone];

  return (
    <Link href={href} className="group min-w-0">
      <Card className="h-full rounded-[2rem] border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300">
        <CardContent className="flex h-full flex-col justify-between p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-950">{title}</p>
              <p className="mt-2 text-4xl font-bold tracking-tight text-slate-950">{value}</p>
            </div>
            <span className={cn("flex size-10 items-center justify-center rounded-2xl border", toneClass)}>
              <Icon className="size-4" />
            </span>
          </div>
          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-xs leading-5 text-slate-500">{description}</p>
            <ArrowRight className="size-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function MiniPanel({
  title,
  description,
  href,
  icon: Icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}) {
  return (
    <Link href={href} className="group min-w-0">
      <div className="flex h-full items-start gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-slate-950">{title}</span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
        </span>
        <ArrowRight className="mt-1 size-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500" />
      </div>
    </Link>
  );
}
