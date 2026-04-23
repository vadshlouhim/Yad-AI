import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const eventSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),
  location: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  category: z.string().default("OTHER"),
  audience: z.string().optional().nullable(),
  status: z.string().default("DRAFT"),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.any().optional().nullable(),
  isPublic: z.boolean().default(true),
  notes: z.string().optional().nullable(),
});

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

    const body = await request.json();
    const parsed = eventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides", details: parsed.error }, { status: 400 });
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
      console.error("[Events POST] insert error", eventError);
      return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
    }

    // Log audit
    await admin.from("AuditLog").insert({
      id: crypto.randomUUID(),
      userId: user.id,
      communityId: profile.communityId,
      action: "event.created",
      resource: "Event",
      resourceId: event.id,
      newData: { title: event.title, category: event.category },
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("[Events POST]", error);
    return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
  }
}
