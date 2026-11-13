import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyAgendaItemCreated } from "@/lib/notifications/agenda";

const recurrenceSchema = z.object({
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
  weekdays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  until: z.string().datetime().optional(),
}).nullable().optional();

const taskSchema = z.object({
  title: z.string().trim().min(1).max(255),
  scheduledAt: z.string().datetime(),
  recurrenceRule: recurrenceSchema,
});

function taskErrorResponse(message: string, status: number, requestId: string) {
  return NextResponse.json(
    { error: message, requestId },
    { status, headers: { "X-Request-ID": requestId } },
  );
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return taskErrorResponse("Non authentifié", 401, requestId);

    const parsed = taskSchema.safeParse(await request.json());
    if (!parsed.success) {
      console.warn("[Tasks POST] validation error", { requestId, userId: user.id, issues: parsed.error.issues });
      return taskErrorResponse(parsed.error.issues[0]?.message ?? "Données de tâche invalides", 400, requestId);
    }

    const admin = createAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("communityId")
      .eq("id", user.id)
      .single();
    if (profileError || !profile?.communityId) {
      console.error("[Tasks POST] profile error", { requestId, userId: user.id, error: profileError });
      return taskErrorResponse("Aucune communauté n’est associée à votre compte.", 400, requestId);
    }

    const { data: task, error } = await admin
      .from("Task")
      .insert({
        id: crypto.randomUUID(),
        communityId: profile.communityId,
        userId: user.id,
        title: parsed.data.title,
        scheduledAt: parsed.data.scheduledAt,
        recurrenceRule: parsed.data.recurrenceRule ?? null,
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !task) {
      console.error("[Tasks POST] insert error", {
        requestId,
        userId: user.id,
        communityId: profile.communityId,
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
      });
      return taskErrorResponse(
        `La tâche n’a pas pu être créée. Réessayez ou transmettez la référence ${requestId}.`,
        500,
        requestId,
      );
    }

    const { error: auditError } = await admin.from("AuditLog").insert({
      id: crypto.randomUUID(),
      userId: user.id,
      communityId: profile.communityId,
      action: "task.created",
      resource: "Task",
      resourceId: task.id,
      newData: { title: task.title },
    });
    if (auditError) {
      console.error("[Tasks POST] audit error", { requestId, taskId: task.id, code: auditError.code, message: auditError.message });
    }

    try {
      await notifyAgendaItemCreated(admin, {
        userId: user.id,
        communityId: profile.communityId,
        itemId: task.id,
        itemType: "task",
        title: task.title,
        link: "/dashboard/events",
      });
    } catch (error) {
      console.error("[Tasks POST] notification error", { requestId, taskId: task.id, error });
    }

    return NextResponse.json(task, { status: 201, headers: { "X-Request-ID": requestId } });
  } catch (error) {
    console.error("[Tasks POST] unexpected error", { requestId, error });
    return taskErrorResponse(
      `La tâche n’a pas pu être créée. Réessayez ou transmettez la référence ${requestId}.`,
      500,
      requestId,
    );
  }
}
