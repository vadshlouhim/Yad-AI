import { fromZonedTime } from "date-fns-tz";
import type { AssistantToolDef } from "../types";
import type { PanelItem } from "../panels";
import { frDateTime, panelId, truncate } from "./shared";

// Agenda connecté IA : lecture, création, modification, archivage d'événements.

const EVENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  READY: "Prêt",
  SCHEDULED: "Programmé",
  PUBLISHED: "Publié",
  COMPLETED: "Terminé",
  ARCHIVED: "Archivé",
};

async function resolveStartDate(
  admin: Parameters<NonNullable<AssistantToolDef["execute"]>>[0]["admin"],
  communityId: string,
  date: unknown,
  time: unknown
): Promise<Date | null> {
  const dateStr = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
  if (!dateStr) return null;
  const rawTime = typeof time === "string" && /^\d{1,2}:\d{2}$/.test(time) ? time : "10:00";
  const timeStr = rawTime.length === 4 ? `0${rawTime}` : rawTime;
  const { data: community } = await admin.from("Community").select("timezone").eq("id", communityId).single();
  const timezone = (community as { timezone?: string } | null)?.timezone ?? "Europe/Paris";
  return fromZonedTime(`${dateStr}T${timeStr}:00`, timezone);
}

export const listEvents: AssistantToolDef = {
  name: "list_events",
  label: "Consulter l'agenda",
  summarize: () => "Consulter les prochains événements de l'agenda.",
  schema: {
    type: "function",
    function: {
      name: "list_events",
      description: "Liste les événements de l'agenda (à venir par défaut). Filtres optionnels par statut ou inclusion du passé.",
      parameters: {
        type: "object",
        properties: {
          includePast: { type: "boolean", description: "Inclure les événements passés (30 derniers jours)" },
          status: { type: "string", description: "DRAFT, READY, SCHEDULED, PUBLISHED, COMPLETED" },
        },
      },
    },
  },
  read: async (ctx, args) => {
    const includePast = Boolean(args.includePast);
    let query = ctx.admin
      .from("Event")
      .select("id, title, startDate, location, category, status, description")
      .eq("communityId", ctx.communityId)
      .neq("status", "ARCHIVED")
      .order("startDate", { ascending: true })
      .limit(20);
    if (includePast) {
      query = query.gte("startDate", new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString());
    } else {
      query = query.gte("startDate", new Date().toISOString());
    }
    if (typeof args.status === "string" && args.status) query = query.eq("status", args.status);

    const { data } = await query;
    const events = data ?? [];

    const items: PanelItem[] = events.map((e) => ({
      id: e.id,
      title: e.title,
      subtitle: `${frDateTime(e.startDate)}${e.location ? ` · ${e.location}` : ""}`,
      badge: EVENT_STATUS_LABELS[e.status] ?? e.status,
      fields: [
        { key: "title", label: "Titre", value: e.title, editable: true, inputType: "text" as const },
        { key: "date", label: "Date", value: e.startDate?.slice(0, 10) ?? "", editable: true, inputType: "date" as const },
        { key: "time", label: "Heure", value: e.startDate ? new Date(e.startDate).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "", editable: true, inputType: "time" as const },
        { key: "location", label: "Lieu", value: e.location ?? "", editable: true, inputType: "text" as const },
        { key: "description", label: "Description", value: e.description ?? "", editable: true, inputType: "textarea" as const },
      ],
      actions: [
        { id: `save-${e.id}`, label: "Enregistrer", style: "primary" as const, kind: "execute_tool" as const, toolKind: "update_event", payload: { eventId: e.id } },
        { id: `del-${e.id}`, label: "Supprimer", style: "danger" as const, kind: "execute_tool" as const, toolKind: "delete_event", payload: { eventId: e.id }, confirm: true },
      ],
    }));

    return {
      llmResult: {
        events: events.map((e) => ({ id: e.id, title: e.title, startDate: e.startDate, location: e.location, status: e.status })),
      },
      panel: {
        id: panelId("events"),
        panelType: "entity_list",
        entity: "event",
        title: events.length > 0 ? `Agenda — ${events.length} événement${events.length > 1 ? "s" : ""}` : "Agenda",
        emptyText: "Aucun événement à venir dans l'agenda.",
        items,
        meta: { total: events.length },
      },
    };
  },
};

export const createEvent: AssistantToolDef = {
  name: "create_event",
  label: "Ajouter à l'agenda",
  summarize: (payload) =>
    `Ajouter à l'agenda : « ${String(payload.title ?? "")} »${payload.date ? ` le ${String(payload.date)}${payload.time ? ` à ${String(payload.time)}` : ""}` : ""}.`,
  schema: {
    type: "function",
    function: {
      name: "create_event",
      description: "Ajoute un événement, un rappel ou une date dans l'Agenda connecté IA de la communauté.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          date: { type: "string", description: "YYYY-MM-DD" },
          time: { type: "string", description: "HH:MM (défaut 10:00)" },
          description: { type: "string" },
          location: { type: "string" },
        },
        required: ["title"],
      },
    },
  },
  execute: async (ctx, payload) => {
    const title = String(payload.title ?? "").trim();
    if (!title) return { success: false, message: "Titre de l'événement manquant." };
    const start =
      (await resolveStartDate(ctx.admin, ctx.communityId, payload.date, payload.time)) ??
      new Date(Date.now() + 24 * 60 * 60 * 1000);
    const nowIso = new Date().toISOString();
    const eventId = crypto.randomUUID();
    await ctx.admin.from("Event").insert({
      id: eventId,
      communityId: ctx.communityId,
      title,
      description: typeof payload.description === "string" ? payload.description : null,
      location: typeof payload.location === "string" && payload.location.trim() ? payload.location.trim() : null,
      startDate: start.toISOString(),
      endDate: new Date(start.getTime() + 60 * 60 * 1000).toISOString(),
      category: "OTHER",
      status: "DRAFT",
      isRecurring: false,
      isPublic: false,
      notes: "Ajouté depuis l'assistant IA.",
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    return { success: true, message: `« ${title} » ajouté à votre agenda.`, data: { eventId } };
  },
};

export const updateEvent: AssistantToolDef = {
  name: "update_event",
  label: "Modifier un événement",
  summarize: (payload) => {
    const changes = ["title", "date", "time", "location", "description", "status"]
      .filter((k) => payload[k] !== undefined && payload[k] !== null && payload[k] !== "")
      .map((k) => `${k} → ${truncate(String(payload[k]), 40)}`)
      .join(", ");
    return `Modifier l'événement : ${changes || "(aucun changement)"}.`;
  },
  schema: {
    type: "function",
    function: {
      name: "update_event",
      description: "Modifie un événement existant de l'agenda (titre, date, heure, lieu, description, statut). Utilise list_events pour trouver l'eventId.",
      parameters: {
        type: "object",
        properties: {
          eventId: { type: "string" },
          title: { type: "string" },
          date: { type: "string", description: "YYYY-MM-DD" },
          time: { type: "string", description: "HH:MM" },
          description: { type: "string" },
          location: { type: "string" },
          status: { type: "string", description: "DRAFT, READY, SCHEDULED, PUBLISHED, COMPLETED" },
        },
        required: ["eventId"],
      },
    },
  },
  execute: async (ctx, payload) => {
    const eventId = String(payload.eventId ?? "");
    if (!eventId) return { success: false, message: "eventId manquant." };

    const { data: existing } = await ctx.admin
      .from("Event")
      .select("id, title, startDate")
      .eq("id", eventId)
      .eq("communityId", ctx.communityId)
      .single();
    if (!existing) return { success: false, message: "Événement introuvable." };

    const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (typeof payload.title === "string" && payload.title.trim()) update.title = payload.title.trim();
    if (typeof payload.description === "string") update.description = payload.description;
    if (typeof payload.location === "string") update.location = payload.location.trim() || null;
    if (typeof payload.status === "string" && payload.status) update.status = payload.status;

    if (payload.date || payload.time) {
      const currentStart = new Date(existing.startDate);
      const date = typeof payload.date === "string" && payload.date
        ? payload.date
        : existing.startDate?.slice(0, 10);
      const time = typeof payload.time === "string" && payload.time
        ? payload.time
        : `${String(currentStart.getHours()).padStart(2, "0")}:${String(currentStart.getMinutes()).padStart(2, "0")}`;
      const start = await resolveStartDate(ctx.admin, ctx.communityId, date, time);
      if (start) {
        update.startDate = start.toISOString();
        update.endDate = new Date(start.getTime() + 60 * 60 * 1000).toISOString();
      }
    }

    await ctx.admin.from("Event").update(update).eq("id", eventId).eq("communityId", ctx.communityId);
    await ctx.admin.from("AuditLog").insert({
      id: crypto.randomUUID(),
      userId: ctx.userId,
      communityId: ctx.communityId,
      action: "event.updated",
      resource: "Event",
      resourceId: eventId,
      newData: update,
    });
    return { success: true, message: `Événement « ${String(update.title ?? existing.title) } » mis à jour.` };
  },
};

export const deleteEvent: AssistantToolDef = {
  name: "delete_event",
  label: "Supprimer un événement",
  summarize: () => "Supprimer (archiver) un événement de l'agenda.",
  schema: {
    type: "function",
    function: {
      name: "delete_event",
      description: "Supprime (archive) un événement de l'agenda. Utilise list_events pour trouver l'eventId.",
      parameters: {
        type: "object",
        properties: { eventId: { type: "string" } },
        required: ["eventId"],
      },
    },
  },
  execute: async (ctx, payload) => {
    const eventId = String(payload.eventId ?? "");
    if (!eventId) return { success: false, message: "eventId manquant." };
    const { data: existing } = await ctx.admin
      .from("Event")
      .select("id, title")
      .eq("id", eventId)
      .eq("communityId", ctx.communityId)
      .single();
    if (!existing) return { success: false, message: "Événement introuvable." };

    // Même sémantique que la route DELETE /api/events/[id] : archivage, pas de suppression dure.
    await ctx.admin.from("Event").update({ status: "ARCHIVED", updatedAt: new Date().toISOString() }).eq("id", eventId);
    await ctx.admin.from("AuditLog").insert({
      id: crypto.randomUUID(),
      userId: ctx.userId,
      communityId: ctx.communityId,
      action: "event.archived",
      resource: "Event",
      resourceId: eventId,
    });
    return { success: true, message: `Événement « ${existing.title} » supprimé de l'agenda.` };
  },
};

export const eventTools: AssistantToolDef[] = [listEvents, createEvent, updateEvent, deleteEvent];
