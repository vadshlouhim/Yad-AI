import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getAuthorizedDraft(draftId: string, userId: string) {
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("communityId").eq("id", userId).single();
  if (!profile?.communityId) return null;

  const { data: draft } = await admin
    .from("ContentDraft")
    .select("*")
    .eq("id", draftId)
    .eq("communityId", profile.communityId)
    .single();
  return draft;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();
  const { data: draft } = await admin
    .from("ContentDraft")
    .select("*, event:Event(*), channelAdaptations:ChannelAdaptation(*), publications:Publication(*, channel:Channel(type, name))")
    .eq("id", id)
    .single();

  if (!draft) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(draft);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const draft = await getAuthorizedDraft(id, user.id);
  if (!draft) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await request.json();
  const admin = createAdminClient();

  const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (body.title !== undefined) updateData.title = body.title;
  if (body.body !== undefined) updateData.body = body.body;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.hashtags !== undefined) updateData.hashtags = body.hashtags;
  if (body.scheduledAt !== undefined) updateData.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt).toISOString() : null;

  const { data: updated } = await admin.from("ContentDraft").update(updateData).eq("id", id).select().single();
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const draft = await getAuthorizedDraft(id, user.id);
  if (!draft) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const admin = createAdminClient();
  await admin.from("ContentDraft").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
