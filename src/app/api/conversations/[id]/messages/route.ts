import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
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

  const { data: messages } = await admin
    .from("ConversationMessage")
    .select("id, role, content, createdAt")
    .eq("conversationId", id)
    .order("createdAt", { ascending: true });

  return NextResponse.json(messages ?? []);
}
