"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PushNotificationSwitch } from "@/components/settings/push-notifications-card";
import {
  AlertCircle,
  Bell,
  BellOff,
  BellRing,
  Check,
  CheckCircle,
  Clock,
  CreditCard,
  Info,
  Unplug,
  Zap,
} from "lucide-react";
import { cn, formatRelative } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: unknown;
  isRead: boolean;
  readAt: Date | null;
  link: string | null;
  createdAt: Date;
}

interface Props {
  notifications: Notification[];
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  PUBLICATION_SUCCESS: <CheckCircle className="size-5 text-emerald-600" />,
  PUBLICATION_FAILED: <AlertCircle className="size-5 text-red-500" />,
  PUBLICATION_SCHEDULED: <Clock className="size-5 text-blue-500" />,
  AUTOMATION_TRIGGERED: <Zap className="size-5 text-amber-500" />,
  AUTOMATION_FAILED: <AlertCircle className="size-5 text-red-500" />,
  AI_CONTENT_READY: <CheckCircle className="size-5 text-violet-500" />,
  EVENT_REMINDER: <Bell className="size-5 text-blue-500" />,
  SUBSCRIPTION_EXPIRING: <CreditCard className="size-5 text-amber-500" />,
  SUBSCRIPTION_RENEWED: <CreditCard className="size-5 text-emerald-600" />,
  PAYMENT_FAILED: <AlertCircle className="size-5 text-red-500" />,
  CHANNEL_DISCONNECTED: <Unplug className="size-5 text-red-500" />,
  SYSTEM: <Info className="size-5 text-slate-500" />,
};

export function NotificationsClient({ notifications }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(notifications);
  const [activeTab, setActiveTab] = useState<"active" | "archives">("active");
  const [archiveLimit] = useState(() => Date.now() - 24 * 60 * 60 * 1000);

  async function markAsRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    setItems((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, isRead: true, readAt: new Date() } : notification,
      ),
    );
  }

  async function markAllAsRead() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    setItems((prev) => prev.map((notification) => ({ ...notification, isRead: true, readAt: new Date() })));
  }

  async function deleteNotification(id: string) {
    setItems((prev) => prev.filter((notification) => notification.id !== id));
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
  }

  function buildTargetLink(notification: Notification) {
    if (notification.type !== "AI_CONTENT_READY") return notification.link;

    const data = notification.data && typeof notification.data === "object"
      ? notification.data as { draftId?: unknown; channelTypes?: unknown }
      : null;
    const draftIdFromData = typeof data?.draftId === "string" ? data.draftId : null;
    const draftIdFromLink = notification.link?.match(/\/dashboard\/content\/([^/?#]+)/)?.[1] ?? null;
    const draftIdFromAssistantLink = notification.link ? new URL(notification.link, window.location.origin).searchParams.get("draftId") : null;
    const draftId = draftIdFromData ?? draftIdFromLink ?? draftIdFromAssistantLink;
    if (!draftId) return "/dashboard/assistant";

    const channelTypes = Array.isArray(data?.channelTypes)
      ? data.channelTypes.filter((channel): channel is string => typeof channel === "string")
      : [];
    const params = new URLSearchParams({ draftId, notificationId: notification.id });
    if (channelTypes.length > 0) params.set("channelTypes", channelTypes.join(","));
    return `/dashboard/assistant?${params.toString()}`;
  }

  const activeItems = items.filter((notification) => new Date(notification.createdAt).getTime() >= archiveLimit);
  const archivedItems = items.filter((notification) => new Date(notification.createdAt).getTime() < archiveLimit);
  const displayedItems = activeTab === "active" ? activeItems : archivedItems;
  const unreadCount = activeItems.filter((notification) => !notification.isRead).length;

  return (
    <div className="space-y-6">
      <div className="space-y-4 md:hidden">
        <section className="relative overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_70%_10%,#6d2abd_0%,#421388_38%,#210763_100%)] px-5 pb-5 pt-5 text-white shadow-[0_20px_42px_rgba(43,8,104,0.24)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_34%,rgba(116,52,213,0.26),transparent_30%),radial-gradient(circle_at_88%_60%,rgba(93,45,171,0.32),transparent_28%)]" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[0.72rem] font-black uppercase tracking-[0.18em] text-white/70">Centre d’alertes</p>
              <h1 className="mt-2 text-[clamp(1.95rem,8.6vw,2.4rem)] font-black leading-none tracking-[-0.05em]">Notifications</h1>
              <p className="mt-2 max-w-[14rem] text-sm font-medium leading-6 text-white/80">
                Retrouvez rapidement ce qui demande votre attention.
              </p>
            </div>
            <div className="relative flex size-[4.15rem] shrink-0 items-center justify-center rounded-[1.35rem] border border-white/14 bg-white/10 shadow-[0_16px_30px_rgba(18,5,52,0.32)] backdrop-blur">
              <div className="absolute inset-[0.45rem] rounded-[1.05rem] border border-white/10 bg-white/5" />
              <BellRing className="relative size-7 text-white" />
            </div>
          </div>

          <div className="relative mt-4 rounded-[1.35rem] border border-white/14 bg-white/10 px-4 py-3 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-white/70">Notifications push</p>
                <p className="mt-1 text-xs font-semibold text-white/80">Restez alerté directement sur votre appareil.</p>
              </div>
              <PushNotificationSwitch align="end" labelClassName="sr-only" />
            </div>
          </div>

          {unreadCount > 0 && (
            <div className="relative mt-4">
              <Button
                variant="outline"
                onClick={markAllAsRead}
                className="h-12 w-full rounded-[1.3rem] border-0 bg-white text-[#421388] shadow-[0_16px_28px_rgba(18,5,52,0.28)] hover:bg-violet-50 hover:text-[#35106f]"
              >
                <Check className="size-4" />
                Tout marquer comme lu
              </Button>
            </div>
          )}
        </section>

        <section className="rounded-[1.8rem] border border-[#421388]/10 bg-white px-4 py-4 shadow-[0_14px_28px_rgba(45,16,110,0.08)]">
          <div className="flex rounded-[1.1rem] bg-[#f6f0ff] p-1">
            {[
              { value: "active" as const, label: "Actives", count: activeItems.length },
              { value: "archives" as const, label: "Archives", count: archivedItems.length },
            ].map((tab) => {
              const isActive = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-[0.95rem] px-3 py-2.5 text-sm font-black transition",
                    isActive ? "bg-white text-[#421388] shadow-sm" : "text-slate-500"
                  )}
                >
                  {tab.label}
                  <span className={cn("rounded-full px-2 py-0.5 text-[0.65rem] font-black", isActive ? "bg-violet-50 text-[#421388]" : "bg-white text-slate-500")}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {unreadCount > 0 && activeTab === "active" && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">
              <Bell className="size-3.5" />
              {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
            </div>
          )}
        </section>

        {displayedItems.length === 0 ? (
          <section className="rounded-[1.9rem] border border-slate-200 bg-white px-5 py-14 text-center shadow-[0_12px_24px_rgba(45,16,110,0.07)]">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-[1.35rem] bg-[#fffaf4] text-slate-400">
              <BellOff className="size-8" />
            </div>
            <p className="text-lg font-black text-slate-900">{activeTab === "active" ? "Aucune notification" : "Aucune archive"}</p>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-500">Les alertes importantes apparaîtront ici.</p>
          </section>
        ) : (
          <section className="space-y-3">
            {displayedItems.map((notification) => {
              const targetLink = buildTargetLink(notification);
              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => {
                    if (!notification.isRead) markAsRead(notification.id);
                    if (targetLink) router.push(targetLink);
                  }}
                  className={cn(
                    "group relative flex w-full items-start gap-3 overflow-hidden rounded-[1.7rem] border bg-white p-4 pr-12 text-left shadow-[0_12px_24px_rgba(45,16,110,0.07)] transition",
                    !notification.isRead ? "border-blue-200 bg-blue-50/35" : "border-[#421388]/10"
                  )}
                >
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label="Supprimer la notification"
                    onClick={(event) => {
                      event.stopPropagation();
                      void deleteNotification(notification.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        event.stopPropagation();
                        void deleteNotification(notification.id);
                      }
                    }}
                    className="absolute right-3 top-3 z-10 inline-flex size-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    X
                  </span>

                  <span
                    className={cn(
                      "mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-2xl border bg-white shadow-sm",
                      !notification.isRead ? "border-blue-100" : "border-slate-100"
                    )}
                  >
                    {TYPE_ICON[notification.type] ?? <Bell className="size-5 text-slate-400" />}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-3">
                      <span
                        className={cn(
                          "line-clamp-2 text-sm font-black leading-5",
                          !notification.isRead ? "text-slate-950" : "text-slate-700"
                        )}
                      >
                        {notification.title}
                      </span>
                      {!notification.isRead && (
                        <Badge className="shrink-0 border border-blue-100 bg-blue-100 text-[0.65rem] font-black text-blue-700">
                          Nouveau
                        </Badge>
                      )}
                    </span>

                    <span className="mt-2 line-clamp-2 block text-sm leading-6 text-slate-500">{notification.body}</span>
                    <span className="mt-3 block text-xs font-semibold text-slate-400">{formatRelative(notification.createdAt)}</span>
                  </span>
                </button>
              );
            })}
          </section>
        )}
      </div>

      <div className="hidden space-y-6 md:block">
        <section className="overflow-hidden rounded-3xl border border-slate-900/10 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
          <div className="relative overflow-hidden bg-[radial-gradient(circle_at_15%_15%,rgba(34,211,238,0.28),transparent_30%),linear-gradient(135deg,#020617,#0f1d46_48%,#123b78)] px-5 py-6 text-white sm:px-6">
            <div className="absolute -right-16 -top-20 size-44 rounded-full bg-cyan-300/20 blur-3xl" aria-hidden />
            <div className="absolute bottom-4 right-8 size-2 rounded-full bg-cyan-200 shadow-[0_0_22px_rgba(103,232,249,0.9)] animate-ping" aria-hidden />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex max-w-3xl items-start gap-4">
                <div className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_18px_40px_rgba(14,165,233,0.18)] backdrop-blur">
                  <span className="absolute inset-0 rounded-2xl bg-cyan-300/20 blur-md animate-pulse" aria-hidden />
                  <BellRing className="relative size-7 animate-home-float text-cyan-100" />
                </div>
                <div>
                  <div className="mb-3 h-1.5 w-10 rounded-full bg-cyan-200" />
                  <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Notifications</h1>
                  <p className="mt-2 text-sm leading-6 text-blue-50">
                    Retrouvez les alertes importantes, les contenus prêts et les actions qui demandent votre attention.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-sm backdrop-blur">
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-100">Push appareil</p>
                  <PushNotificationSwitch align="start" labelClassName="text-cyan-100" />
                </div>

                {unreadCount > 0 && (
                  <Button
                    variant="outline"
                    onClick={markAllAsRead}
                    className="h-11 rounded-2xl border-white/30 bg-white/10 px-4 text-white hover:bg-white/20 hover:text-white"
                  >
                    <Check className="size-4" />
                    Tout marquer comme lu
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { label: "Actives", value: activeItems.length, color: "border-slate-200 bg-white text-slate-900" },
            { label: "Non lues", value: unreadCount, color: "border-blue-100 bg-blue-50 text-blue-800" },
            { label: "Archives", value: archivedItems.length, color: "border-emerald-100 bg-emerald-50 text-emerald-800" },
          ].map((stat) => (
            <div key={stat.label} className={cn("rounded-2xl border p-3 text-center shadow-sm sm:p-4", stat.color)}>
              <p className="text-xl font-black sm:text-2xl">{stat.value}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide opacity-70 sm:text-xs">{stat.label}</p>
            </div>
          ))}
        </section>

        <section className="flex flex-wrap gap-2">
          {[
            { value: "active" as const, label: "Notifications", count: activeItems.length },
            { value: "archives" as const, label: "Archives", count: archivedItems.length },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-bold transition",
                activeTab === tab.value
                  ? "border-blue-200 bg-blue-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </section>

        {displayedItems.length === 0 ? (
          <section className="rounded-3xl border border-slate-200 bg-white px-5 py-14 text-center shadow-sm">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <BellOff className="size-7" />
            </div>
            <p className="text-lg font-bold text-slate-900">{activeTab === "active" ? "Aucune notification" : "Aucune archive"}</p>
            <p className="mt-2 text-sm text-slate-500">Vous serez notifié des événements importants ici.</p>
          </section>
        ) : (
          <section className="space-y-3">
            {displayedItems.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => {
                  if (!notification.isRead) markAsRead(notification.id);
                  const targetLink = buildTargetLink(notification);
                  if (targetLink) router.push(targetLink);
                }}
                className={cn(
                  "group relative flex w-full items-start gap-3 rounded-3xl border bg-white p-4 pr-12 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)] sm:gap-4 sm:p-5 sm:pr-14",
                  !notification.isRead ? "border-blue-200 bg-blue-50/40" : "border-slate-200",
                )}
              >
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Supprimer la notification"
                  onClick={(event) => {
                    event.stopPropagation();
                    void deleteNotification(notification.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      void deleteNotification(notification.id);
                    }
                  }}
                  className="absolute right-3 top-3 z-10 inline-flex size-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  X
                </span>
                <span
                  className={cn(
                    "mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-2xl border bg-white shadow-inner",
                    !notification.isRead ? "border-blue-100" : "border-slate-100",
                  )}
                >
                  {TYPE_ICON[notification.type] ?? <Bell className="size-5 text-slate-400" />}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span
                      className={cn(
                        "line-clamp-2 text-sm font-bold leading-5",
                        !notification.isRead ? "text-slate-950" : "text-slate-700",
                      )}
                    >
                      {notification.title}
                    </span>
                    {!notification.isRead && (
                      <Badge className="w-fit shrink-0 border border-blue-100 bg-blue-100 text-blue-700">Nouveau</Badge>
                    )}
                  </span>

                  <span className="mt-2 block text-sm leading-6 text-slate-500">{notification.body}</span>
                  <span className="mt-3 block text-xs font-semibold text-slate-400">
                    {formatRelative(notification.createdAt)}
                  </span>
                </span>
              </button>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

