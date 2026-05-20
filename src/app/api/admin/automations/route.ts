import { canAccessAdmin } from "@/lib/admin-access";
import { AUTOMATION_PRESETS, buildAutomationActions } from "@/lib/automation/presets";
import { presetAppliesToCommunity, type PresetWithRhythms } from "@/lib/automation/preset-utils";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisÃ©" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("email, role").eq("id", user.id).single();
  if (!canAccessAdmin(profile)) return NextResponse.json({ error: "AccÃ¨s rÃ©servÃ© à l'admin global" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const communityId = typeof body.communityId === "string" ? body.communityId : "";
  if (!communityId) return NextResponse.json({ error: "Communauté cible manquante" }, { status: 400 });

  if (typeof body.presetId === "string" && body.presetId) {
    const [{ data: community }, { data: preset }] = await Promise.all([
      admin.from("Community").select("id, communityType, rhythmId").eq("id", communityId).single(),
      admin
        .from("AutomationPreset")
        .select("*, rhythms:AutomationPresetRhythm(id, rhythmId, rhythm:CommunityRhythm(id, name, slug, isActive))")
        .eq("id", body.presetId)
        .eq("isActive", true)
        .single(),
    ]);

    const typedPreset = preset as PresetWithRhythms | null;
    if (!community || !typedPreset || !presetAppliesToCommunity(typedPreset, community)) {
      return NextResponse.json({ error: "Scénario non disponible pour cette communauté" }, { status: 403 });
    }

    const { data, error } = await admin
      .from("Automation")
      .insert({
        id: crypto.randomUUID(),
        communityId,
        presetId: typedPreset.id,
        name: String(body.name ?? typedPreset.title),
        description: body.description === undefined ? typedPreset.description ?? null : String(body.description).trim() || null,
        trigger: typedPreset.trigger,
        triggerConfig: (body.triggerConfig ?? typedPreset.triggerConfig ?? {}) as never,
        actions: (typedPreset.actions ?? []) as never,
        isActive: body.isActive === undefined ? true : Boolean(body.isActive),
        status: body.isActive === false ? "PAUSED" : "ACTIVE",
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  }

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
      updatedAt: now,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
