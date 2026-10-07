import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCommunityApiContext } from "@/lib/auth/community-api";
import { gregorianToHebrew, validateHebrewYahrzeit } from "@/lib/contacts/hebrew-birthday";

const inputSchema = z.object({
  memberId: z.string().min(1),
  deceasedName: z.string().trim().min(1),
  deceasedHebrewName: z.string().trim().optional().nullable(),
  relationship: z.string().trim().optional().nullable(),
  fatherHebrewName: z.string().trim().optional().nullable(),
  motherHebrewName: z.string().trim().optional().nullable(),
  deathDate: z.string().optional().nullable(),
  deathAfterSunset: z.boolean().optional().default(false),
  hebrewDeathDay: z.coerce.number().int().optional(),
  hebrewDeathMonth: z.coerce.number().int().optional(),
  hebrewDeathYear: z.coerce.number().int().optional(),
  notes: z.string().trim().optional().nullable(),
});

export async function GET() {
  const context = await getCommunityApiContext();
  if (!context) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const admin = createAdminClient() as ReturnType<typeof createAdminClient> & { from: (table: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]> };
  const { data, error } = await admin.from("MemberYahrzeit")
    .select("*, member:CommunityMember(id, displayName, firstName, phone)")
    .eq("communityId", context.communityId)
    .order("deceasedName");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const context = await getCommunityApiContext();
  if (!context) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Informations de Yahrzeit incomplètes." }, { status: 400 });
  const input = parsed.data;
  const admin = createAdminClient() as ReturnType<typeof createAdminClient> & { from: (table: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]> };
  const { data: member } = await admin.from("CommunityMember").select("id").eq("id", input.memberId).eq("communityId", context.communityId).maybeSingle();
  if (!member) return NextResponse.json({ error: "Membre introuvable" }, { status: 404 });

  const converted = input.deathDate ? gregorianToHebrew(input.deathDate, input.deathAfterSunset) : null;
  const hebrew = validateHebrewYahrzeit({
    hebrewDeathDay: input.hebrewDeathDay ?? converted?.day,
    hebrewDeathMonth: input.hebrewDeathMonth ?? converted?.month,
    hebrewDeathYear: input.hebrewDeathYear ?? converted?.year,
  });
  if (!hebrew) return NextResponse.json({ error: "Date de décès hébraïque invalide." }, { status: 400 });

  const { data, error } = await admin.from("MemberYahrzeit").insert({
    id: crypto.randomUUID(),
    communityId: context.communityId,
    memberId: input.memberId,
    deceasedName: input.deceasedName,
    deceasedHebrewName: input.deceasedHebrewName || null,
    relationship: input.relationship || null,
    fatherHebrewName: input.fatherHebrewName || null,
    motherHebrewName: input.motherHebrewName || null,
    deathDate: input.deathDate || null,
    deathAfterSunset: input.deathAfterSunset,
    ...hebrew,
    notes: input.notes || null,
    updatedAt: new Date().toISOString(),
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
