import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const admin = createAdminClient();
  const { data: conversations } = await admin
    .from("Conversation")
    .select("id, title, createdAt, updatedAt")
    .eq("userId", user.id)
    .order("updatedAt", { ascending: false });

  return NextResponse.json(conversations ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
  if (!profile?.communityId) {
    return NextResponse.json({ error: "Communauté non configurée" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));

  const { data: conversation } = await admin
    .from("Conversation")
    .insert({
      id: crypto.randomUUID(),
      userId: user.id,
      communityId: profile.communityId,
      title: body.title ?? "Nouvelle conversation",
      updatedAt: new Date().toISOString(),
    })
    .select()
    .single();

  return NextResponse.json(conversation);
}
