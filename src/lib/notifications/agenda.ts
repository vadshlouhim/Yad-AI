import type { createAdminClient } from "@/lib/supabase/admin";
import { createNotificationOnce } from "./create-once";
import { sendPushToUser } from "./push";

type Admin = ReturnType<typeof createAdminClient>;

export async function notifyAgendaItemCreated(
  admin: Admin,
  params: {
    userId: string;
    communityId: string;
    itemId: string;
    itemType: "event" | "task";
    title: string;
    link: string;
  }
) {
  const label = params.itemType === "task" ? "Tâche ajoutée" : "Événement ajouté";
  const body = `« ${params.title} » a été ajouté à votre agenda.`;
  const created = await createNotificationOnce(admin, {
    userId: params.userId,
    communityId: params.communityId,
    type: "SYSTEM",
    title: label,
    body,
    link: params.link,
    dedupeKey: `agenda-item-created:${params.itemType}:${params.itemId}`,
    data: { itemId: params.itemId, itemType: params.itemType },
  });

  if (!created) return;

  try {
    await sendPushToUser(admin, params.userId, {
      title: label,
      body,
      url: params.link,
      tag: `agenda-${params.itemType}-${params.itemId}`,
    });
  } catch (error) {
    console.error("[Agenda notification] Push non envoyé:", error);
  }
}
