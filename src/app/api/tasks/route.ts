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

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const parsed = taskSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Données de tâche invalides", details: parsed.error.flatten() }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("communityId")
      .eq("id", user.id)
      .single();
    if (!profile?.communityId) return NextResponse.json({ error: "Pas de communauté" }, { status: 400 });

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
      console.error("[Tasks POST] insert error", error);
      return NextResponse.json({ error: "Erreur lors de la création de la tâche" }, { status: 500 });
    }

    await admin.from("AuditLog").insert({
      id: crypto.randomUUID(),
      userId: user.id,
      communityId: profile.communityId,
      action: "task.created",
      resource: "Task",
      resourceId: task.id,
      newData: { title: task.title },
    });

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
      console.error("[Tasks POST] notification error", error);
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("[Tasks POST]", error);
    return NextResponse.json({ error: "Erreur lors de la création de la tâche" }, { status: 500 });
  }
}
