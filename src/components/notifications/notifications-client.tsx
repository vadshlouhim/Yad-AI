"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  Bell,
  BellOff,
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

  const unreadCount = items.filter((notification) => !notification.isRead).length;
  const readCount = items.length - unreadCount;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
        <div className="bg-[linear-gradient(135deg,#0f172a,#1d4ed8,#0ea5e9)] px-5 py-6 text-white sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 h-1.5 w-10 rounded-full bg-cyan-200" />
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Notifications</h1>
              <p className="mt-2 text-sm leading-6 text-blue-50">
                Retrouvez les alertes importantes, les contenus prets et les actions qui demandent votre attention.
              </p>
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
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Total", value: items.length, color: "border-slate-200 bg-white text-slate-900" },
          { label: "Non lues", value: unreadCount, color: "border-blue-100 bg-blue-50 text-blue-800" },
          { label: "Traitees", value: readCount, color: "border-emerald-100 bg-emerald-50 text-emerald-800" },
        ].map((stat) => (
          <div key={stat.label} className={cn("rounded-2xl border p-4 shadow-sm", stat.color)}>
            <p className="text-2xl font-black">{stat.value}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide opacity-70">{stat.label}</p>
          </div>
        ))}
      </section>

      {items.length === 0 ? (
        <section className="rounded-3xl border border-slate-200 bg-white px-5 py-14 text-center shadow-sm">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <BellOff className="size-7" />
          </div>
          <p className="text-lg font-bold text-slate-900">Aucune notification</p>
          <p className="mt-2 text-sm text-slate-500">Vous serez notifie des evenements importants ici.</p>
        </section>
      ) : (
        <section className="space-y-3">
          {items.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => {
                if (!notification.isRead) markAsRead(notification.id);
                if (notification.link) router.push(notification.link);
              }}
              className={cn(
                "group flex w-full items-start gap-3 rounded-3xl border bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)] sm:gap-4 sm:p-5",
                !notification.isRead ? "border-blue-200 bg-blue-50/40" : "border-slate-200",
              )}
            >
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
  );
}
