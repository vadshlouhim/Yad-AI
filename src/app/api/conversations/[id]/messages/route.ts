import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const admin = createAdminClient();
  const { data: conversation } = await admin
    .from("Conversation")
    .select("id")
    .eq("id", id)
    .eq("userId", user.id)
    .single();

  if (!conversation) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }

  const body = await request.json();
  const { role, content } = body;

  if (!role || !content) {
    return NextResponse.json({ error: "role et content requis" }, { status: 400 });
  }

  const { data: message } = await admin
    .from("ConversationMessage")
    .insert({
      id: crypto.randomUUID(),
      conversationId: id,
      role,
      content,
    })
    .select()
    .single();

  await admin
    .from("Conversation")
    .update({ updatedAt: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json(message);
}
