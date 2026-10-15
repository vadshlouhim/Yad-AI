import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildMemberPatch } from "@/lib/contacts/member-patch";

type RouteParams = { params: Promise<{ id: string }> };

async function getCommunityId(userId: string) {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("communityId")
    .eq("id", userId)
    .single();
  return profile?.communityId ?? null;
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const communityId = await getCommunityId(user.id);
  if (!communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient() as ReturnType<typeof createAdminClient> & {
    from: (table: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]>;
  };

  const { error } = await admin
    .from("CommunityMember")
    .delete()
    .eq("id", id)
    .eq("communityId", communityId);

  if (error) return NextResponse.json({ error: "Suppression impossible." }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const communityId = await getCommunityId(user.id);
  if (!communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  const { id } = await params;
  const input = await request.json().catch(() => null);
  const admin = createAdminClient() as ReturnType<typeof createAdminClient> & {
    from: (table: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]>;
  };

  const { data: existing } = await admin
    .from("CommunityMember")
    .select("*")
    .eq("id", id)
    .eq("communityId", communityId)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Contact introuvable" }, { status: 404 });

  let update;
  try {
    update = buildMemberPatch(existing, input);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Modification invalide." }, { status: 400 });
  }

  const { data, error } = await admin
    .from("CommunityMember")
    .update(update)
    .eq("id", id)
    .eq("communityId", communityId)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
