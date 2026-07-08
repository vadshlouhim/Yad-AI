import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildMemberRow, type MemberInput } from "@/lib/contacts/normalize";

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
    .map((member) => buildMemberRow(communityId, member))
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
