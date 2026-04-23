import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("communityId")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.communityId)
    return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  const body = await request.json();

  const allowed = [
    "name", "description", "city", "country", "timezone",
    "phone", "email", "website", "address", "postalCode",
    "tone", "language", "signature", "hashtags", "mentions",
    "editorialRules", "communityType", "religiousStream",
    "logoUrl", "coverUrl",
  ];

  const data: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  const { data: updated, error } = await admin
    .from("Community")
    .update(data)
    .eq("id", profile.communityId)
    .select()
    .single();

  if (error || !updated) return NextResponse.json({ error: "Mise à jour échouée" }, { status: 500 });

  return NextResponse.json(updated);
}

export async function GET(_request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("communityId")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.communityId)
    return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  const { data: community, error } = await admin
    .from("Community")
    .select("*")
    .eq("id", profile.communityId)
    .single();

  if (error || !community) return NextResponse.json({ error: "Communauté introuvable" }, { status: 404 });

  return NextResponse.json(community);
}
