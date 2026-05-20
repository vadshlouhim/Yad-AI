import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
  if (!profile?.communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  const body = await request.json();
  const { title, body: content, contentType, eventId, hashtags, status } = body;

  if (!content?.trim()) {
    return NextResponse.json({ error: "Le contenu est requis" }, { status: 400 });
  }

  const { data: draft } = await admin
    .from("ContentDraft")
    .insert({
      id: crypto.randomUUID(),
      communityId: profile.communityId,
      title: title ?? null,
      body: content,
      contentType: contentType ?? "GENERAL",
      eventId: eventId ?? null,
      hashtags: hashtags ?? [],
      status: status ?? "DRAFT",
      aiGenerated: false,
      updatedAt: new Date().toISOString(),
    })
    .select()
    .single();

  return NextResponse.json(draft, { status: 201 });
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
  if (!profile?.communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") ?? "20");

  let query = admin
    .from("ContentDraft")
    .select("*, event:Event(title, category)")
    .eq("communityId", profile.communityId)
    .order("updatedAt", { ascending: false })
    .limit(limit);

  if (status) query = query.eq("status", status);

  const { data: drafts } = await query;
  return NextResponse.json(drafts ?? []);
}
