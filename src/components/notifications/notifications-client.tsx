"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell, CheckCircle, AlertCircle, Clock, Zap, CreditCard,
  Unplug, Info, Check, BellOff,
} from "lucide-react";
import { formatRelative, cn } from "@/lib/utils";

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
      prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date() } : n))
    );
  }

  async function markAllAsRead() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: new Date() })));
  }

  const unreadCount = items.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500 mt-1">
            {unreadCount > 0
              ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`
              : "Aucune notification non lue"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <Check className="size-4 mr-2" />
            Tout marquer comme lu
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-slate-400">
            <BellOff className="size-12 mb-4" />
            <p className="text-lg font-medium">Aucune notification</p>
            <p className="text-sm">Vous serez notifié des événements importants ici.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((notification) => (
            <Card
              key={notification.id}
              className={cn(
                "cursor-pointer transition-colors hover:bg-slate-50",
                !notification.isRead && "border-l-4 border-l-blue-500 bg-blue-50/30"
              )}
              onClick={() => {
                if (!notification.isRead) markAsRead(notification.id);
                if (notification.link) router.push(notification.link);
              }}
            >
              <CardContent className="flex items-start gap-4 py-4">
                <div className="mt-0.5">
                  {TYPE_ICON[notification.type] ?? <Bell className="size-5 text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn("font-medium text-sm", !notification.isRead ? "text-slate-900" : "text-slate-600")}>
                      {notification.title}
                    </p>
                    {!notification.isRead && (
                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">Nouveau</Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{notification.body}</p>
                  <p className="text-xs text-slate-400 mt-1">{formatRelative(notification.createdAt)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
