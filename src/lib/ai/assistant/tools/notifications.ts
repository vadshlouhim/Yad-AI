import type { AssistantToolDef } from "../types";
import type { PanelItem } from "../panels";
import { frDateTime, panelId, truncate } from "./shared";
import { resolveNotificationTarget } from "@/lib/notifications/navigation";

// Notifications in-app de l'utilisateur : lecture, marquage lu, suppression.
// Exception assumée : suppression classée REVERSIBLE (hygiène, pas de confirmation).

export const listNotifications: AssistantToolDef = {
  name: "list_notifications",
  label: "Consulter les notifications",
  summarize: () => "Consulter les notifications récentes.",
  schema: {
    type: "function",
    function: {
      name: "list_notifications",
      description: "Liste les notifications de l'utilisateur (non lues d'abord).",
      parameters: {
        type: "object",
        properties: {
          unreadOnly: { type: "boolean", description: "Ne montrer que les non lues" },
        },
      },
    },
  },
  read: async (ctx, args) => {
    if (!ctx.userId) return { llmResult: { notifications: [] } };
    let query = ctx.admin
      .from("Notification")
      .select("id, type, title, body, isRead, link, data, createdAt")
      .eq("userId", ctx.userId)
      .order("isRead", { ascending: true })
      .order("createdAt", { ascending: false })
      .limit(15);
    if (args.unreadOnly) query = query.eq("isRead", false);
    const { data } = await query;
    const notifications = data ?? [];

    const items: PanelItem[] = notifications.map((n) => ({
      id: n.id,
      title: n.title,
      subtitle: `${truncate(n.body, 90)} · ${frDateTime(n.createdAt)}`,
      badge: n.isRead ? undefined : "Non lue",
      actions: [
        ...(n.isRead
          ? []
          : [{
              id: `read-${n.id}`,
              label: "Marquer lue",
              kind: "execute_tool" as const,
              toolKind: "mark_notifications_read",
              payload: { notificationId: n.id },
            }]),
        { id: `open-${n.id}`, label: "Ouvrir", kind: "navigate" as const, href: resolveNotificationTarget(n) },
        {
          id: `del-${n.id}`,
          label: "Supprimer",
          style: "danger" as const,
          kind: "execute_tool" as const,
          toolKind: "delete_notification",
          payload: { notificationId: n.id },
        },
      ],
    }));

    return {
      llmResult: {
        unread: notifications.filter((n) => !n.isRead).length,
        notifications: notifications.map((n) => ({ id: n.id, title: n.title, isRead: n.isRead, type: n.type })),
      },
      panel: {
        id: panelId("notifications"),
        panelType: "entity_list",
        entity: "notification",
        title: "Notifications",
        emptyText: "Aucune notification.",
        items,
        meta: { total: notifications.length },
      },
    };
  },
};

export const markNotificationsRead: AssistantToolDef = {
  name: "mark_notifications_read",
  label: "Marquer les notifications lues",
  summarize: (payload) =>
    payload.notificationId ? "Marquer une notification comme lue." : "Marquer toutes les notifications comme lues.",
  schema: {
    type: "function",
    function: {
      name: "mark_notifications_read",
      description: "Marque une notification (notificationId) ou toutes les notifications comme lues.",
      parameters: {
        type: "object",
        properties: {
          notificationId: { type: "string", description: "Omis = tout marquer lu" },
        },
      },
    },
  },
  execute: async (ctx, payload) => {
    if (!ctx.userId) return { success: false, message: "Utilisateur inconnu." };
    const now = new Date().toISOString();
    if (payload.notificationId) {
      const { data } = await ctx.admin
        .from("Notification")
        .update({ isRead: true, readAt: now })
        .eq("id", String(payload.notificationId))
        .eq("userId", ctx.userId)
        .select("id")
        .single();
      if (!data) return { success: false, message: "Notification introuvable." };
      return { success: true, message: "Notification marquée comme lue." };
    }
    await ctx.admin.from("Notification").update({ isRead: true, readAt: now }).eq("userId", ctx.userId).eq("isRead", false);
    return { success: true, message: "Toutes les notifications ont été marquées comme lues." };
  },
};

export const deleteNotification: AssistantToolDef = {
  name: "delete_notification",
  label: "Supprimer une notification",
  summarize: () => "Supprimer une notification.",
  schema: {
    type: "function",
    function: {
      name: "delete_notification",
      description: "Supprime une notification de l'utilisateur.",
      parameters: {
        type: "object",
        properties: { notificationId: { type: "string" } },
        required: ["notificationId"],
      },
    },
  },
  execute: async (ctx, payload) => {
    if (!ctx.userId) return { success: false, message: "Utilisateur inconnu." };
    const { data } = await ctx.admin
      .from("Notification")
      .delete()
      .eq("id", String(payload.notificationId ?? ""))
      .eq("userId", ctx.userId)
      .select("id")
      .single();
    if (!data) return { success: false, message: "Notification introuvable." };
    return { success: true, message: "Notification supprimée." };
  },
};

export const notificationTools: AssistantToolDef[] = [listNotifications, markNotificationsRead, deleteNotification];
