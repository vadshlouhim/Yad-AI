import { NextResponse } from "next/server";
import { canAccessAdmin } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { normalizeTemplateZones, validateTemplateZoneGeometry } from "@/lib/templates/zones";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé", code: "UNAUTHORIZED" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("email, role").eq("id", user.id).single();
  if (!canAccessAdmin(profile)) {
    return NextResponse.json({ error: "Accès réservé à l’admin global", code: "FORBIDDEN" }, { status: 403 });
  }

  const body = await request.json() as { design?: unknown };
  const zones = normalizeTemplateZones(body.design);
  const geometryIssues = validateTemplateZoneGeometry(zones);
  if (zones.length === 0 || geometryIssues.length > 0) {
    return NextResponse.json({
      error: geometryIssues[0] ?? "Ajoutez au moins une zone de texte avant de valider.",
      code: "INVALID_LAYOUT",
    }, { status: 400 });
  }

  const { id } = await params;
  const now = new Date().toISOString();
  const { data: updated, error } = await admin.from("Template").update({
    design: zones,
    layoutStatus: "READY",
    layoutAnalyzedAt: now,
    updatedAt: now,
  }).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message, code: "LAYOUT_SAVE_FAILED" }, { status: 500 });
  return NextResponse.json(updated);
}
