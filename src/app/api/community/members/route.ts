import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type MemberInput = {
  displayName?: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  profession?: string | null;
  age?: number | string | null;
  birthDate?: string | null;
  address?: string | null;
  city?: string | null;
  familyStatus?: string | null;
  notes?: string | null;
  source?: string;
  tags?: string[];
};

async function getCommunityId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("communityId")
    .eq("id", user.id)
    .single();

  return profile?.communityId ?? null;
}

function normalizePhone(value: string | null | undefined) {
  return value?.replace(/[^\d+]/g, "").trim() || null;
}

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() || null;
}

function buildDisplayName(member: MemberInput) {
  const fullName = [member.firstName, member.lastName].filter(Boolean).join(" ").trim();
  return member.displayName?.trim() || fullName || member.email || member.phone || "Membre";
}

function normalizeAge(value: MemberInput["age"]) {
  if (value === null || value === undefined || value === "") return null;
  const age = Number(value);
  return Number.isFinite(age) && age >= 0 ? Math.round(age) : null;
}

export async function GET() {
  const communityId = await getCommunityId();
  if (!communityId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient() as ReturnType<typeof createAdminClient> & {
    from: (table: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]>;
  };

  const { data, error } = await admin
    .from("CommunityMember")
    .select("*")
    .eq("communityId", communityId)
    .order("displayName", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const communityId = await getCommunityId();
  if (!communityId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await request.json();
  const members: MemberInput[] = Array.isArray(body.members) ? body.members : [body];
  const rows = members
    .map((member) => ({
      id: crypto.randomUUID(),
      communityId,
      firstName: member.firstName?.trim() || null,
      lastName: member.lastName?.trim() || null,
      displayName: buildDisplayName(member),
      email: normalizeEmail(member.email),
      phone: normalizePhone(member.phone),
      profession: member.profession?.trim() || null,
      age: normalizeAge(member.age),
      birthDate: member.birthDate || null,
      address: member.address?.trim() || null,
      city: member.city?.trim() || null,
      familyStatus: member.familyStatus?.trim() || null,
      notes: member.notes?.trim() || null,
      source: member.source ?? "manual",
      tags: member.tags ?? [],
      optInEmail: Boolean(normalizeEmail(member.email)),
      optInWhatsapp: Boolean(normalizePhone(member.phone)),
      updatedAt: new Date().toISOString(),
    }))
    .filter((member) => member.email || member.phone || member.displayName !== "Membre");

  if (rows.length === 0) {
    return NextResponse.json({ error: "Aucun contact exploitable" }, { status: 400 });
  }

  const admin = createAdminClient() as ReturnType<typeof createAdminClient> & {
    from: (table: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]>;
  };

  const { data, error } = await admin
    .from("CommunityMember")
    .insert(rows)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? [], { status: 201 });
}
