import { canAccessAdmin } from "@/lib/admin-access";
import {
  AUTOMATION_TRIGGERS,
  normalizeClientTypes,
  normalizeJsonArray,
  normalizeJsonObject,
} from "@/lib/automation/preset-utils";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function requireAdminGlobal() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("email, role").eq("id", user.id).single();
  if (!canAccessAdmin(profile)) return { error: NextResponse.json({ error: "Accès réservé à l'admin global" }, { status: 403 }) };

  return { admin, user };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminGlobal();
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (body.title !== undefined) {
    const title = String(body.title).trim();
    if (title.length < 2) return NextResponse.json({ error: "Titre trop court" }, { status: 400 });
    updateData.title = title;
  }
  if (body.description !== undefined) updateData.description = String(body.description).trim() || null;
  if (body.category !== undefined) updateData.category = String(body.category).trim() || "GENERAL";
  if (body.icon !== undefined) updateData.icon = String(body.icon).trim() || null;
  if (body.trigger !== undefined) {
    if (!AUTOMATION_TRIGGERS.has(body.trigger as never)) return NextResponse.json({ error: "Déclencheur invalide" }, { status: 400 });
    updateData.trigger = body.trigger;
  }
  if (body.triggerConfig !== undefined) updateData.triggerConfig = normalizeJsonObject(body.triggerConfig);
  if (body.actions !== undefined) updateData.actions = normalizeJsonArray(body.actions);
  if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);
  if (body.isGlobal !== undefined) updateData.isGlobal = Boolean(body.isGlobal);
  if (body.clientTypes !== undefined) updateData.clientTypes = normalizeClientTypes(body.clientTypes);
  if (body.sortOrder !== undefined) updateData.sortOrder = Number(body.sortOrder) || 0;

  const { data, error } = await auth.admin.from("AutomationPreset").update(updateData).eq("id", id).select().single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Modification impossible" }, { status: 400 });

  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminGlobal();
  if (auth.error) return auth.error;

  const { id } = await params;
  const { count } = await auth.admin
    .from("Automation")
    .select("id", { count: "exact", head: true })
    .eq("presetId", id);

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      {
        error: "Cette automatisation est déjà utilisée par des clients. Désactivez-la globalement plutôt que de supprimer les données clientes.",
        usageCount: count,
      },
      { status: 409 }
    );
  }

  const { error } = await auth.admin.from("AutomationPreset").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
