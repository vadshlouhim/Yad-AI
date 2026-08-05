import { canAccessAdmin } from "@/lib/admin-access";
import { AUTOMATION_PRESETS, buildAutomationActions } from "@/lib/automation/presets";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("email, role").eq("id", user.id).single();
  if (!canAccessAdmin(profile)) return NextResponse.json({ error: "Accès réservé à l'admin global" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const communityId = typeof body.communityId === "string" ? body.communityId : "";
  if (!communityId) return NextResponse.json({ error: "Communauté cible manquante" }, { status: 400 });

  const preset = typeof body.preset === "string" ? AUTOMATION_PRESETS[body.preset as keyof typeof AUTOMATION_PRESETS] : null;
  const contentType = String(body.contentType ?? preset?.contentType ?? "GENERAL");
  const channels = Array.isArray(body.channels) ? body.channels.map(String) : preset ? [...preset.channels] : [];
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("Automation")
    .insert({
      id: crypto.randomUUID(),
      communityId,
      name: String(body.name ?? preset?.name ?? "Nouvelle automatisation"),
      description: body.description === undefined ? preset?.description ?? null : String(body.description).trim() || null,
      trigger: (body.trigger ?? preset?.trigger ?? "MANUAL") as never,
      triggerConfig: (body.triggerConfig ?? preset?.triggerConfig ?? {}) as never,
      actions: buildAutomationActions({ contentType, channels, requiresValidation: true }) as never,
      isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      status: body.isActive === false ? "PAUSED" : "ACTIVE",
      nextRunAt: typeof body.nextRunAt === "string" && body.nextRunAt ? body.nextRunAt : null,
      updatedAt: now,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
