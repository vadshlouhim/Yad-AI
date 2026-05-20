import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
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

  const { data: channel, error } = await admin
    .from("Channel")
    .upsert(
      {
        id: crypto.randomUUID(),
        communityId: profile.communityId,
        type: body.type,
        name: body.name ?? body.type,
        accessToken: body.accessToken ?? null,
        pageId: body.pageId ?? null,
        isConnected: body.isConnected ?? false,
        isActive: body.isActive ?? true,
        updatedAt: new Date().toISOString(),
      },
      { onConflict: "communityId,type" }
    )
    .select()
    .single();

  if (error || !channel) return NextResponse.json({ error: "Création échouée" }, { status: 500 });

  return NextResponse.json(channel, { status: 201 });
}
