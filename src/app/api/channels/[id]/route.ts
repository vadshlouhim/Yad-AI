import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getAuthorizedChannel(channelId: string, userId: string) {
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("communityId").eq("id", userId).single();
  if (!profile?.communityId) return null;

  const { data: channel } = await admin
    .from("Channel")
    .select("*")
    .eq("id", channelId)
    .eq("communityId", profile.communityId)
    .single();
  return channel;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const channel = await getAuthorizedChannel(id, user.id);
  if (!channel) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await request.json();
  const admin = createAdminClient();

  const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (body.isActive !== undefined) updateData.isActive = body.isActive;
  if (body.isConnected !== undefined) updateData.isConnected = body.isConnected;
  if (body.name !== undefined) updateData.name = body.name;
  if (body.handle !== undefined) updateData.handle = body.handle;
  if (body.accessToken !== undefined) updateData.accessToken = body.accessToken;
  if (body.refreshToken !== undefined) updateData.refreshToken = body.refreshToken;
  if (body.pageId !== undefined) updateData.pageId = body.pageId;
  if (body.settings !== undefined) updateData.settings = body.settings;

  const { data: updated } = await admin.from("Channel").update(updateData).eq("id", id).select().single();
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
  const channel = await getAuthorizedChannel(id, user.id);
  if (!channel) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const admin = createAdminClient();
  await admin.from("Channel").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
