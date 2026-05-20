import { canAccessAdmin } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  AUTOMATION_TRIGGERS,
  normalizeClientTypes,
  normalizeJsonArray,
  normalizeJsonObject,
} from "@/lib/automation/preset-utils";
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

export async function GET() {
  const auth = await requireAdminGlobal();
  if (auth.error) return auth.error;

  const { data, error } = await auth.admin
    .from("AutomationPreset")
    .select("*, rhythms:AutomationPresetRhythm(id, rhythmId, rhythm:CommunityRhythm(id, name, slug, isActive))")
    .order("sortOrder", { ascending: true })
    .order("title", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const auth = await requireAdminGlobal();
  if (auth.error) return auth.error;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  if (title.length < 2) return NextResponse.json({ error: "Titre trop court" }, { status: 400 });

  const trigger = AUTOMATION_TRIGGERS.has(body.trigger as never) ? body.trigger : "MANUAL";
  const rhythmIds = Array.isArray(body.rhythmIds) ? body.rhythmIds.map(String).filter(Boolean) : [];
  const now = new Date().toISOString();

  const { data, error } = await auth.admin
    .from("AutomationPreset")
    .insert({
      id: `preset_${crypto.randomUUID()}`,
      title,
      description: body.description ? String(body.description).trim() : null,
      category: String(body.category ?? "GENERAL").trim() || "GENERAL",
      icon: body.icon ? String(body.icon).trim() : null,
      trigger: trigger as never,
      triggerConfig: normalizeJsonObject(body.triggerConfig),
      actions: normalizeJsonArray(body.actions),
      isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      isGlobal: body.isGlobal === undefined ? rhythmIds.length === 0 : Boolean(body.isGlobal),
      clientTypes: normalizeClientTypes(body.clientTypes),
      sortOrder: Number(body.sortOrder ?? 100),
      updatedAt: now,
    })
    .select()
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Création impossible" }, { status: 400 });

  if (rhythmIds.length > 0) {
    await auth.admin.from("AutomationPresetRhythm").insert(
      rhythmIds.map((rhythmId) => ({
        id: `preset_rhythm_${crypto.randomUUID()}`,
        presetId: data.id,
        rhythmId,
      }))
    );
  }

  return NextResponse.json(data, { status: 201 });
}
