"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ComponentType, MouseEvent, SVGProps } from "react";
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
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useDashboardCopy } from "@/lib/i18n/use-dashboard-copy";
import { getPublishChannels } from "@/lib/features-by-locale";
import { useComingSoonGate } from "@/components/dashboard/coming-soon-dialog";
import { HebrewDashboardHome } from "@/components/dashboard/hebrew-dashboard-home";

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

const HE_CHANNEL_SHORT_LABELS: Record<string, string> = {
  INSTAGRAM: "Insta",
  FACEBOOK: "FB",
  WHATSAPP: "WA",
  TELEGRAM: "TG",
  EMAIL: "Mail",
};

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
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const tr = useDashboardCopy();
  const resolveHref = (href: string) => href.startsWith("/dashboard") ? href.replace("/dashboard", basePath) : href;
  const firstName = userName.split(" ")[0] || "vous";
  const structureLabel = getCommunityProfileLabel(community.communityType, "plural");
  const connectedTypes = new Set((community.channels ?? []).filter((channel) => channel.isConnected).map((channel) => channel.type));
  const connectedCount = CHANNEL_BUTTONS.filter((channel) => connectedTypes.has(channel.type)).length;
  const reviewCount = pendingPublications.length;
  const failedCount = pendingPublications.filter((publication) => publication.status === "FAILED").length;
  const nextEvent = upcomingEvents[0];
  const { isBlocked, guard, openComingSoon, comingSoonDialog } = useComingSoonGate();
  const publishChannels = getPublishChannels(locale);
  // Hebrew: only the Facebook and Instagram connections are offered for now.
  const channelBlocked = (type: string, href: string) => isBlocked(href) || (locale === "he" && !publishChannels.includes(type as never));

  function openMainMenu() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("dashboard:open-main-menu"));
  }

  if (locale === "he") {
    return <HebrewDashboardHome firstName={firstName} basePath={basePath} />;
  }

  return (
    <>
      <Suspense fallback={null}>
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
      </Suspense>
      <div className="hidden min-w-0 space-y-5 pb-8 md:block">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="mt-1 flex items-center gap-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-amber-100 text-2xl shadow-sm shadow-amber-100">
                👋
              </span>
              <span>{t("welcome", { name: firstName })}</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {locale === "he" ? "סוכן ה־AI שלכם, שנבנה במיוחד עבור הקהילה שלכם" : <>Votre Assistant IA concu specialement pour les {structureLabel}</>}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <LanguageSwitcher />
            <Button asChild className="h-12 rounded-2xl bg-blue-950 px-5 text-white shadow-sm shadow-blue-950/20 hover:bg-blue-900">
              <Link href={resolveHref("/dashboard/assistant")} onClick={guard("/dashboard/assistant")}>
                <Zap className="size-4" />
                {locale === "he" ? "פתיחת סוכן ה־AI" : "Ouvrir l’assistant IA"}
              </Link>
            </Button>
          </div>
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
              {locale === "he" ? `${failedCount} פרסומים עם שגיאה` : `${failedCount} publication${failedCount > 1 ? "s" : ""} en erreur`}
            </span>
            <span className="mt-0.5 block text-xs text-red-600">{locale === "he" ? "לחצו כדי לבדוק ולהפעיל מחדש." : "Cliquez pour verifier et relancer."}</span>
          </span>
          <ArrowRight className="rtl-mirror size-4 shrink-0" />
        </Link>
      )}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(220px,0.8fr)_minmax(220px,0.8fr)]">
        <Card className="rounded-[2rem] border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-950">{locale === "he" ? "חיבורים" : "Connexions"}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {locale === "he" ? `${connectedCount}/5 חשבונות מחוברים` : `${connectedCount}/5 comptes connectes`}
                </p>
              </div>
              <Link
                href={resolveHref("/dashboard/settings/channels")}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <Settings2 className="size-3.5" />
                {locale === "he" ? "ניהול" : "Gerer"}
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
                    onClick={(event) => {
                      if (!channelBlocked(channel.type, href)) return;
                      event.preventDefault();
                      openComingSoon();
                    }}
                    className={cn(
                      "group flex min-h-[74px] flex-col items-center justify-center gap-1.5 rounded-2xl border p-2 text-center transition hover:-translate-y-0.5 sm:min-h-[92px] sm:gap-2 sm:p-3",
                      isConnected
                        ? "border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-100 hover:bg-emerald-600"
                        : "border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300 hover:bg-white"
                    )}
                    title={`${channel.label} - ${locale === "he" ? (isConnected ? "מחובר" : "לא מחובר") : (isConnected ? "connecte" : "non connecte")}`}
                  >
                    <span
                      className={cn(
                        "flex size-10 items-center justify-center rounded-full bg-white shadow-sm sm:size-12",
                        !isConnected && "grayscale opacity-45"
                      )}
                    >
                      <Icon className="size-5 sm:size-6" />
                    </span>
                    <span dir="ltr" className="block w-full max-w-full truncate text-center text-[11px] font-bold leading-tight sm:text-sm">
                      {locale === "he" ? HE_CHANNEL_SHORT_LABELS[channel.type] : channel.shortLabel}
                    </span>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <StatusCard
          title={locale === "he" ? "פרסומים" : "Publications"}
          value={reviewCount}
          description={locale === "he" ? (reviewCount > 0 ? "פרסומים לבדיקה או למעקב." : "אין פריטים בהמתנה.") : (reviewCount > 0 ? "Publications a valider ou suivre." : "Rien en attente.")}
          href={resolveHref("/dashboard/publications")}
          icon={Clock3}
          tone={reviewCount > 0 ? "amber" : "slate"}
        />

        <StatusCard
          title={tr("Notifications")}
          value={notifications.length}
          description={locale === "he" ? (notifications.length > 0 ? "התראות שלא נקראו." : "הכול מעודכן.") : (notifications.length > 0 ? "Alertes non lues." : "Tout est a jour.")}
          href={resolveHref("/dashboard/notifications")}
          icon={Bell}
          tone={notifications.length > 0 ? "blue" : "slate"}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <button
          type="button"
          onClick={openMainMenu}
          className="group flex h-full items-start gap-3 rounded-3xl border border-slate-200 bg-white p-4 text-start shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Waves className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-slate-950">{t("mainMenu")}</span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">{locale === "he" ? "פתיחת הניווט המלא בלוח הבקרה." : "Ouvrir la navigation complete du dashboard."}</span>
          </span>
          <ArrowRight className="rtl-mirror mt-1 size-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500" />
        </button>
        <MiniPanel
          title={tr("Mon agenda")}
          description={nextEvent ? (locale === "he" ? `האירוע הבא: ${nextEvent.title}` : `Prochain element : ${nextEvent.title}`) : (locale === "he" ? "הוסיפו או בדקו את האירועים הבאים." : "Ajouter ou verifier les prochains evenements.")}
          href={resolveHref("/dashboard/events")}
          onClick={guard("/dashboard/events")}
          icon={CheckCircle2}
        />
        <MiniPanel
          title={tr("Automatisations")}
          description={locale === "he" ? `${stats.automations} אוטומציות פעילות.` : `${stats.automations} automatisation${stats.automations > 1 ? "s" : ""} active${stats.automations > 1 ? "s" : ""}.`}
          href={resolveHref("/dashboard/automations")}
          onClick={guard("/dashboard/automations")}
          icon={Settings2}
        />
      </section>
      </div>
      {comingSoonDialog}
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
          "relative h-full overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 before:absolute before:bottom-5 before:start-0 before:top-5 before:w-1 before:rounded-e-full",
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
            <ArrowRight className="rtl-mirror size-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
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
  onClick,
  icon: Icon,
}: {
  title: string;
  description: string;
  href: string;
  onClick?: (event: MouseEvent) => void;
  icon: LucideIcon;
}) {
  return (
    <Link href={href} onClick={onClick} className="group min-w-0">
      <div className="flex h-full items-start gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-slate-950">{title}</span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
        </span>
        <ArrowRight className="rtl-mirror mt-1 size-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500" />
      </div>
    </Link>
  );
}
