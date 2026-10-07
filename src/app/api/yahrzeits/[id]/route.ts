import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCommunityApiContext } from "@/lib/auth/community-api";
import { gregorianToHebrew, validateHebrewYahrzeit } from "@/lib/contacts/hebrew-birthday";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: RouteParams) {
  const context = await getCommunityApiContext();
  if (!context) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const admin = createAdminClient() as ReturnType<typeof createAdminClient> & { from: (table: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]> };
  const { error } = await admin.from("MemberYahrzeit").delete().eq("id", id).eq("communityId", context.communityId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const context = await getCommunityApiContext();
  if (!context) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const admin = createAdminClient() as ReturnType<typeof createAdminClient> & { from: (table: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]> };
  const { data: existing } = await admin.from("MemberYahrzeit").select("*").eq("id", id).eq("communityId", context.communityId).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Yahrzeit introuvable" }, { status: 404 });
  const deathDate = typeof input.deathDate === "string" ? input.deathDate : existing.deathDate;
  const afterSunset = typeof input.deathAfterSunset === "boolean" ? input.deathAfterSunset : existing.deathAfterSunset;
  const converted = deathDate ? gregorianToHebrew(deathDate, afterSunset) : null;
  const hebrew = validateHebrewYahrzeit({
    hebrewDeathDay: Number(input.hebrewDeathDay ?? converted?.day ?? existing.hebrewDeathDay),
    hebrewDeathMonth: Number(input.hebrewDeathMonth ?? converted?.month ?? existing.hebrewDeathMonth),
    hebrewDeathYear: Number(input.hebrewDeathYear ?? converted?.year ?? existing.hebrewDeathYear),
  });
  if (!hebrew) return NextResponse.json({ error: "Date de décès hébraïque invalide." }, { status: 400 });
  const update = {
    deceasedName: typeof input.deceasedName === "string" ? input.deceasedName.trim() : existing.deceasedName,
    deceasedHebrewName: typeof input.deceasedHebrewName === "string" ? input.deceasedHebrewName.trim() || null : existing.deceasedHebrewName,
    relationship: typeof input.relationship === "string" ? input.relationship.trim() || null : existing.relationship,
    fatherHebrewName: typeof input.fatherHebrewName === "string" ? input.fatherHebrewName.trim() || null : existing.fatherHebrewName,
    motherHebrewName: typeof input.motherHebrewName === "string" ? input.motherHebrewName.trim() || null : existing.motherHebrewName,
    deathDate: deathDate || null,
    deathAfterSunset: afterSunset,
    ...hebrew,
    notes: typeof input.notes === "string" ? input.notes.trim() || null : existing.notes,
    isActive: typeof input.isActive === "boolean" ? input.isActive : existing.isActive,
    updatedAt: new Date().toISOString(),
  };
  if (!update.deceasedName) return NextResponse.json({ error: "Nom du proche manquant" }, { status: 400 });
  const { data, error } = await admin.from("MemberYahrzeit").update(update).eq("id", id).eq("communityId", context.communityId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
