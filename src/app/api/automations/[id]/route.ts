import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getAuthorizedAutomation(automationId: string, userId: string) {
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("communityId").eq("id", userId).single();
  if (!profile?.communityId) return null;

  const { data: automation } = await admin
    .from("Automation")
    .select("*")
    .eq("id", automationId)
    .eq("communityId", profile.communityId)
    .single();
  return automation;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const automation = await getAuthorizedAutomation(id, user.id);
  if (!automation) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await request.json();
  const admin = createAdminClient();

  const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (body.isActive !== undefined) updateData.isActive = body.isActive;
  if (body.name !== undefined) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.triggerConfig !== undefined) updateData.triggerConfig = body.triggerConfig;
  if (body.actions !== undefined) updateData.actions = body.actions;
  if (body.isActive === false) updateData.status = "PAUSED";
  else if (body.isActive === true) updateData.status = "ACTIVE";

  const { data: updated } = await admin.from("Automation").update(updateData).eq("id", id).select().single();
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
  const automation = await getAuthorizedAutomation(id, user.id);
  if (!automation) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const admin = createAdminClient();
  await admin.from("Automation").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
