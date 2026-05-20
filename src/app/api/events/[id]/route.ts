import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { id } = await params;
    const admin = createAdminClient();

    const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();

    const { data: event } = await admin
      .from("Event")
      .select(`
        *,
        contentDrafts:ContentDraft(*),
        publications:Publication(*, channel:Channel(type, name)),
        mediaFiles:MediaFile(*)
      `)
      .eq("id", id)
      .eq("communityId", profile?.communityId ?? "")
      .single();

    if (!event) return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
    return NextResponse.json(event);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { id } = await params;
    const admin = createAdminClient();

    const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
    if (!profile?.communityId) return NextResponse.json({ error: "Pas de communauté" }, { status: 400 });

    const { data: existing } = await admin
      .from("Event")
      .select("*")
      .eq("id", id)
      .eq("communityId", profile.communityId)
      .single();
    if (!existing) return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });

    const body = await request.json();
    const updateData: Record<string, unknown> = { ...body, updatedAt: new Date().toISOString() };
    if (body.startDate) updateData.startDate = new Date(body.startDate).toISOString();
    if (body.endDate) updateData.endDate = new Date(body.endDate).toISOString();

    const { data: updated } = await admin.from("Event").update(updateData).eq("id", id).select().single();

    await admin.from("AuditLog").insert({
      id: crypto.randomUUID(),
      userId: user.id,
      communityId: profile.communityId,
      action: "event.updated",
      resource: "Event",
      resourceId: id,
      oldData: existing,
      newData: body,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { id } = await params;
    const admin = createAdminClient();

    const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
    if (!profile?.communityId) return NextResponse.json({ error: "Pas de communauté" }, { status: 400 });

    const { data: existing } = await admin
      .from("Event")
      .select("id")
      .eq("id", id)
      .eq("communityId", profile.communityId)
      .single();
    if (!existing) return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });

    await admin.from("Event").update({ status: "ARCHIVED", updatedAt: new Date().toISOString() }).eq("id", id);

    await admin.from("AuditLog").insert({
      id: crypto.randomUUID(),
      userId: user.id,
      communityId: profile.communityId,
      action: "event.archived",
      resource: "Event",
      resourceId: id,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
}
