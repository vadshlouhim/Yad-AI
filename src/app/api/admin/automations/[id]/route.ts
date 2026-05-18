import { canAccessAdmin } from "@/lib/admin-access";
import { buildAutomationActions } from "@/lib/automation/presets";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function isAuthorizedAdmin(userId: string) {
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("email, role").eq("id", userId).single();
  return canAccessAdmin(profile);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  if (!(await isAuthorizedAdmin(user.id))) return NextResponse.json({ error: "Acces reserve a l'admin global" }, { status: 403 });

  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (body.name !== undefined) updateData.name = String(body.name).trim();
  if (body.description !== undefined) updateData.description = String(body.description).trim() || null;
  if (body.trigger !== undefined) updateData.trigger = body.trigger;
  if (body.triggerConfig !== undefined) updateData.triggerConfig = body.triggerConfig;
  if (body.isActive !== undefined) {
    updateData.isActive = Boolean(body.isActive);
    updateData.status = body.isActive ? "ACTIVE" : "PAUSED";
  }
  if (body.contentType !== undefined || body.channels !== undefined) {
    updateData.actions = buildAutomationActions({
      contentType: String(body.contentType ?? "GENERAL"),
      channels: Array.isArray(body.channels) ? body.channels.map(String) : [],
      requiresValidation: true,
    });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from("Automation").update(updateData).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  if (!(await isAuthorizedAdmin(user.id))) return NextResponse.json({ error: "Acces reserve a l'admin global" }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient();
  const { error } = await admin.from("Automation").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
