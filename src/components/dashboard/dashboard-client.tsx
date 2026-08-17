"use client";

import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock3,
  Settings2,
  Waves,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  EmailIcon,
  FacebookIcon,
  InstagramIcon,
  TelegramIcon,
  WhatsAppIcon,
} from "@/components/layout/dashboard-nav";
import { getCommunityProfileLabel } from "@/lib/community/profile-labels";
import { MobileDashboardHome } from "@/components/dashboard/mobile-dashboard-home";

interface Props {
  basePath?: "/dashboard" | "/demo";
  userName: string;
  userAvatar?: string | null;
  community: {
    name: string;
    logoUrl?: string | null;
    tone: string;
    hashtags: string[];
    channels: Array<{ type: string; isConnected: boolean }>;
    plan: string;
    communityType?: string | null;
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
  icon: ComponentType<SVGProps<SVGSVGElement>>;
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
    icon: InstagramIcon,
  },
  {
    type: "FACEBOOK",
    label: "Facebook",
    shortLabel: "Face.",
    connectedAction: "Publier",
    disconnectedAction: "Connecter",
    connectedHref: "/dashboard/facebook",
    disconnectedHref: "/dashboard/settings/channels",
    icon: FacebookIcon,
  },
  {
    type: "WHATSAPP",
    label: "WhatsApp",
    shortLabel: "WhatsApp",
    connectedAction: "Messages",
    disconnectedAction: "QR / code",
    connectedHref: "/dashboard/whatsapp",
    disconnectedHref: "/dashboard/whatsapp",
    icon: WhatsAppIcon,
  },
  {
    type: "TELEGRAM",
    label: "Telegram",
    shortLabel: "Telegram",
    connectedAction: "Publier",
    disconnectedAction: "Bot token",
    connectedHref: "/dashboard/publish/telegram",
    disconnectedHref: "/dashboard/settings/channels",
    icon: TelegramIcon,
  },
  {
    type: "EMAIL",
    label: "Gmail IA",
    shortLabel: "Email",
    connectedAction: "Gerer",
    disconnectedAction: "Connecter",
    connectedHref: "/dashboard/email",
    disconnectedHref: "/dashboard/email",
    icon: EmailIcon,
  },
];

export function DashboardClient({
  basePath = "/dashboard",
  userName,
  userAvatar,
  community,
  upcomingEvents,
  pendingPublications,
  stats,
  notifications,
}: Props) {
  const resolveHref = (href: string) => href.startsWith("/dashboard") ? href.replace("/dashboard", basePath) : href;
  const firstName = userName.split(" ")[0] || "vous";
  const structureLabel = getCommunityProfileLabel(community.communityType, "plural");
  const connectedTypes = new Set((community.channels ?? []).filter((channel) => channel.isConnected).map((channel) => channel.type));
  const connectedCount = CHANNEL_BUTTONS.filter((channel) => connectedTypes.has(channel.type)).length;
  const reviewCount = pendingPublications.length;
  const failedCount = pendingPublications.filter((publication) => publication.status === "FAILED").length;
  const nextEvent = upcomingEvents[0];

  function openMainMenu() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("dashboard:open-main-menu"));
  }

  return (
    <>
      <MobileDashboardHome
        firstName={firstName}
        userName={userName}
        userAvatar={userAvatar}
        communityName={community.name}
        communityLogo={community.logoUrl}
        communityType={community.communityType}
        unreadNotifications={notifications.length}
        basePath={basePath}
      />
      <div className="hidden min-w-0 space-y-5 pb-8 md:block">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="mt-1 flex items-center gap-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-amber-100 text-2xl shadow-sm shadow-amber-100">
                👋
              </span>
              <span>Bienvenue, {firstName}</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Votre Assistant IA concu specialement pour les {structureLabel}
            </p>
          </div>

          <Button asChild className="h-12 rounded-2xl bg-blue-950 px-5 text-white shadow-sm shadow-blue-950/20 hover:bg-blue-900">
            <Link href={resolveHref("/dashboard/assistant")}>
              <Zap className="size-4" />
              Ouvrir l&apos;assistant IA
            </Link>
          </Button>
        </div>
      </section>

      {failedCount > 0 && (
        <Link
          href={resolveHref("/dashboard/publications?status=FAILED")}
          className="flex items-start gap-3 rounded-3xl border border-red-100 bg-red-50 p-4 text-red-800 transition hover:border-red-200 hover:bg-red-100/70"
        >
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-500" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">
              {failedCount} publication{failedCount > 1 ? "s" : ""} en erreur
            </span>
            <span className="mt-0.5 block text-xs text-red-600">Cliquez pour verifier et relancer.</span>
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
                  {connectedCount}/5 comptes connectes
                </p>
              </div>
              <Link
                href={resolveHref("/dashboard/settings/channels")}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <Settings2 className="size-3.5" />
                Gerer
              </Link>
            </div>

            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {CHANNEL_BUTTONS.map((channel) => {
                const isConnected = connectedTypes.has(channel.type);
                const href = isConnected ? channel.connectedHref : channel.disconnectedHref;
                const Icon = channel.icon;

                return (
                  <Link
                    key={channel.type}
                    href={resolveHref(href)}
                    className={cn(
                      "group flex min-h-[74px] flex-col items-center justify-center gap-1.5 rounded-2xl border p-2 text-center transition hover:-translate-y-0.5 sm:min-h-[92px] sm:gap-2 sm:p-3",
                      isConnected
                        ? "border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-100 hover:bg-emerald-600"
                        : "border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300 hover:bg-white"
                    )}
                    title={`${channel.label} - ${isConnected ? "connecte" : "non connecte"}`}
                  >
                    <span
                      className={cn(
                        "flex size-10 items-center justify-center rounded-full bg-white shadow-sm sm:size-12",
                        !isConnected && "grayscale opacity-45"
                      )}
                    >
                      <Icon className="size-5 sm:size-6" />
                    </span>
                    <span className="block max-w-full truncate text-[11px] font-bold leading-tight sm:text-sm">
                      {channel.shortLabel}
                    </span>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <StatusCard
          title="Publications"
          value={reviewCount}
          description={reviewCount > 0 ? "Publications a valider ou suivre." : "Rien en attente."}
          href={resolveHref("/dashboard/publications")}
          icon={Clock3}
          tone={reviewCount > 0 ? "amber" : "slate"}
        />

        <StatusCard
          title="Notifications"
          value={notifications.length}
          description={notifications.length > 0 ? "Alertes non lues." : "Tout est a jour."}
          href={resolveHref("/dashboard/notifications")}
          icon={Bell}
          tone={notifications.length > 0 ? "blue" : "slate"}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <button
          type="button"
          onClick={openMainMenu}
          className="group flex h-full items-start gap-3 rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Waves className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-slate-950">Menu principal</span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">Ouvrir la navigation complete du dashboard.</span>
          </span>
          <ArrowRight className="mt-1 size-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500" />
        </button>
        <MiniPanel
          title="Mon agenda"
          description={nextEvent ? `Prochain element : ${nextEvent.title}` : "Ajouter ou verifier les prochains evenements."}
          href={resolveHref("/dashboard/events")}
          icon={CheckCircle2}
        />
        <MiniPanel
          title="Automatisations"
          description={`${stats.automations} automatisation${stats.automations > 1 ? "s" : ""} active${stats.automations > 1 ? "s" : ""}.`}
          href={resolveHref("/dashboard/automations")}
          icon={Settings2}
        />
      </section>
      </div>
    </>
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
  const sideAccentClass = {
    amber: "before:bg-amber-400",
    blue: "before:bg-blue-500",
    slate: "before:bg-slate-300",
  }[tone];

  return (
    <Link href={href} className="group min-w-0">
      <Card
        className={cn(
          "relative h-full overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 before:absolute before:bottom-5 before:left-0 before:top-5 before:w-1 before:rounded-r-full",
          sideAccentClass
        )}
      >
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
