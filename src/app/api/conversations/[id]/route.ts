import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const admin = createAdminClient();
  const { data: conversation } = await admin
    .from("Conversation")
    .select("*, messages:ConversationMessage(*)")
    .eq("id", id)
    .eq("userId", user.id)
    .single();

  if (!conversation) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }

  return NextResponse.json(conversation);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json();
  const { title } = body;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("Conversation")
    .update({ title, updatedAt: new Date().toISOString() })
    .eq("id", id)
    .eq("userId", user.id)
    .select();

  if (error || !data?.length) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("Conversation")
    .select("id")
    .eq("id", id)
    .eq("userId", user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }

  await admin.from("Conversation").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
