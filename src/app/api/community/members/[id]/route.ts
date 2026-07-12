import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildDisplayName, normalizeAge, normalizeEmail, normalizePhone, type MemberInput } from "@/lib/contacts/normalize";

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

  await admin
    .from("CommunityMember")
    .delete()
    .eq("id", id)
    .eq("communityId", communityId);

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
  const input = await request.json() as MemberInput;
  const admin = createAdminClient() as ReturnType<typeof createAdminClient> & {
    from: (table: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]>;
  };

  const { data: existing } = await admin
    .from("CommunityMember")
    .select("id, source, tags, optInEmail, optInWhatsapp")
    .eq("id", id)
    .eq("communityId", communityId)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Contact introuvable" }, { status: 404 });

  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  const update = {
    firstName: input.firstName?.trim() || null,
    lastName: input.lastName?.trim() || null,
    displayName: buildDisplayName(input),
    email,
    phone,
    profession: input.profession?.trim() || null,
    age: normalizeAge(input.age),
    birthDate: input.birthDate || null,
    address: input.address?.trim() || null,
    city: input.city?.trim() || null,
    familyStatus: input.familyStatus?.trim() || null,
    notes: input.notes?.trim() || null,
    source: input.source?.trim() || existing.source,
    tags: input.tags ?? existing.tags,
    optInEmail: email ? existing.optInEmail : false,
    optInWhatsapp: phone ? existing.optInWhatsapp : false,
    updatedAt: new Date().toISOString(),
  };

  if (!update.displayName && !email && !phone) {
    return NextResponse.json({ error: "Ajoutez au moins un nom, un email ou un téléphone." }, { status: 400 });
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
