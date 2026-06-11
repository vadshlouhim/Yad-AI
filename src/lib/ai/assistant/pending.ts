import type { createAdminClient } from "@/lib/supabase/admin";
import { executeAction, summarizeAction, type ExecuteResult } from "./actions";
import { notifyPendingAction } from "@/lib/notifications/notify";

type Admin = ReturnType<typeof createAdminClient>;

export interface PendingActionInput {
  communityId: string;
  userId: string | null;
  kind: string;
  payload: Record<string, unknown>;
  source?: "chat" | "automation";
  summary?: string;
}

export interface PendingActionDTO {
  id: string;
  kind: string;
  summary: string;
  status: string;
  token: string;
  createdAt: string;
}

// Crée une action en attente (mode CONFIRM) et déclenche les notifications
// (email + push + in-app). L'action n'est PAS exécutée tant qu'elle n'est pas validée.
export async function createPendingAction(
  admin: Admin,
  input: PendingActionInput,
  options: { notify?: boolean } = {}
): Promise<PendingActionDTO | null> {
  const summary = input.summary ?? summarizeAction(input.kind, input.payload);
  const id = crypto.randomUUID();
  const token = crypto.randomUUID().replace(/-/g, "");
  const now = new Date().toISOString();
  // Expire au bout de 7 jours.
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from("PendingAction")
    .insert({
      id,
      communityId: input.communityId,
      userId: input.userId,
      kind: input.kind,
      summary,
      payload: input.payload,
      status: "PENDING",
      token,
      source: input.source ?? "chat",
      expiresAt,
      createdAt: now,
      updatedAt: now,
    })
    .select("id, kind, summary, status, token, createdAt")
    .single();

  if (error || !data) {
    console.error("[PendingAction] Création échouée:", error?.message);
    return null;
  }

  if (options.notify !== false) {
    const { data: community } = await admin
      .from("Community")
      .select("name")
      .eq("id", input.communityId)
      .single();
    const communityName = (community as { name?: string } | null)?.name ?? "votre communauté";
    // Notifications en arrière-plan (ne bloque pas la réponse).
    notifyPendingAction(
      admin,
      { id, communityId: input.communityId, userId: input.userId, kind: input.kind, summary, token },
      communityName
    ).catch((e) => console.error("[PendingAction] Notification échouée:", e));
  }

  return data as PendingActionDTO;
}

export interface ResolveResult {
  ok: boolean;
  status?: string;
  message: string;
  execution?: ExecuteResult;
}

// Confirme ou rejette une action en attente. À la confirmation, l'action est exécutée.
export async function resolvePendingAction(
  admin: Admin,
  params: { actionId: string; communityId: string; userId: string | null; decision: "confirm" | "reject" }
): Promise<ResolveResult> {
  const { actionId, communityId, userId, decision } = params;

  const { data: action } = await admin
    .from("PendingAction")
    .select("id, communityId, userId, kind, payload, status")
    .eq("id", actionId)
    .eq("communityId", communityId)
    .maybeSingle();

  if (!action) return { ok: false, message: "Action introuvable." };
  if ((action as { status: string }).status !== "PENDING") {
    return { ok: false, status: (action as { status: string }).status, message: "Cette action a déjà été traitée." };
  }

  const resolvedAt = new Date().toISOString();

  if (decision === "reject") {
    await admin
      .from("PendingAction")
      .update({ status: "REJECTED", resolvedAt, updatedAt: resolvedAt })
      .eq("id", actionId);
    return { ok: true, status: "REJECTED", message: "Action refusée." };
  }

  // Confirmation → exécution réelle.
  const execution = await executeAction(
    { admin, communityId, userId },
    (action as { kind: string }).kind,
    ((action as { payload: Record<string, unknown> }).payload) ?? {}
  );

  await admin
    .from("PendingAction")
    .update({ status: "CONFIRMED", resolvedAt, updatedAt: resolvedAt })
    .eq("id", actionId);

  return { ok: true, status: "CONFIRMED", message: execution.message, execution };
}
