import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyAgendaItemCreated } from "@/lib/notifications/agenda";
import { z } from "zod";

const eventSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().optional().nullable(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),
  location: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  category: z.enum(["SHABBAT", "HOLIDAY", "COURSE", "PRAYER", "COMMUNITY", "YOUTH", "CULTURAL", "FUNDRAISING", "ANNOUNCEMENT", "OTHER"]).default("OTHER"),
  audience: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "READY", "SCHEDULED", "PUBLISHED", "COMPLETED", "ARCHIVED"]).default("DRAFT"),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.any().optional().nullable(),
  isPublic: z.boolean().default(true),
  notes: z.string().optional().nullable(),
}).superRefine((event, context) => {
  if (event.endDate && new Date(event.endDate) < new Date(event.startDate)) {
    context.addIssue({
      code: "custom",
      path: ["endDate"],
      message: "La date de fin doit être postérieure à la date de début.",
    });
  }
});

function eventErrorResponse(message: string, status: number, requestId: string) {
  return NextResponse.json(
    { error: message, requestId },
    { status, headers: { "X-Request-ID": requestId } },
  );
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const admin = createAdminClient();

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (profileError || !profile?.communityId) return NextResponse.json({ error: "Pas de communauté" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");

    let query = admin
      .from("Event")
      .select("*")
      .eq("communityId", profile.communityId)
      .order("startDate", { ascending: true })
      .limit(100);

    if (status) query = query.eq("status", status);
    if (category) query = query.eq("category", category);

    const { data: events, error } = await query;
    if (error) throw error;

    return NextResponse.json(events);
  } catch (error) {
    console.error("[Events GET]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return eventErrorResponse("Non authentifié", 401, requestId);

    const admin = createAdminClient();

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("communityId")
      .eq("id", user.id)
      .single();
    if (profileError || !profile?.communityId) {
      console.error("[Events POST] profile error", { requestId, userId: user.id, error: profileError });
      return eventErrorResponse("Aucune communauté n’est associée à votre compte.", 400, requestId);
    }

    const body = await request.json();
    const parsed = eventSchema.safeParse(body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message;
      console.warn("[Events POST] validation error", { requestId, userId: user.id, issues: parsed.error.issues });
      return NextResponse.json(
        { error: firstIssue ?? "Les informations de l’événement sont invalides.", requestId },
        { status: 400, headers: { "X-Request-ID": requestId } },
      );
    }

    const { data: event, error: eventError } = await admin
      .from("Event")
      .insert({
        id: crypto.randomUUID(),
        communityId: profile.communityId,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate ?? null,
        location: parsed.data.location ?? null,
        address: parsed.data.address ?? null,
        category: parsed.data.category,
        audience: parsed.data.audience ?? null,
        status: parsed.data.status,
        isRecurring: parsed.data.isRecurring,
        recurrenceRule: parsed.data.recurrenceRule ?? null,
        isPublic: parsed.data.isPublic,
        notes: parsed.data.notes ?? null,
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (eventError || !event) {
      console.error("[Events POST] insert error", {
        requestId,
        userId: user.id,
        communityId: profile.communityId,
        code: eventError?.code,
        message: eventError?.message,
        details: eventError?.details,
        hint: eventError?.hint,
      });
      return eventErrorResponse(
        `L’événement n’a pas pu être créé. Réessayez ou transmettez la référence ${requestId}.`,
        500,
        requestId,
      );
    }

    // Log audit
    const { error: auditError } = await admin.from("AuditLog").insert({
      id: crypto.randomUUID(),
      userId: user.id,
      communityId: profile.communityId,
      action: "event.created",
      resource: "Event",
      resourceId: event.id,
      newData: { title: event.title, category: event.category },
    });
    if (auditError) {
      console.error("[Events POST] audit error", { requestId, eventId: event.id, code: auditError.code, message: auditError.message });
    }

    try {
      await notifyAgendaItemCreated(admin, {
        userId: user.id,
        communityId: profile.communityId,
        itemId: event.id,
        itemType: "event",
        title: event.title,
        link: `/dashboard/events/${event.id}`,
      });
    } catch (notificationError) {
      console.error("[Events POST] notification error", { requestId, eventId: event.id, error: notificationError });
    }

    return NextResponse.json(event, { status: 201, headers: { "X-Request-ID": requestId } });
  } catch (error) {
    console.error("[Events POST] unexpected error", { requestId, error });
    return eventErrorResponse(
      `L’événement n’a pas pu être créé. Réessayez ou transmettez la référence ${requestId}.`,
      500,
      requestId,
    );
  }
}
