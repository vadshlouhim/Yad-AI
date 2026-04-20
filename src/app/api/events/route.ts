import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
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

    const profile = await prisma.user.findUnique({ where: { id: user.id } });
    if (!profile?.communityId) return NextResponse.json({ error: "Pas de communauté" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");

    const events = await prisma.event.findMany({
      where: {
        communityId: profile.communityId,
        ...(status && { status: status as never }),
        ...(category && { category: category as never }),
      },
      orderBy: { startDate: "asc" },
      take: 100,
    });

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

    const profile = await prisma.user.findUnique({ where: { id: user.id } });
    if (!profile?.communityId) return NextResponse.json({ error: "Pas de communauté" }, { status: 400 });

    const body = await request.json();
    const parsed = eventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides", details: parsed.error }, { status: 400 });
    }

    const event = await prisma.event.create({
      data: {
        communityId: profile.communityId,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        startDate: new Date(parsed.data.startDate),
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
        location: parsed.data.location ?? null,
        address: parsed.data.address ?? null,
        category: parsed.data.category as never,
        audience: parsed.data.audience ?? null,
        status: parsed.data.status as never,
        isRecurring: parsed.data.isRecurring,
        recurrenceRule: parsed.data.recurrenceRule ?? undefined,
        isPublic: parsed.data.isPublic,
        notes: parsed.data.notes ?? null,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        communityId: profile.communityId,
        action: "event.created",
        resource: "Event",
        resourceId: event.id,
        newData: { title: event.title, category: event.category },
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("[Events POST]", error);
    return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
  }
}
